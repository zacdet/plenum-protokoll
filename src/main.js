import { getRoomId, setRoomId, generateShareLink } from './room.js'
import { requireIdentity } from './identity.js'
import { initCollaboration } from './collaboration.js'
import { createEditor, getContent } from './editor.js'
import { renderUserBadges } from './awareness.js'
import { initPresence, watchPresence, removePresence } from './presence.js'
import { initToolbar } from './toolbar.js'
import { downloadWiki } from './export.js'
import { initProtocolSelector } from './protocolSelector.js'
import { loadProtocolList, createProtocol } from './protocols.js'
import { renderMediaWiki } from './preview.js'

let active    = null
let switching = false
let selectorSetCurrentId = null

async function main() {
  initTheme()

  const identity = await requireIdentity()

  let roomId = getRoomId()
  if (!roomId) {
    roomId = await resolveInitialProtocol()
    setRoomId(roomId)
  }

  selectorSetCurrentId = initProtocolSelector(
    document.getElementById('protocol-selector-container'),
    roomId,
    switchProtocol
  )

  await mountEditor(roomId, identity)

  // Header-Buttons
  document.getElementById('btn-export-download').addEventListener('click', () => {
    if (active?.editorView) downloadWiki(getContent(active.editorView), getRoomId())
  })
  document.getElementById('btn-identity').addEventListener('click', () => {
    localStorage.removeItem('plenum-protokoll-identity')
    location.reload()
  })

  // Vorschau-Panel (gerendertes HTML)
  const previewBtn  = document.getElementById('btn-preview')
  const workspace   = document.getElementById('workspace')
  let previewOpen = false

  previewBtn.addEventListener('click', () => {
    previewOpen = !previewOpen
    workspace.classList.toggle('with-preview', previewOpen)
    previewBtn.classList.toggle('active', previewOpen)
    if (previewOpen) updatePreview()
  })

  document.addEventListener('editor-changed', () => {
    if (previewOpen) updatePreview()
  })
}

function updatePreview() {
  if (!active?.editorView) return
  const el = document.getElementById('rendered-content')
  if (!el) return
  const html = renderMediaWiki(getContent(active.editorView))
  el.innerHTML = html || '<p class="rendered-placeholder">Dokument ist leer.</p>'
}

// ─── Theme ────────────────────────────────────────────────────────────────────

function initTheme() {
  const btn = document.getElementById('btn-theme')
  const apply = (light) => {
    document.documentElement.classList.toggle('light', light)
    btn.textContent = light ? '☀️' : '🌙'
    btn.title = light ? 'Dunkelmodus' : 'Hellmodus'
  }
  let light = localStorage.getItem('plenum-theme') === 'light'
  apply(light)
  btn.addEventListener('click', () => {
    light = !light
    localStorage.setItem('plenum-theme', light ? 'light' : 'dark')
    apply(light)
  })
}

// ─── Protocol helpers ─────────────────────────────────────────────────────────

async function resolveInitialProtocol() {
  const list = await loadProtocolList()
  if (list.length > 0) return list[0].id
  return createProtocol('Plenum ' + new Date().toLocaleDateString('de-DE'))
}

async function switchProtocol(newId) {
  if (newId === getRoomId() || switching) return
  switching = true
  try {
    teardown()
    setRoomId(newId)
    selectorSetCurrentId?.(newId)
    const identity = JSON.parse(localStorage.getItem('plenum-protokoll-identity'))
    await mountEditor(newId, identity)
  } finally {
    switching = false
  }
}

function teardown() {
  if (!active) return
  active.provider.destroy()
  active.presenceUnsub?.()
  removePresence()
  active = null
}

// ─── Editor mounten ───────────────────────────────────────────────────────────

async function mountEditor(roomId, identity) {
  const editorEl = document.getElementById('editor')
  editorEl.innerHTML = '<div class="editor-loading">Lade Dokument…</div>'
  document.getElementById('connection-status').textContent = 'Verbinde…'
  document.getElementById('connection-status').className = 'status-connecting'

  const { ydoc, provider, ytext, awareness } = initCollaboration(roomId, identity)

  initPresence(roomId, identity)
  const presenceUnsub = watchPresence(roomId, users =>
    renderUserBadges(document.getElementById('user-badges'), users)
  )

  await provider.whenSynced

  editorEl.innerHTML = ''
  const editorView = createEditor(editorEl, ytext, awareness)
  active = { provider, presenceUnsub, editorView, ydoc }

  initToolbar(document.getElementById('toolbar'), editorView)

  document.getElementById('connection-status').textContent = 'Verbunden'
  document.getElementById('connection-status').className = 'status-connected'

  const saveEl = document.getElementById('save-status')
  ydoc.on('update', (_, origin) => {
    document.dispatchEvent(new Event('editor-changed'))
    if (origin === provider) return
    saveEl.textContent = 'Gespeichert ' + new Date().toLocaleTimeString('de-DE', {
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    })
    saveEl.className = 'save-status saved'
  })
}

main()

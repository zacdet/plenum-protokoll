import { getRoomId, setRoomId } from './room.js'
import { requireIdentity } from './identity.js'
import { initCollaboration } from './collaboration.js'
import { createRichEditor, getEditorWikiContent } from './richEditor.js'
import { renderUserBadges } from './awareness.js'
import { initPresence, watchPresence, removePresence } from './presence.js'
import { initToolbar } from './toolbar.js'
import { downloadWiki, showToast } from './export.js'
import { initProtocolSelector } from './protocolSelector.js'
import { loadProtocolList, createProtocol, createBackup } from './protocols.js'

let active    = null   // { provider, presenceUnsub, editor, ydoc }
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
    if (active?.editor) downloadWiki(getEditorWikiContent(active.editor), getRoomId())
  })

  document.getElementById('btn-backup').addEventListener('click', async () => {
    if (!active?.editor) return
    const wikiContent = getEditorWikiContent(active.editor)
    const currentTitle = document.getElementById('protocol-title-label')?.textContent || 'Protokoll'
    const date = new Date().toLocaleDateString('de-DE')
    const title = `Backup: ${currentTitle} (${date})`
    await createBackup(title, wikiContent)
    showToast(`Backup "${title}" gespeichert`)
  })
  document.getElementById('btn-identity').addEventListener('click', () => {
    localStorage.removeItem('plenum-protokoll-identity')
    location.reload()
  })

  // Quelltext-Panel (Wiki-Syntax-Vorschau)
  const quelltextBtn = document.getElementById('btn-quelltext')
  const workspace    = document.getElementById('workspace')
  let quelltextOpen  = false

  quelltextBtn.addEventListener('click', () => {
    quelltextOpen = !quelltextOpen
    workspace.classList.toggle('with-quelltext', quelltextOpen)
    quelltextBtn.classList.toggle('active', quelltextOpen)
    if (quelltextOpen) updateQuelltext()
  })

  document.addEventListener('editor-changed', () => {
    if (quelltextOpen) updateQuelltext()
  })
}

function updateQuelltext() {
  if (!active?.editor) return
  const el = document.getElementById('quelltext-content')
  if (!el) return
  el.textContent = getEditorWikiContent(active.editor)
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
  active.editor.destroy()
  active = null
}

// ─── Editor mounten ───────────────────────────────────────────────────────────

async function mountEditor(roomId, identity) {
  const editorEl = document.getElementById('editor')
  editorEl.innerHTML = '<div class="editor-loading">Lade Dokument…</div>'
  document.getElementById('connection-status').textContent = 'Verbinde…'
  document.getElementById('connection-status').className = 'status-connecting'

  const { ydoc, provider, yXmlFragment, awareness } = initCollaboration(roomId, identity)

  initPresence(roomId, identity)
  const presenceUnsub = watchPresence(roomId, users =>
    renderUserBadges(document.getElementById('user-badges'), users)
  )

  await provider.whenSynced

  editorEl.innerHTML = ''
  const editor = createRichEditor(editorEl, yXmlFragment, awareness, identity)
  active = { provider, presenceUnsub, editor, ydoc }

  initToolbar(document.getElementById('toolbar'), editor)

  const statusEl = document.getElementById('connection-status')
  if (provider.connected) {
    statusEl.textContent = 'Verbunden'
    statusEl.className = 'status-connected'
  } else {
    statusEl.textContent = 'Offline'
    statusEl.className = 'status-connecting'
  }

  const saveEl = document.getElementById('save-status')
  editor.on('update', ({ transaction }) => {
    document.dispatchEvent(new Event('editor-changed'))
    if (!transaction.docChanged) return
    saveEl.textContent = 'Gespeichert ' + new Date().toLocaleTimeString('de-DE', {
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    })
    saveEl.className = 'save-status saved'
  })
}

main()

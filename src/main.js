import { getRoomId, setRoomId, generateShareLink } from './room.js'
import { requireIdentity } from './identity.js'
import { initCollaboration } from './collaboration.js'
import { createEditor, getContent } from './editor.js'
import { renderUserBadges } from './awareness.js'
import { initPresence, watchPresence } from './presence.js'
import { initToolbar } from './toolbar.js'
import { copyToClipboard, downloadWiki, showToast } from './export.js'
import { initProtocolSelector } from './protocolSelector.js'
import { loadProtocolList, createProtocol } from './protocols.js'
import { renderMediaWiki } from './preview.js'

let active = null  // { provider, presenceUnsub, editorView, ydoc }

async function main() {
  const identity = await requireIdentity()

  let roomId = getRoomId()
  if (!roomId) {
    roomId = await resolveInitialProtocol()
    setRoomId(roomId)
  }

  initProtocolSelector(
    document.getElementById('protocol-selector-container'),
    roomId,
    switchProtocol
  )

  await mountEditor(roomId, identity)

  // Buttons
  document.getElementById('btn-share').addEventListener('click', async () => {
    await copyToClipboard(generateShareLink())
    showToast('Link kopiert!')
  })
  document.getElementById('btn-export-clipboard').addEventListener('click', () => {
    if (active?.editorView) copyToClipboard(getContent(active.editorView))
  })
  document.getElementById('btn-export-download').addEventListener('click', () => {
    if (active?.editorView) downloadWiki(getContent(active.editorView), getRoomId())
  })
  document.getElementById('btn-identity').addEventListener('click', () => {
    localStorage.removeItem('plenum-protokoll-identity')
    location.reload()
  })

  // Vorschau-Panel
  const previewBtn     = document.getElementById('btn-preview')
  const workspace      = document.getElementById('workspace')
  const previewContent = document.getElementById('preview-content')

  let previewOpen = false
  previewBtn.addEventListener('click', () => {
    previewOpen = !previewOpen
    workspace.classList.toggle('with-preview', previewOpen)
    previewBtn.classList.toggle('active', previewOpen)
    if (previewOpen) updatePreview()
  })

  function updatePreview() {
    if (!previewOpen || !active?.editorView) return
    previewContent.innerHTML = renderMediaWiki(getContent(active.editorView))
  }

  // Vorschau bei jeder Änderung aktualisieren
  document.addEventListener('yjs-update', updatePreview)
}

async function resolveInitialProtocol() {
  const list = await loadProtocolList()
  if (list.length > 0) return list[0].id
  const title = 'Plenum ' + new Date().toLocaleDateString('de-DE')
  return createProtocol(title)
}

async function switchProtocol(newId) {
  if (newId === getRoomId()) return
  teardown()
  setRoomId(newId)
  const identity = JSON.parse(localStorage.getItem('plenum-protokoll-identity'))
  await mountEditor(newId, identity)
}

function teardown() {
  if (!active) return
  active.provider.destroy()
  active.presenceUnsub?.()
  active = null
}

async function mountEditor(roomId, identity) {
  const editorContainer = document.getElementById('editor')
  editorContainer.innerHTML = '<div class="editor-loading">Lade Dokument…</div>'

  document.getElementById('connection-status').textContent = 'Verbinde…'
  document.getElementById('connection-status').className = 'status-connecting'

  const { ydoc, provider, ytext, awareness } = initCollaboration(roomId)

  // Präsenz
  const badgesEl = document.getElementById('user-badges')
  const clientId = initPresence(roomId, identity)
  const presenceUnsub = watchPresence(roomId, clientId, users => renderUserBadges(badgesEl, users))

  // Warten auf Firebase-Sync
  await provider.whenSynced

  editorContainer.innerHTML = ''
  const editorView = createEditor(editorContainer, ytext, awareness)

  active = { provider, presenceUnsub, editorView, ydoc }

  initToolbar(document.getElementById('toolbar'), editorView)

  document.getElementById('connection-status').textContent = 'Verbunden'
  document.getElementById('connection-status').className = 'status-connected'

  // Auto-Save-Anzeige + Vorschau-Update
  const saveEl = document.getElementById('save-status')
  ydoc.on('update', (_, origin) => {
    if (origin === 'firebase') return
    saveEl.textContent = 'Gespeichert ' + new Date().toLocaleTimeString('de-DE', {
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    })
    saveEl.className = 'save-status saved'
    document.dispatchEvent(new Event('yjs-update'))
  })
  // Auch bei Empfang fremder Änderungen Vorschau aktualisieren
  ydoc.on('update', (_, origin) => {
    if (origin !== 'firebase') return
    document.dispatchEvent(new Event('yjs-update'))
  })
}

main()

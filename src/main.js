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

// Aktive Collaboration-Instanz (wird bei Protokollwechsel ersetzt)
let activeProvider = null
let activeEditorView = null
let activePresenceUnsubscribe = null

async function main() {
  const identity = await requireIdentity()

  // Protokoll-ID aus URL oder erstes/neues Protokoll laden
  let roomId = getRoomId()
  if (!roomId) {
    roomId = await resolveInitialProtocol()
    setRoomId(roomId)
  }

  // Protokoll-Selektor im Header
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
    if (activeEditorView) copyToClipboard(getContent(activeEditorView))
  })

  document.getElementById('btn-export-download').addEventListener('click', () => {
    if (activeEditorView) downloadWiki(getContent(activeEditorView), getRoomId())
  })

  document.getElementById('btn-identity').addEventListener('click', () => {
    localStorage.removeItem('plenum-protokoll-identity')
    location.reload()
  })
}

async function resolveInitialProtocol() {
  const list = await loadProtocolList()
  if (list.length > 0) return list[0].id  // neuestes öffnen

  // Noch kein Protokoll → erstes anlegen
  const title = 'Plenum ' + new Date().toLocaleDateString('de-DE')
  return createProtocol(title)
}

async function switchProtocol(newId) {
  if (newId === getRoomId()) return

  // Alte Instanz aufräumen
  if (activeProvider) activeProvider.destroy()
  if (activePresenceUnsubscribe) activePresenceUnsubscribe()

  setRoomId(newId)

  const identity = JSON.parse(localStorage.getItem('plenum-protokoll-identity'))
  await mountEditor(newId, identity)
}

async function mountEditor(roomId, identity) {
  const editorContainer = document.getElementById('editor')
  editorContainer.innerHTML = '<div class="editor-loading">Lade Dokument…</div>'

  const { ydoc, provider, ytext, awareness } = initCollaboration(roomId)
  activeProvider = provider

  // Präsenz
  const badgesEl = document.getElementById('user-badges')
  initPresence(roomId, identity)
  watchPresence(roomId, null, users => renderUserBadges(badgesEl, users))

  // Warten bis Firebase-Sync fertig
  await provider.whenSynced

  editorContainer.innerHTML = ''
  const editorView = createEditor(editorContainer, ytext, awareness)
  activeEditorView = editorView

  initToolbar(document.getElementById('toolbar'), editorView)

  // Verbindungsstatus
  const statusEl = document.getElementById('connection-status')
  statusEl.textContent = 'Verbunden'
  statusEl.className = 'status-connected'

  // Auto-Save
  const saveEl = document.getElementById('save-status')
  ydoc.on('update', (_, origin) => {
    if (origin === 'firebase') return
    saveEl.textContent = 'Gespeichert ' + new Date().toLocaleTimeString('de-DE', {
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    })
    saveEl.className = 'save-status saved'
  })
}

main()

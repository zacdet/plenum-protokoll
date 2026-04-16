import { getRoomId, generateShareLink } from './room.js'
import { requireIdentity } from './identity.js'
import { initCollaboration } from './collaboration.js'
import { createEditor, getContent } from './editor.js'
import { renderUserBadges } from './awareness.js'
import { initPresence, watchPresence } from './presence.js'
import { initToolbar } from './toolbar.js'
import { copyToClipboard, downloadWiki, showToast } from './export.js'

async function main() {
  const identity = await requireIdentity()
  const roomId   = getRoomId()

  document.getElementById('room-label').textContent = roomId

  // Yjs + Firebase + lokaler Cache
  const { ydoc, provider, localCache, ytext, awareness } = initCollaboration(roomId)

  // Online-Präsenz registrieren
  const clientId = initPresence(roomId, identity)
  const badgesEl = document.getElementById('user-badges')
  watchPresence(roomId, clientId, users => renderUserBadges(badgesEl, users))

  // Editor erst rendern wenn Firebase-Sync abgeschlossen
  const editorContainer = document.getElementById('editor')
  editorContainer.innerHTML = '<div class="editor-loading">Lade Dokument…</div>'

  await provider.whenSynced

  editorContainer.innerHTML = ''
  const editorView = createEditor(editorContainer, ytext, awareness)

  initToolbar(document.getElementById('toolbar'), editorView)

  // Verbindungsstatus (Firebase ist immer verbunden sobald synced)
  const statusEl = document.getElementById('connection-status')
  statusEl.textContent = 'Verbunden'
  statusEl.className = 'status-connected'

  // Auto-Save-Anzeige
  const saveEl = document.getElementById('save-status')
  ydoc.on('update', (_, origin) => {
    if (origin === 'firebase') return  // fremde Updates nicht als "gespeichert" zeigen
    saveEl.textContent = 'Gespeichert ' + new Date().toLocaleTimeString('de-DE', {
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    })
    saveEl.className = 'save-status saved'
  })

  document.getElementById('btn-share').addEventListener('click', async () => {
    await copyToClipboard(generateShareLink())
    showToast('Link kopiert!')
  })

  document.getElementById('btn-export-clipboard').addEventListener('click', () => {
    copyToClipboard(getContent(editorView))
  })

  document.getElementById('btn-export-download').addEventListener('click', () => {
    downloadWiki(getContent(editorView), roomId)
  })

  document.getElementById('btn-identity').addEventListener('click', () => {
    localStorage.removeItem('plenum-protokoll-identity')
    location.reload()
  })
}

main()

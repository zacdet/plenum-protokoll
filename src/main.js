/**
 * Entry Point
 */
import { getRoomId, generateShareLink } from './room.js'
import { requireIdentity } from './identity.js'
import { initCollaboration } from './collaboration.js'
import { createEditor, getContent } from './editor.js'
import { initAwareness, renderUserBadges } from './awareness.js'
import { initToolbar } from './toolbar.js'
import { copyToClipboard, downloadWiki, showToast } from './export.js'

async function main() {
  // 1. Identität sicherstellen (Modal falls neu)
  const identity = await requireIdentity()

  // 2. Room
  const roomId = getRoomId()
  document.getElementById('room-label').textContent = roomId

  // 3. Yjs + WebRTC + IndexedDB
  const { ydoc, provider, persistence, ytext, awareness } = initCollaboration(roomId)

  // 4. Awareness mit Identität
  initAwareness(awareness, identity)
  renderUserBadges(document.getElementById('user-badges'), awareness)

  // 5. Editor (erst nach IndexedDB-Sync mounten → vorhandener Inhalt direkt sichtbar)
  const editorContainer = document.getElementById('editor')
  editorContainer.innerHTML = '<div class="editor-loading">Lade gespeicherten Inhalt…</div>'

  await new Promise(resolve => persistence.once('synced', resolve))

  editorContainer.innerHTML = ''
  const editorView = createEditor(editorContainer, ytext, awareness)

  // 6. Toolbar
  initToolbar(document.getElementById('toolbar'), editorView)

  // 7. Verbindungsstatus + Peer-Anzahl
  const statusEl = document.getElementById('connection-status')

  function updateStatus() {
    const peers = provider.awareness.getStates().size - 1  // eigene State nicht mitzählen
    if (peers > 0) {
      statusEl.textContent = peers === 1 ? '1 weiterer online' : `${peers} weitere online`
      statusEl.className = 'status-connected'
    } else {
      statusEl.textContent = provider.connected ? 'Alleine online' : 'Verbinde…'
      statusEl.className = provider.connected ? 'status-connected' : 'status-connecting'
    }
  }

  provider.on('status', updateStatus)
  awareness.on('change', updateStatus)
  updateStatus()

  // 8. Auto-Save-Anzeige (IndexedDB speichert automatisch jeden Keystroke)
  const saveEl = document.getElementById('save-status')
  ydoc.on('update', () => {
    saveEl.textContent = 'Gespeichert ' + new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    saveEl.className = 'save-status saved'
  })

  // 9. Header-Buttons
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

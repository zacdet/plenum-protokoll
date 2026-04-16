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

  // 3. Yjs + WebRTC
  const { provider, ytext, awareness } = initCollaboration(roomId)

  // 4. Awareness mit Identität
  initAwareness(awareness, identity)
  renderUserBadges(document.getElementById('user-badges'), awareness)

  // 5. Editor
  const editorView = createEditor(document.getElementById('editor'), ytext, awareness)

  // 6. Toolbar
  initToolbar(document.getElementById('toolbar'), editorView)

  // 7. Verbindungsstatus
  const statusEl = document.getElementById('connection-status')
  function updateStatus() {
    const connected = provider.connected
    statusEl.textContent = connected ? 'Verbunden' : 'Verbinde…'
    statusEl.className = connected ? 'status-connected' : 'status-connecting'
  }
  provider.on('status', updateStatus)
  provider.on('peers', updateStatus)
  updateStatus()

  // 8. Header-Buttons
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

  // 9. Identität ändern
  document.getElementById('btn-identity').addEventListener('click', () => {
    localStorage.removeItem('plenum-protokoll-identity')
    location.reload()
  })
}

main()

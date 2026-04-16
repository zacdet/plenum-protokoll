/**
 * Yjs-Kern: WebRTC-Provider + IndexedDB-Persistenz
 */
import * as Y from 'yjs'
import { WebrtcProvider } from 'y-webrtc'
import { IndexeddbPersistence } from 'y-indexeddb'

const SIGNALING_SERVERS = [
  'wss://signaling.yjs.dev',
  'wss://y-webrtc-signaling-eu.fly.dev',
]

export function initCollaboration(roomId) {
  const ydoc = new Y.Doc()
  const ytext = ydoc.getText('protokoll')

  // Lokale Persistenz (Offline-Fallback)
  const persistence = new IndexeddbPersistence(roomId, ydoc)

  // WebRTC P2P Sync
  const provider = new WebrtcProvider(roomId, ydoc, {
    signaling: SIGNALING_SERVERS,
  })

  const awareness = provider.awareness

  return { ydoc, provider, persistence, ytext, awareness }
}

export function getConnectionStatus(provider) {
  if (provider.connected) return 'connected'
  return 'connecting'
}

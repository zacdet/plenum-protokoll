/**
 * Yjs-Kern: WebRTC-Provider + IndexedDB-Persistenz
 */
import * as Y from 'yjs'
import { WebrtcProvider } from 'y-webrtc'
import { IndexeddbPersistence } from 'y-indexeddb'

const SIGNALING_SERVERS = [
  'wss://signaling.yjs.dev',
  'wss://y-webrtc-signaling-eu.fly.dev',
  'wss://y-webrtc-signaling-us.fly.dev',
]

export function initCollaboration(roomId) {
  const ydoc = new Y.Doc()
  const ytext = ydoc.getText('protokoll')

  // Lokale Persistenz – speichert automatisch jeden Keystroke in IndexedDB
  const persistence = new IndexeddbPersistence(roomId, ydoc)

  // WebRTC P2P Sync (nutzt BroadcastChannel für gleichen Browser automatisch)
  const provider = new WebrtcProvider(roomId, ydoc, {
    signaling: SIGNALING_SERVERS,
    maxConns: 4,
  })

  const awareness = provider.awareness

  return { ydoc, provider, persistence, ytext, awareness }
}

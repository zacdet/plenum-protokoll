import * as Y from 'yjs'
import { Awareness } from 'y-protocols/awareness'
import { IndexeddbPersistence } from 'y-indexeddb'
import { FirebaseProvider } from './firebaseProvider.js'
import { db } from './firebase.js'

export function initCollaboration(roomId) {
  const ydoc = new Y.Doc()
  const ytext = ydoc.getText('protokoll')

  // Lokaler Cache (schnelleres erstes Laden)
  const localCache = new IndexeddbPersistence(roomId, ydoc)

  // Firebase: zentraler persistenter Sync (Quelle der Wahrheit)
  const provider = new FirebaseProvider(db, roomId, ydoc)

  // Awareness nur lokal (Cursor-Highlight im eigenen Editor)
  const awareness = new Awareness(ydoc)

  return { ydoc, provider, localCache, ytext, awareness }
}

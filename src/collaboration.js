import * as Y from 'yjs'
import { Awareness } from 'y-protocols/awareness'
import { IndexeddbPersistence } from 'y-indexeddb'
import { FirebaseProvider } from './firebaseProvider.js'
import { db } from './firebase.js'

export function initCollaboration(roomId) {
  const ydoc  = new Y.Doc()
  const ytext = ydoc.getText('protokoll')

  // Lokale Persistenz (schnelles Laden bei Refresh)
  const localProvider = new IndexeddbPersistence(roomId, ydoc)

  // Firebase (Echtzeit-Synchronisation und Cloud-Speicher)
  const provider  = new FirebaseProvider(db, roomId, ydoc)
  const awareness = new Awareness(ydoc)

  return { ydoc, provider, localProvider, ytext, awareness }
}

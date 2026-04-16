import * as Y from 'yjs'
import { Awareness } from 'y-protocols/awareness'
import { FirebaseProvider } from './firebaseProvider.js'
import { db } from './firebase.js'

export function initCollaboration(roomId) {
  const ydoc  = new Y.Doc()
  const ytext = ydoc.getText('protokoll')

  // Firebase ist die einzige Quelle der Wahrheit
  const provider  = new FirebaseProvider(db, roomId, ydoc)
  const awareness = new Awareness(ydoc)

  return { ydoc, provider, ytext, awareness }
}

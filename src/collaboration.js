import * as Y from 'yjs'
import { Awareness } from 'y-protocols/awareness'
import { FirebaseProvider } from './firebaseProvider.js'
import { db } from './firebase.js'

export function initCollaboration(roomId, identity) {
  const ydoc = new Y.Doc()
  const ytext = ydoc.getText('protokoll')
  const awareness = new Awareness(ydoc)

  if (identity) {
    awareness.setLocalStateField('user', {
      name: identity.name,
      color: identity.color,
      initials: identity.initials,
    })
  }

  const provider = new FirebaseProvider(db, roomId, ydoc, awareness)

  return { ydoc, provider, ytext, awareness }
}

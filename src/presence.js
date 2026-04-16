import { ref, set, remove, onValue, onDisconnect } from 'firebase/database'
import { db } from './firebase.js'

export function initPresence(roomId, identity) {
  const clientId = Math.random().toString(36).slice(2)
  const myRef = ref(db, `rooms/${roomId}/presence/${clientId}`)

  set(myRef, {
    name:     identity.name,
    initials: identity.initials,
    color:    identity.color,
  })
  onDisconnect(myRef).remove()

  return clientId
}

/** Gibt eine Unsubscribe-Funktion zurück */
export function watchPresence(roomId, clientId, onUpdate) {
  const presenceRef = ref(db, `rooms/${roomId}/presence`)
  const unsub = onValue(presenceRef, snap => {
    const users = []
    snap.forEach(child => {
      users.push({ id: child.key, isLocal: child.key === clientId, ...child.val() })
    })
    onUpdate(users)
  })
  return unsub
}

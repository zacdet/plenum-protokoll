/**
 * Online-Präsenz via Firebase RTDB
 * Wird automatisch entfernt wenn der Browser/Tab geschlossen wird (onDisconnect)
 */
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

  // Beim Trennen (Tab zu, Browser zu, Offline) automatisch entfernen
  onDisconnect(myRef).remove()

  return clientId
}

export function watchPresence(roomId, clientId, onUpdate) {
  const presenceRef = ref(db, `rooms/${roomId}/presence`)
  onValue(presenceRef, snapshot => {
    const users = []
    snapshot.forEach(child => {
      users.push({ id: child.key, isLocal: child.key === clientId, ...child.val() })
    })
    onUpdate(users)
  })
}

import { ref, set, remove, onValue, onDisconnect } from 'firebase/database'
import { db } from './firebase.js'

// Eine feste ID pro Browser-Session (kein Duplizieren bei Protokollwechsel)
const SESSION_ID = Math.random().toString(36).slice(2)

let _currentRef = null  // aktuelle Presence-Ref, für explizites Cleanup

export function initPresence(roomId, identity) {
  // Alte Presence explizit löschen bevor neue angelegt wird
  if (_currentRef) {
    remove(_currentRef).catch(() => {})
    _currentRef = null
  }

  const myRef = ref(db, `rooms/${roomId}/presence/${SESSION_ID}`)
  _currentRef = myRef

  set(myRef, {
    name:     identity.name,
    initials: identity.initials,
    color:    identity.color,
  }).catch(e => console.error('[Presence] Fehler:', e))

  // Beim Schließen des Tabs automatisch entfernen
  onDisconnect(myRef).remove()

  return SESSION_ID
}

/** Gibt Unsubscribe-Funktion zurück */
export function watchPresence(roomId, onUpdate) {
  const presenceRef = ref(db, `rooms/${roomId}/presence`)
  return onValue(presenceRef, snap => {
    const users = []
    snap.forEach(child => {
      users.push({
        id:      child.key,
        isLocal: child.key === SESSION_ID,
        ...child.val(),
      })
    })
    onUpdate(users)
  })
}

export function removePresence() {
  if (_currentRef) {
    remove(_currentRef).catch(() => {})
    _currentRef = null
  }
}

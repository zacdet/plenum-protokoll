/**
 * Yjs ↔ Firebase Realtime Database Provider
 *
 * Struktur in RTDB:
 *   rooms/{roomId}/snapshot   → vollständiger Yjs-State (base64)
 *   rooms/{roomId}/updates/*  → inkrementelle Updates (base64)
 */
import * as Y from 'yjs'
import { ref, push, get, set, remove, onChildAdded } from 'firebase/database'

// Robust encode – kein Spread-Operator (vermeidet Stack-Overflow bei großen Updates)
function encode(bytes) {
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

function decode(b64) {
  const binary = atob(b64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

const COMPACT_THRESHOLD = 100

export class FirebaseProvider {
  constructor(database, roomId, ydoc) {
    this._db          = database
    this._roomId      = roomId
    this.ydoc         = ydoc
    this._updateHandler = null

    this._snapshotRef = ref(database, `rooms/${roomId}/snapshot`)
    this._updatesRef  = ref(database, `rooms/${roomId}/updates`)

    this.whenSynced = new Promise(resolve => { this._resolve = resolve })
    this._start()
  }

  async _start() {
    try {
      // 1. Snapshot laden
      const snap = await get(this._snapshotRef)
      if (snap.exists()) {
        Y.applyUpdate(this.ydoc, decode(snap.val()), 'firebase')
        console.log('[Firebase] Snapshot geladen')
      }

      // 2. Alle bisherigen Updates laden
      const updatesSnap = await get(this._updatesRef)
      const knownKeys = new Set()
      let updateCount = 0

      if (updatesSnap.exists()) {
        updatesSnap.forEach(child => {
          knownKeys.add(child.key)
          Y.applyUpdate(this.ydoc, decode(child.val()), 'firebase')
          updateCount++
        })
        console.log(`[Firebase] ${updateCount} Updates geladen`)
      } else {
        console.log('[Firebase] Kein vorhandener Inhalt – neues Dokument')
      }

      // 3. Bereit → Editor kann rendern
      this._resolve()

      // 4. Auf neue Updates anderer Clients horchen
      onChildAdded(this._updatesRef, snapshot => {
        if (knownKeys.has(snapshot.key)) return
        knownKeys.add(snapshot.key)
        console.log('[Firebase] Update von anderem Client empfangen')
        Y.applyUpdate(this.ydoc, decode(snapshot.val()), 'firebase')
      })

      // 5. Eigene Änderungen pushen
      this._updateHandler = (update, origin) => {
        if (origin === 'firebase') return
        push(this._updatesRef, encode(update))
          .then(() => console.log('[Firebase] Update gespeichert'))
          .catch(err => console.error('[Firebase] Fehler beim Speichern:', err))
      }
      this.ydoc.on('update', this._updateHandler)

      // 6. Komprimieren wenn nötig
      if (updateCount >= COMPACT_THRESHOLD) {
        this._compact()
      }

    } catch (err) {
      console.error('[Firebase] Initialisierungsfehler:', err)
      // Trotzdem resolve damit UI nicht hängt
      this._resolve()
    }
  }

  async _compact() {
    console.log('[Firebase] Komprimiere Updates…')
    const snapshot = Y.encodeStateAsUpdate(this.ydoc)
    await set(this._snapshotRef, encode(snapshot))
    await remove(this._updatesRef)
    console.log('[Firebase] Komprimierung abgeschlossen')
  }

  destroy() {
    if (this._updateHandler) {
      this.ydoc.off('update', this._updateHandler)
      this._updateHandler = null
    }
  }
}

/**
 * Yjs ↔ Firebase Realtime Database Provider
 *
 * Struktur in RTDB:
 *   rooms/{roomId}/snapshot   → vollständiger Yjs-State (base64), wird periodisch komprimiert
 *   rooms/{roomId}/updates/*  → einzelne Yjs-Updates (base64), push-Schlüssel
 */
import * as Y from 'yjs'
import { ref, push, get, set, remove, onChildAdded } from 'firebase/database'

function encode(bytes) {
  return btoa(String.fromCharCode(...bytes))
}

function decode(b64) {
  return Uint8Array.from(atob(b64), c => c.charCodeAt(0))
}

const COMPACT_THRESHOLD = 100  // nach N Updates → komprimieren

export class FirebaseProvider {
  constructor(database, roomId, ydoc) {
    this._db       = database
    this._roomId   = roomId
    this.ydoc      = ydoc
    this._synced   = false

    this._snapshotRef = ref(database, `rooms/${roomId}/snapshot`)
    this._updatesRef  = ref(database, `rooms/${roomId}/updates`)

    this.whenSynced = new Promise(resolve => { this._resolve = resolve })
    this._start()
  }

  async _start() {
    // 1. Snapshot laden (falls vorhanden)
    const snap = await get(this._snapshotRef)
    if (snap.exists()) {
      Y.applyUpdate(this.ydoc, decode(snap.val()), 'firebase')
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
    }

    // Bereit – UI kann rendern
    this._synced = true
    this._resolve()

    // 3. Auf neue Updates von anderen Clients horchen
    onChildAdded(this._updatesRef, snapshot => {
      if (knownKeys.has(snapshot.key)) return  // schon angewandt
      knownKeys.add(snapshot.key)
      Y.applyUpdate(this.ydoc, decode(snapshot.val()), 'firebase')
    })

    // 4. Eigene Änderungen zu Firebase pushen
    this.ydoc.on('update', (update, origin) => {
      if (origin === 'firebase') return  // nicht zurück-pushen
      push(this._updatesRef, encode(update)).catch(console.error)
    })

    // 5. Komprimieren wenn nötig (verhindert unbegrenzte Update-Liste)
    if (updateCount >= COMPACT_THRESHOLD) {
      this._compact()
    }
  }

  async _compact() {
    const snapshot = Y.encodeStateAsUpdate(this.ydoc)
    await set(this._snapshotRef, encode(snapshot))
    await remove(this._updatesRef)
  }

  destroy() {
    this.ydoc.off('update')
  }
}

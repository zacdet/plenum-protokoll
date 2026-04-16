import * as Y from 'yjs'
import { ref, set, onValue, off } from 'firebase/database'

/**
 * Wandelt Uint8Array sicher in Base64 um
 */
function fromUint8Array(arr) {
  return btoa(Array.from(arr).map(c => String.fromCharCode(c)).join(''))
}

/**
 * Wandelt Base64 sicher zurück in Uint8Array
 */
function toUint8Array(s) {
  return new Uint8Array(atob(s).split('').map(c => c.charCodeAt(0)))
}

export class FirebaseProvider {
  constructor(database, roomId, ydoc) {
    this.ydoc = ydoc
    this.roomId = roomId
    this._docRef = ref(database, `rooms/${roomId}/doc`)
    this._handler = null
    this._saveTimer = null
    this._isApplying = false

    console.log(`[Firebase] Verbinde mit Raum: ${roomId}`)

    this.whenSynced = new Promise((resolve) => {
      // 1. Auf den aktuellen Stand in der Cloud hören
      // onValue feuert sofort einmal mit dem aktuellen Stand
      onValue(this._docRef, (snap) => {
        if (this._isApplying) return
        
        if (snap.exists()) {
          const bytes = toUint8Array(snap.val())
          this._isApplying = true
          Y.applyUpdate(this.ydoc, bytes, 'firebase')
          this._isApplying = false
          console.log(`[Firebase] Cloud-Update erhalten (${bytes.length} bytes)`)
        } else {
          console.log('[Firebase] Dokument ist neu oder leer')
        }
        resolve() // Erstes Laden fertig
      }, { onlyOnce: false })

      // 2. Eigene Änderungen speichern (mit 500ms Verzögerung)
      this._handler = (update, origin) => {
        // Ignoriere Updates, die wir gerade von Firebase erhalten haben
        if (origin === 'firebase') return

        console.log('[Firebase] Änderung registriert, plane Speicherung...')
        clearTimeout(this._saveTimer)
        this._saveTimer = setTimeout(() => {
          this._save()
        }, 500)
      }
      this.ydoc.on('update', this._handler)
    })
  }

  _save() {
    try {
      const fullState = Y.encodeStateAsUpdate(this.ydoc)
      const encoded = fromUint8Array(fullState)
      set(this._docRef, encoded).then(() => {
        console.log('[Firebase] ✓ Erfolgreich in Cloud gespeichert')
      }).catch(err => {
        console.error('[Firebase] ✗ Speicherfehler:', err)
      })
    } catch (e) {
      console.error('[Firebase] Fehler beim Kodieren:', e)
    }
  }

  destroy() {
    clearTimeout(this._saveTimer)
    if (this._handler) this.ydoc.off('update', this._handler)
    off(this._docRef)
  }
}

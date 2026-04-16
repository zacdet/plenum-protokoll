import * as Y from 'yjs'
import { ref, get, set, onValue, off } from 'firebase/database'

/**
 * Sicherere Base64-Umwandlung für binäre Daten
 */
function fromUint8Array(arr) {
  let binary = ''
  const len = arr.byteLength
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(arr[i])
  }
  return btoa(binary)
}

function toUint8Array(s) {
  const binaryString = atob(s)
  const len = binaryString.length
  const bytes = new Uint8Array(len)
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }
  return bytes
}

export class FirebaseProvider {
  constructor(database, roomId, ydoc) {
    this.ydoc = ydoc
    this.roomId = roomId
    this._docRef = ref(database, `rooms/${roomId}/doc`)
    this._isApplying = false
    this._initialSyncDone = false
    this._saveTimer = null

    console.log(`[Firebase] Verbinde mit Raum: ${roomId}`)

    // 1. Initialen Stand laden und auf Updates hören
    this.whenSynced = new Promise((resolve) => {
      onValue(this._docRef, (snap) => {
        if (this._isApplying) return
        
        if (snap.exists()) {
          const bytes = toUint8Array(snap.val())
          this._isApplying = true
          // 'firebase' als origin setzen, um Endlosschleifen zu vermeiden
          Y.applyUpdate(this.ydoc, bytes, 'firebase')
          this._isApplying = false
          console.log(`[Firebase] Daten empfangen (${bytes.length} bytes)`)
        } else {
          console.log('[Firebase] Dokument ist neu')
        }

        if (!this._initialSyncDone) {
          this._initialSyncDone = true
          console.log('[Firebase] Initialer Sync fertig - Speichern aktiviert')
          resolve()
        }
      })
    })

    // 2. Lokale Änderungen speichern
    this._handler = (update, origin) => {
      // WICHTIG: Nur speichern, wenn:
      // - das Update NICHT von Firebase kommt
      // - wir mit dem ersten Laden FERTIG sind (Schutz vor Überschreiben beim Start)
      if (origin === 'firebase' || !this._initialSyncDone) return

      clearTimeout(this._saveTimer)
      this._saveTimer = setTimeout(() => {
        this._save()
      }, 500) // 500ms warten nach dem Tippen
    }
    
    this.ydoc.on('update', this._handler)
  }

  _save() {
    try {
      const state = Y.encodeStateAsUpdate(this.ydoc)
      const encoded = fromUint8Array(state)
      
      // Sicherheits-Check: Nicht speichern, wenn wir noch gar nicht synchron sind
      if (!this._initialSyncDone) return

      set(this._docRef, encoded)
        .then(() => console.log('[Firebase] ✓ Gespeichert'))
        .catch(err => console.error('[Firebase] ✗ Fehler:', err))
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

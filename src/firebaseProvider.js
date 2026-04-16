import * as Y from 'yjs'
import { ref, get, set, onValue, off } from 'firebase/database'

/**
 * Robustes Base64-Encoding
 */
function encode(bytes) {
  let s = ''
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i])
  return btoa(s)
}

function decode(b64) {
  try {
    const s = atob(b64)
    const b = new Uint8Array(s.length)
    for (let i = 0; i < s.length; i++) b[i] = s.charCodeAt(i)
    return b
  } catch (e) {
    return new Uint8Array()
  }
}

/**
 * Vereinfachter FirebaseProvider:
 * Speichert das gesamte Yjs-Dokument als einen State in Firebase.
 * Jede Änderung triggert ein Update des gesamten States.
 */
export class FirebaseProvider {
  constructor(database, roomId, ydoc) {
    this.ydoc     = ydoc
    this.roomId   = roomId
    this._docRef  = ref(database, `rooms/${roomId}/doc`)
    this._handler = null
    this._isApplyingUpdate = false

    console.log(`[Firebase] Initialisiere Raum: ${roomId}`)
    
    this.whenSynced = new Promise((resolve) => {
      // 1. Initialen Wert laden
      get(this._docRef).then(snap => {
        if (snap.exists()) {
          const bytes = decode(snap.val())
          Y.applyUpdate(this.ydoc, bytes, 'firebase')
          console.log(`[Firebase] Dokument geladen (${bytes.length} Bytes)`)
        } else {
          console.log('[Firebase] Neues Dokument erstellt')
        }
        
        // 2. Auf Echtzeit-Änderungen von anderen hören
        onValue(this._docRef, (snap) => {
          if (this._isApplyingUpdate) return
          if (snap.exists()) {
            const bytes = decode(snap.val())
            this._isApplyingUpdate = true
            Y.applyUpdate(this.ydoc, bytes, 'firebase')
            this._isApplyingUpdate = false
          }
        })

        // 3. Eigene Änderungen speichern
        this._handler = (update, origin) => {
          if (origin === 'firebase') return
          
          // Wir speichern immer das gesamte Dokument als Update-State
          // Das ist für kleinere/mittlere Protokolle extrem sicher
          const fullState = Y.encodeStateAsUpdate(this.ydoc)
          set(this._docRef, encode(fullState))
            .catch(e => console.error('[Firebase] Speicherfehler:', e))
        }
        this.ydoc.on('update', this._handler)
        
        resolve()
      })
    })
  }

  destroy() {
    if (this._handler) this.ydoc.off('update', this._handler)
    off(this._docRef)
    this._handler = null
  }
}

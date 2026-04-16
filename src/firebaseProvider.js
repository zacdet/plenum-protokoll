import * as Y from 'yjs'
import { ref, get, set, onValue, off } from 'firebase/database'

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

export class FirebaseProvider {
  constructor(database, roomId, ydoc) {
    this.ydoc = ydoc
    this.roomId = roomId
    this._docRef = ref(database, `rooms/${roomId}/doc`)
    this._handler = null
    this._isApplying = false

    console.log(`[Firebase] Verbinde mit Raum: ${roomId}`)
    
    this.whenSynced = new Promise((resolve) => {
      // 1. Einmalig den aktuellen Stand laden
      get(this._docRef).then(snap => {
        if (snap.exists()) {
          const bytes = decode(snap.val())
          Y.applyUpdate(this.ydoc, bytes, 'firebase')
          console.log(`[Firebase] Dokument geladen (${bytes.length} Bytes)`)
        } else {
          console.log('[Firebase] Neues Dokument')
        }
        
        // 2. Auf Echtzeit-Änderungen hören
        onValue(this._docRef, (snap) => {
          if (this._isApplying) return
          if (snap.exists()) {
            const bytes = decode(snap.val())
            this._isApplying = true
            Y.applyUpdate(this.ydoc, bytes, 'firebase')
            this._isApplying = false
            console.log('[Firebase] Update empfangen')
          }
        })

        // 3. Eigene Änderungen speichern
        this._handler = (update, origin) => {
          if (origin === 'firebase') return
          
          // Wir speichern immer das gesamte Dokument
          const fullState = Y.encodeStateAsUpdate(this.ydoc)
          set(this._docRef, encode(fullState))
        }
        this.ydoc.on('update', this._handler)
        
        resolve()
      })
    })
  }

  destroy() {
    if (this._handler) this.ydoc.off('update', this._handler)
    off(this._docRef)
  }
}

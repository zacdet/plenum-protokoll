import * as Y from 'yjs'
import { ref, push, onChildAdded, off } from 'firebase/database'

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
    this._opsRef = ref(database, `rooms/${roomId}/updates`)
    this._knownKeys = new Set()
    
    console.log(`[Firebase] Initialisiere Raum: ${roomId}`)
    
    // Wir nutzen ein Promise, das sich auflöst, sobald wir verbunden sind
    this.whenSynced = new Promise((resolve) => {
      let isFirstSync = true
      
      // onChildAdded feuert erst für alle existierenden Einträge (Historie)
      // und bleibt dann aktiv für neue (Echtzeit).
      onChildAdded(this._opsRef, (child) => {
        if (this._knownKeys.has(child.key)) return
        this._knownKeys.add(child.key)
        
        const update = decode(child.val())
        if (update.length > 0) {
          // Wir wenden das Update mit origin 'firebase' an
          Y.applyUpdate(this.ydoc, update, 'firebase')
          
          if (!isFirstSync) {
            console.log('[Firebase] Remote-Update empfangen und angewendet')
          }
        }
      })

      // Wir gehen davon aus, dass wir nach einer kurzen Zeit "bereit" sind
      // (Firebase hat keine explizite "EndOfInitialData" Flag für onChildAdded)
      setTimeout(() => {
        isFirstSync = false
        console.log(`[Firebase] Raum bereit. Aktuelle Länge: ${this.ydoc.getText('protokoll').toString().length}`)
        resolve()
      }, 1000)
    })

    // Lokale Änderungen abfangen
    this._handler = (update, origin) => {
      // NUR senden, wenn es NICHT von Firebase kommt
      if (origin !== 'firebase') {
        console.log('[Firebase] Sende lokale Änderung...')
        const encoded = encode(update)
        push(this._opsRef, encoded).then(ref => {
          this._knownKeys.add(ref.key)
        }).catch(err => {
          console.error('[Firebase] Sende-Fehler:', err)
        })
      }
    }
    
    this.ydoc.on('update', this._handler)
  }

  destroy() {
    console.log(`[Firebase] Verlasse Raum: ${this.roomId}`)
    if (this._handler) {
      this.ydoc.off('update', this._handler)
    }
    off(this._opsRef)
  }
}

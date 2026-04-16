import * as Y from 'yjs'
import { ref, push, onChildAdded, get, off } from 'firebase/database'

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
 * FirebaseProvider: Synchronisiert Yjs inkrementell mit Firebase
 */
export class FirebaseProvider {
  constructor(database, roomId, ydoc) {
    this.ydoc = ydoc
    this.roomId = roomId
    this._opsRef = ref(database, `rooms/${roomId}/updates`)
    this._knownKeys = new Set()
    this._handler = null

    console.log(`[Firebase] Verbinde mit Raum: ${roomId}`)
    this.whenSynced = this._init()
  }

  async _init() {
    // 1. Historie laden (alle existierenden Updates)
    try {
      const snap = await get(this._opsRef)
      if (snap.exists()) {
        const data = snap.val()
        const keys = Object.keys(data).sort()
        console.log(`[Firebase] Lade Historie: ${keys.length} Updates`)
        
        // WICHTIG: Alle Historien-Updates in einer Transaktion mit 'firebase' origin anwenden
        this.ydoc.transact(() => {
          keys.forEach(key => {
            this._knownKeys.add(key)
            Y.applyUpdate(this.ydoc, decode(data[key]), 'firebase')
          })
        }, 'firebase')
      }
    } catch (e) {
      console.error('[Firebase] Ladefehler:', e)
    }

    // 2. Echtzeit-Updates ab jetzt
    onChildAdded(this._opsRef, (child) => {
      if (this._knownKeys.has(child.key)) return
      this._knownKeys.add(child.key)
      
      const update = decode(child.val())
      // WICHTIG: 'firebase' als origin, damit der lokale Handler es nicht zurück-pusht
      Y.applyUpdate(this.ydoc, update, 'firebase')
      console.log('[Firebase] Remote-Update empfangen')
    })

    // 3. Lokale Änderungen an die Cloud senden
    this._handler = (update, origin) => {
      // Wenn das Update von Firebase selbst kommt (origin === 'firebase'), ignorieren
      if (origin === 'firebase' || origin === this) return

      console.log('[Firebase] Sende lokales Update...')
      push(this._opsRef, encode(update)).then(ref => {
        this._knownKeys.add(ref.key)
      }).catch(e => console.error('[Firebase] Push fehlgeschlagen:', e))
    }
    this.ydoc.on('update', this._handler)
    
    console.log('[Firebase] Bereit')
  }

  destroy() {
    if (this._handler) this.ydoc.off('update', this._handler)
    off(this._opsRef)
  }
}

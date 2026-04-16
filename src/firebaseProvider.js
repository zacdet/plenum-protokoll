import * as Y from 'yjs'
import { ref, get, push, onChildAdded, off, query, startAfter } from 'firebase/database'

const LOG = '[Firebase-V8]'

function toBase64(uint8) {
  return btoa(String.fromCharCode.apply(null, uint8))
}

function fromBase64(b64) {
  const s = atob(b64)
  const uint8 = new Uint8Array(s.length)
  for (let i = 0; i < s.length; i++) uint8[i] = s.charCodeAt(i)
  return uint8
}

export class FirebaseProvider {
  constructor(database, roomId, ydoc) {
    this.ydoc = ydoc
    this.roomId = roomId
    // V8: Reiner Inkrementeller Sync (wie y-webrtc / Google Docs)
    this._updatesRef = ref(database, `rooms/${roomId}/updates_v8`)
    this._knownKeys = new Set()
    this._handler = null

    console.log(`${LOG} Verbinde mit Raum: ${roomId}`)

    this.whenSynced = new Promise(async (resolve) => {
      // 1. Lade alle existierenden Updates (Historie)
      try {
        const snap = await get(this._updatesRef)
        if (snap.exists()) {
          const updates = []
          snap.forEach(child => {
            this._knownKeys.add(child.key)
            updates.push(fromBase64(child.val()))
          })
          
          if (updates.length > 0) {
            this.ydoc.transact(() => {
              updates.forEach(u => Y.applyUpdate(this.ydoc, u, 'firebase'))
            }, 'firebase')
            console.log(`${LOG} ${updates.length} Updates aus Historie geladen`)
          }
        } else {
          console.log(`${LOG} Dokument ist komplett neu`)
        }
      } catch (e) {
        console.error(`${LOG} Fehler beim Laden der Historie:`, e)
      }

      // 2. Höre ab jetzt auf NEUE Updates von anderen
      onChildAdded(this._updatesRef, (child) => {
        if (this._knownKeys.has(child.key)) return
        this._knownKeys.add(child.key)
        
        try {
          const bytes = fromBase64(child.val())
          Y.applyUpdate(this.ydoc, bytes, 'firebase')
        } catch (e) {
          console.error(`${LOG} Fehler beim Anwenden des Updates:`, e)
        }
      })

      // 3. Eigene lokale Änderungen sofort an Firebase senden
      this._handler = (update, origin) => {
        // Ignoriere Updates, die wir gerade von Firebase bekommen haben
        if (origin === 'firebase') return
        
        try {
          const b64 = toBase64(update)
          push(this._updatesRef, b64).then(ref => {
            this._knownKeys.add(ref.key) // Eigene Updates als bekannt markieren
          }).catch(e => console.error(`${LOG} Sende-Fehler:`, e))
        } catch (e) {
          console.error(`${LOG} Encoding-Fehler:`, e)
        }
      }
      this.ydoc.on('update', this._handler)

      console.log(`${LOG} Synchronisation abgeschlossen. Editor bereit.`)
      resolve()
    })
  }

  destroy() {
    console.log(`${LOG} Trenne Raum: ${this.roomId}`)
    if (this._handler) this.ydoc.off('update', this._handler)
    off(this._updatesRef)
  }
}

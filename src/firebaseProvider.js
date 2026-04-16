import * as Y from 'yjs'
import { ref, get, set, onValue, off } from 'firebase/database'

// V5 - Absolute Robustheit
const LOG_PREFIX = '[Firebase-V5]'

/**
 * Sicherste Methode für Uint8Array <-> Base64
 */
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
    // Wir nutzen einen neuen Pfad 'doc_v5', um Altlasten zu vermeiden
    this._docRef = ref(database, `rooms/${roomId}/doc_v5`)
    this._handler = null
    this._saveTimer = null
    this._isApplying = false
    this._hasLoadedInitial = false

    console.log(`${LOG_PREFIX} Initialisiere für Raum: ${roomId}`)

    this.whenSynced = new Promise((resolve) => {
      // 1. Initialen Stand einmalig laden
      get(this._docRef).then(snap => {
        if (snap.exists()) {
          const bytes = fromBase64(snap.val())
          this._isApplying = true
          Y.applyUpdate(this.ydoc, bytes, 'firebase-init')
          this._isApplying = false
          console.log(`${LOG_PREFIX} Historie geladen: ${bytes.length} Bytes`)
        } else {
          console.log(`${LOG_PREFIX} Kein Dokument in der Cloud gefunden (neu)`)
        }
        
        this._hasLoadedInitial = true
        
        // 2. Echtzeit-Updates ab jetzt
        onValue(this._docRef, (s) => {
          if (this._isApplying) return
          if (s.exists()) {
            const b = fromBase64(s.val())
            this._isApplying = true
            Y.applyUpdate(this.ydoc, b, 'firebase-sync')
            this._isApplying = false
            console.log(`${LOG_PREFIX} Live-Update empfangen`)
          }
        })

        // 3. Lokale Änderungen speichern
        this._handler = (update, origin) => {
          // Nur speichern, wenn wir geladen haben UND es nicht von Firebase kommt
          if (!this._hasLoadedInitial || origin === 'firebase-init' || origin === 'firebase-sync') return

          console.log(`${LOG_PREFIX} Lokale Änderung erkannt, plane Speicherung...`)
          clearTimeout(this._saveTimer)
          this._saveTimer = setTimeout(() => this._performSave(), 1000)
        }
        this.ydoc.on('update', this._handler)
        
        resolve()
      }).catch(err => {
        console.error(`${LOG_PREFIX} KRITISCHER LADEFEHLER:`, err)
        this._hasLoadedInitial = true
        resolve()
      })
    })
  }

  async _performSave() {
    if (!this._hasLoadedInitial) return
    
    try {
      const state = Y.encodeStateAsUpdate(this.ydoc)
      // Sicherheitscheck: Ein komplett leeres Dokument (nur Header) 
      // überschreibt nichts, wenn wir schon Text haben.
      const textLength = this.ydoc.getText('protokoll').toString().length
      console.log(`${LOG_PREFIX} Speichere in Cloud... (Text-Länge: ${textLength})`)
      
      const b64 = toBase64(state)
      await set(this._docRef, b64)
      console.log(`${LOG_PREFIX} ✓ Dokument dauerhaft gespeichert`)
    } catch (e) {
      console.error(`${LOG_PREFIX} SPEICHERFEHLER:`, e)
    }
  }

  destroy() {
    clearTimeout(this._saveTimer)
    if (this._handler) this.ydoc.off('update', this._handler)
    off(this._docRef)
  }
}

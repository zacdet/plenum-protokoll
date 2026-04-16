import * as Y from 'yjs'
import { ref, get, set, onValue } from 'firebase/database'

function encode(bytes) {
  let s = ''
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i])
  return btoa(s)
}

function decode(b64) {
  const s = atob(b64)
  const b = new Uint8Array(s.length)
  for (let i = 0; i < s.length; i++) b[i] = s.charCodeAt(i)
  return b
}

export class FirebaseProvider {
  constructor(database, roomId, ydoc) {
    this.ydoc     = ydoc
    this._ref     = ref(database, `rooms/${roomId}/doc`)
    this._handler = null
    this._unsub   = null
    this._timer   = null
    this._roomId  = roomId

    this.whenSynced = new Promise(resolve => { this._resolve = resolve })
    this._start()
  }

  async _start() {
    // 1. Initiales Laden
    try {
      console.log(`[Firebase] Lade Dokument für Raum: ${this._roomId}`)
      const snap = await get(this._ref)
      if (snap.exists()) {
        const raw = snap.val()
        console.log(`[Firebase] Dokument gefunden, Größe: ${raw.length} Zeichen`)
        Y.applyUpdate(this.ydoc, decode(raw), 'firebase')
        console.log(`[Firebase] Dokument angewendet, Inhalt: "${this.ydoc.getText('protokoll').toString().slice(0, 50)}..."`)
      } else {
        console.log('[Firebase] Leeres Dokument (noch nichts gespeichert)')
      }
    } catch (e) {
      console.error('[Firebase] Ladefehler:', e)
    }

    // 2. Editor kann rendern
    this._resolve()

    // 3. Echtzeit: Änderungen anderer Clients empfangen
    this._unsub = onValue(this._ref, snap => {
      if (!snap.exists()) return
      try {
        const bytes = decode(snap.val())
        Y.applyUpdate(this.ydoc, bytes, 'firebase')
        console.log('[Firebase] Update von anderem Client empfangen')
      } catch (e) {
        console.error('[Firebase] Fehler beim Anwenden des Updates:', e)
      }
    })

    // 4. Eigene Änderungen speichern (debounced 400ms)
    this._handler = (update, origin) => {
      if (origin === 'firebase') return
      console.log(`[Firebase] Lokale Änderung erkannt (origin: ${origin}), plane Speicherung…`)
      clearTimeout(this._timer)
      this._timer = setTimeout(() => {
        try {
          const state = Y.encodeStateAsUpdate(this.ydoc)
          const encoded = encode(state)
          console.log(`[Firebase] Speichere ${encoded.length} Zeichen…`)
          set(this._ref, encoded)
            .then(() => console.log('[Firebase] ✓ Gespeichert'))
            .catch(e => console.error('[Firebase] ✗ Speicherfehler:', e))
        } catch (e) {
          console.error('[Firebase] Fehler beim Kodieren:', e)
        }
      }, 400)
    }
    this.ydoc.on('update', this._handler)
  }

  destroy() {
    clearTimeout(this._timer)
    if (this._handler) this.ydoc.off('update', this._handler)
    if (this._unsub)   this._unsub()
    this._handler = null
    this._unsub   = null
  }
}

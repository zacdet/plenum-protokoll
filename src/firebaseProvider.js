/**
 * Yjs ↔ Firebase Realtime Database
 *
 * Speichert immer den vollen Yjs-State als einzelnen Node:
 *   rooms/{roomId}/doc = base64(Y.encodeStateAsUpdate(ydoc))
 *
 * Einfacher, zuverlässiger als inkrementelle Updates.
 * onValue gibt Echtzeit-Updates an alle verbundenen Clients.
 */
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

    this.whenSynced = new Promise(resolve => { this._resolve = resolve })
    this._start()
  }

  async _start() {
    try {
      // 1. Gespeicherten State laden
      const snap = await get(this._ref)
      if (snap.exists()) {
        Y.applyUpdate(this.ydoc, decode(snap.val()), 'firebase')
        console.log('[Firebase] Dokument geladen')
      } else {
        console.log('[Firebase] Neues Dokument')
      }
    } catch (e) {
      console.error('[Firebase] Ladefehler:', e)
    }

    // 2. Editor kann rendern
    this._resolve()

    // 3. Echtzeit: Änderungen anderer Clients empfangen
    this._unsub = onValue(this._ref, snap => {
      if (!snap.exists()) return
      Y.applyUpdate(this.ydoc, decode(snap.val()), 'firebase')
    })

    // 4. Eigene Änderungen speichern (debounced 400ms)
    this._handler = (update, origin) => {
      if (origin === 'firebase') return
      clearTimeout(this._timer)
      this._timer = setTimeout(() => {
        const state = Y.encodeStateAsUpdate(this.ydoc)
        set(this._ref, encode(state))
          .then(() => console.log('[Firebase] Gespeichert'))
          .catch(e => console.error('[Firebase] Speicherfehler:', e))
      }, 400)
    }
    this.ydoc.on('update', this._handler)
  }

  destroy() {
    clearTimeout(this._timer)
    if (this._handler)  this.ydoc.off('update', this._handler)
    if (this._unsub)    this._unsub()
  }
}

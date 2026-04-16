import * as Y from 'yjs'
import { ref, get, set, onValue, off } from 'firebase/database'

export class FirebaseProvider {
  constructor(database, roomId, ydoc) {
    this.ydoc = ydoc
    this.roomId = roomId
    // Neuer Pfad für sauberen Neustart
    this._ref = ref(database, `rooms/${roomId}/state_v7`)
    this._isRemote = false
    this._synced = false
    this._handler = null
    this._saveTimer = null

    console.log(`[Firebase] Initialisiere Raum: ${roomId}`)

    this.whenSynced = new Promise(async (resolve) => {
      // 1. Einmalig den aktuellen Stand laden
      try {
        const snap = await get(this._ref)
        if (snap.exists()) {
          const bytes = this._decode(snap.val())
          this._isRemote = true
          Y.applyUpdate(this.ydoc, bytes, 'firebase')
          this._isRemote = false
          console.log(`[Firebase] Cloud-Daten geladen (${bytes.length} Bytes)`)
        } else {
          console.log('[Firebase] Dokument ist neu (kein Stand in Cloud)')
        }
      } catch (e) {
        console.error('[Firebase] Fehler beim Laden:', e)
      }

      // 2. Auf Echtzeit-Updates hören
      onValue(this._ref, (snap) => {
        if (this._isRemote) return
        if (snap.exists()) {
          const bytes = this._decode(snap.val())
          this._isRemote = true
          Y.applyUpdate(this.ydoc, bytes, 'firebase')
          this._isRemote = false
          console.log('[Firebase] Live-Update empfangen')
        }
      })

      // Erst jetzt erlauben wir das Speichern
      this._synced = true
      
      // 3. Eigene Änderungen speichern
      this._handler = (update, origin) => {
        // Nur speichern, wenn wir fertig geladen haben und es nicht von Firebase kommt
        if (origin === 'firebase' || !this._synced) return
        
        clearTimeout(this._saveTimer)
        this._saveTimer = setTimeout(() => {
          const state = Y.encodeStateAsUpdate(this.ydoc)
          set(this._ref, this._encode(state))
            .then(() => console.log('[Firebase] Stand dauerhaft gespeichert'))
            .catch(e => console.error('[Firebase] Speicherfehler:', e))
        }, 1000)
      }
      this.ydoc.on('update', this._handler)
      
      resolve()
    })
  }

  _encode(uint8) {
    let s = ''
    for (let i = 0; i < uint8.length; i++) s += String.fromCharCode(uint8[i])
    return btoa(s)
  }

  _decode(b64) {
    const s = atob(b64)
    const uint8 = new Uint8Array(s.length)
    for (let i = 0; i < s.length; i++) uint8[i] = s.charCodeAt(i)
    return uint8
  }

  destroy() {
    clearTimeout(this._saveTimer)
    if (this._handler) this.ydoc.off('update', this._handler)
    off(this._ref)
  }
}

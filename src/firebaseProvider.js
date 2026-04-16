import * as Y from 'yjs'
import {
  ref,
  get,
  set,
  push,
  onChildAdded,
  onDisconnect,
  onValue,
  remove,
  off,
  query,
  orderByKey,
  startAfter,
  serverTimestamp,
} from 'firebase/database'

const LOG = '[FirebaseProvider]'

function toBase64(uint8) {
  let s = ''
  for (let i = 0; i < uint8.length; i++) s += String.fromCharCode(uint8[i])
  return btoa(s)
}

function fromBase64(b64) {
  const s = atob(b64)
  const u = new Uint8Array(s.length)
  for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i)
  return u
}

const DEBOUNCE_MS = 250

export class FirebaseProvider {
  constructor(database, roomId, ydoc, awareness) {
    this.db = database
    this.roomId = roomId
    this.ydoc = ydoc
    this.awareness = awareness
    this.clientId = ydoc.clientID

    this._updatesRef = ref(database, `rooms/${roomId}/updates_v8`)
    this._awarenessRef = ref(database, `rooms/${roomId}/awareness/${this.clientId}`)
    this._awarenessListRef = ref(database, `rooms/${roomId}/awareness`)

    this._ownKeys = new Set()
    this._pendingUpdates = []
    this._flushTimer = null
    this._destroyed = false

    this._childHandler = null
    this._awarenessHandler = null
    this._docUpdateHandler = null
    this._awarenessUpdateHandler = null

    this.whenSynced = this._init()
  }

  async _init() {
    console.log(`${LOG} Verbinde Raum: ${this.roomId}`)

    let lastKey = null
    try {
      const snap = await get(this._updatesRef)
      if (snap.exists()) {
        const updates = []
        snap.forEach(child => {
          updates.push(fromBase64(child.val()))
          lastKey = child.key
        })
        if (updates.length) {
          this.ydoc.transact(() => {
            updates.forEach(u => Y.applyUpdate(this.ydoc, u, this))
          }, this)
          console.log(`${LOG} ${updates.length} Historie-Updates geladen`)
        }
      } else {
        console.log(`${LOG} Neues Dokument`)
      }
    } catch (e) {
      console.error(`${LOG} Historie-Ladefehler:`, e)
    }

    if (this._destroyed) return

    const liveRef = lastKey
      ? query(this._updatesRef, orderByKey(), startAfter(lastKey))
      : this._updatesRef

    this._childHandler = onChildAdded(liveRef, child => {
      if (this._ownKeys.has(child.key)) {
        this._ownKeys.delete(child.key)
        return
      }
      try {
        Y.applyUpdate(this.ydoc, fromBase64(child.val()), this)
      } catch (e) {
        console.error(`${LOG} Apply-Fehler:`, e)
      }
    })

    this._docUpdateHandler = (update, origin) => {
      if (origin === this) return
      this._pendingUpdates.push(update)
      this._scheduleFlush()
    }
    this.ydoc.on('update', this._docUpdateHandler)

    if (this.awareness) this._setupAwareness()

    console.log(`${LOG} Sync bereit`)
  }

  _scheduleFlush() {
    if (this._flushTimer) return
    this._flushTimer = setTimeout(() => {
      this._flushTimer = null
      this._flush()
    }, DEBOUNCE_MS)
  }

  _flush() {
    if (!this._pendingUpdates.length || this._destroyed) return
    const merged = Y.mergeUpdates(this._pendingUpdates)
    this._pendingUpdates = []

    const newRef = push(this._updatesRef)
    this._ownKeys.add(newRef.key)
    set(newRef, toBase64(merged)).catch(e => {
      this._ownKeys.delete(newRef.key)
      console.error(`${LOG} Schreibfehler:`, e)
    })
  }

  _setupAwareness() {
    const writeLocalState = () => {
      if (this._destroyed) return
      const state = this.awareness.getLocalState()
      if (!state) {
        remove(this._awarenessRef).catch(() => {})
        return
      }
      set(this._awarenessRef, {
        clientId: this.clientId,
        state: JSON.stringify(state),
        ts: serverTimestamp(),
      }).catch(e => console.error(`${LOG} Awareness-Schreibfehler:`, e))
    }

    onDisconnect(this._awarenessRef).remove()

    this._awarenessUpdateHandler = (_changes, origin) => {
      if (origin === this) return
      writeLocalState()
    }
    this.awareness.on('update', this._awarenessUpdateHandler)
    writeLocalState()

    this._awarenessHandler = onValue(this._awarenessListRef, snap => {
      const remoteStates = new Map()
      snap.forEach(child => {
        const v = child.val()
        if (!v || v.clientId === this.clientId) return
        try {
          remoteStates.set(v.clientId, JSON.parse(v.state))
        } catch {}
      })

      // Defer: Firebase-Callbacks können mitten in einer EditorView.update feuern.
      // Ein direkter awareness.emit würde dann einen reentrant view.dispatch triggern.
      queueMicrotask(() => {
        if (this._destroyed) return
        const current = this.awareness.getStates()
        const removed = []
        const updated = []
        const added = []

        current.forEach((_, id) => {
          if (id !== this.clientId && !remoteStates.has(id)) removed.push(id)
        })
        remoteStates.forEach((state, id) => {
          if (current.has(id)) updated.push(id)
          else added.push(id)
          this.awareness.states.set(id, state)
        })
        removed.forEach(id => this.awareness.states.delete(id))

        if (added.length || updated.length || removed.length) {
          this.awareness.emit('change', [{ added, updated, removed }, this])
          this.awareness.emit('update', [{ added, updated, removed }, this])
        }
      })
    })
  }

  destroy() {
    console.log(`${LOG} Trenne Raum: ${this.roomId}`)

    if (this._flushTimer) {
      clearTimeout(this._flushTimer)
      this._flushTimer = null
    }
    this._flush()

    this._destroyed = true

    if (this._docUpdateHandler) this.ydoc.off('update', this._docUpdateHandler)
    if (this._awarenessUpdateHandler && this.awareness) {
      this.awareness.off('update', this._awarenessUpdateHandler)
    }

    off(this._updatesRef)
    off(this._awarenessListRef)
    remove(this._awarenessRef).catch(() => {})
  }
}

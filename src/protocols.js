/**
 * Protokoll-Liste in Firebase verwalten
 * /protocols/{id} → { title, createdAt }
 */
import { ref, set, get, onValue, serverTimestamp } from 'firebase/database'
import { db } from './firebase.js'

export function generateProtocolId() {
  return 'protokoll-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6)
}

export async function createProtocol(title) {
  const id = generateProtocolId()
  await set(ref(db, `protocols/${id}`), {
    title,
    createdAt: Date.now(),
  })
  return id
}

export async function loadProtocolList() {
  const snap = await get(ref(db, 'protocols'))
  if (!snap.exists()) return []
  const list = []
  snap.forEach(child => {
    list.push({ id: child.key, ...child.val() })
  })
  return list.sort((a, b) => b.createdAt - a.createdAt)
}

export function watchProtocolList(callback) {
  onValue(ref(db, 'protocols'), snap => {
    const list = []
    snap.forEach(child => {
      list.push({ id: child.key, ...child.val() })
    })
    callback(list.sort((a, b) => b.createdAt - a.createdAt))
  })
}

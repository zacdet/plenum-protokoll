import { ref, get } from 'firebase/database'
import { db } from './firebase.js'
import { getCurrentUser } from './auth.js'

const STORAGE_KEY = 'plenum-protokoll-identity'

export function getStoredIdentity() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export async function requireIdentity() {
  const user = getCurrentUser()
  const snap = await get(ref(db, `users/${user.uid}`))

  let identity
  if (snap.exists()) {
    const d = snap.val()
    identity = {
      name:     d.name     || emailName(user.email),
      initials: d.initials || emailInitials(user.email),
      color:    d.color    || '#000000',
    }
  } else {
    identity = {
      name:     emailName(user.email),
      initials: emailInitials(user.email),
      color:    '#000000',
    }
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(identity))
  return identity
}

function emailName(email) {
  return email.split('@')[0]
}

function emailInitials(email) {
  const local = email.split('@')[0]
  const parts = local.split(/[._-]/).filter(Boolean)
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase()
  }
  return local.slice(0, 2).toUpperCase()
}

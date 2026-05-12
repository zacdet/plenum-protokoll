import { signInWithEmailAndPassword, onAuthStateChanged, signOut } from 'firebase/auth'
import { auth } from './firebase.js'

const ADMIN_UID = 'VuIsaaoJTxQGIvnJE6f3LPx27cy1'

export function getCurrentUser() {
  return auth.currentUser
}

export function isAdmin() {
  return auth.currentUser?.uid === ADMIN_UID
}

export function logout() {
  return signOut(auth)
}

export function requireLogin() {
  return new Promise(resolve => {
    const unsub = onAuthStateChanged(auth, user => {
      unsub()
      if (user) {
        resolve(user)
      } else {
        showLoginModal(resolve)
      }
    })
  })
}

function showLoginModal(resolve) {
  const overlay = document.createElement('div')
  overlay.className = 'modal-overlay identity-overlay'

  overlay.innerHTML = `
    <div class="modal identity-modal">
      <div class="identity-logo">📋</div>
      <h2>Plenum Protokoll</h2>
      <p class="identity-subtitle">Melde dich mit deinen Zugangsdaten an.</p>

      <label>
        E-Mail
        <input id="login-email" type="email" placeholder="name@beispiel.de" autocomplete="email" />
      </label>

      <label>
        Passwort
        <input id="login-password" type="password" autocomplete="current-password" />
      </label>

      <p id="login-error" class="login-error" style="display:none"></p>

      <button id="login-confirm" class="btn-primary" disabled>Anmelden</button>
    </div>
  `

  document.body.appendChild(overlay)

  const emailInput   = overlay.querySelector('#login-email')
  const passwordInput = overlay.querySelector('#login-password')
  const confirmBtn   = overlay.querySelector('#login-confirm')
  const errorEl      = overlay.querySelector('#login-error')

  function validate() {
    confirmBtn.disabled = !emailInput.value.trim() || !passwordInput.value
  }

  emailInput.addEventListener('input', validate)
  passwordInput.addEventListener('input', validate)

  async function doLogin() {
    if (confirmBtn.disabled) return
    confirmBtn.disabled = true
    confirmBtn.textContent = 'Anmelden…'
    errorEl.style.display = 'none'

    try {
      const result = await signInWithEmailAndPassword(auth, emailInput.value.trim(), passwordInput.value)
      document.body.removeChild(overlay)
      resolve(result.user)
    } catch (err) {
      confirmBtn.disabled = false
      confirmBtn.textContent = 'Anmelden'
      errorEl.textContent = loginErrorMessage(err.code)
      errorEl.style.display = 'block'
      passwordInput.value = ''
      passwordInput.focus()
    }
  }

  confirmBtn.addEventListener('click', doLogin)
  overlay.addEventListener('keydown', e => { if (e.key === 'Enter') doLogin() })

  setTimeout(() => emailInput.focus(), 50)
}

function loginErrorMessage(code) {
  switch (code) {
    case 'auth/invalid-email':       return 'Ungültige E-Mail-Adresse.'
    case 'auth/user-not-found':      return 'Kein Konto mit dieser E-Mail-Adresse.'
    case 'auth/wrong-password':      return 'Falsches Passwort.'
    case 'auth/invalid-credential':  return 'E-Mail oder Passwort falsch.'
    case 'auth/too-many-requests':   return 'Zu viele Versuche. Bitte warte kurz.'
    case 'auth/user-disabled':       return 'Dieses Konto wurde deaktiviert.'
    default:                         return 'Anmeldung fehlgeschlagen. Bitte versuche es erneut.'
  }
}

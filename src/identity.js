/**
 * Nutzer-Identität: Name + Kürzel beim ersten Beitritt erfragen,
 * dauerhaft in localStorage speichern.
 */

const STORAGE_KEY = 'plenum-protokoll-identity'

const USER_COLORS = [
  '#e63946', // Rot
  '#2a9d8f', // Türkis
  '#457b9d', // Blau
  '#e9c46a', // Gelb
]

export function getStoredIdentity() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function saveIdentity(identity) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(identity))
}

/**
 * Zeigt Login-Modal falls noch keine Identität gespeichert.
 * Gibt Promise<{ name, initials, color }> zurück.
 */
export function requireIdentity() {
  const stored = getStoredIdentity()
  if (stored) return Promise.resolve(stored)
  return showIdentityModal()
}

function showIdentityModal() {
  return new Promise(resolve => {
    const overlay = document.createElement('div')
    overlay.className = 'modal-overlay identity-overlay'

    overlay.innerHTML = `
      <div class="modal identity-modal">
        <div class="identity-logo">📋</div>
        <h2>Plenum Protokoll</h2>
        <p class="identity-subtitle">Gib deinen Namen ein, damit andere wissen, wer protokolliert.</p>

        <label>
          Dein Name
          <input id="id-name" type="text" placeholder="z.B. Anna Müller" maxlength="40" autocomplete="name" />
        </label>

        <label>
          Kürzel (2–4 Zeichen)
          <input id="id-initials" type="text" placeholder="AM" maxlength="4" />
        </label>

        <div class="color-picker-label">Deine Farbe</div>
        <div class="color-picker" id="id-color-picker"></div>

        <button id="id-confirm" class="btn-primary" disabled>Beitreten</button>
      </div>
    `

    document.body.appendChild(overlay)

    const nameInput = overlay.querySelector('#id-name')
    const initialsInput = overlay.querySelector('#id-initials')
    const confirmBtn = overlay.querySelector('#id-confirm')
    const colorPicker = overlay.querySelector('#id-color-picker')

    // Farb-Auswahl rendern
    let selectedColor = USER_COLORS[0]
    USER_COLORS.forEach((color, i) => {
      const swatch = document.createElement('button')
      swatch.className = 'color-swatch' + (i === 0 ? ' selected' : '')
      swatch.style.background = color
      swatch.setAttribute('aria-label', color)
      swatch.addEventListener('click', () => {
        colorPicker.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('selected'))
        swatch.classList.add('selected')
        selectedColor = color
      })
      colorPicker.appendChild(swatch)
    })

    // Kürzel auto-befüllen aus Name
    nameInput.addEventListener('input', () => {
      const words = nameInput.value.trim().split(/\s+/).filter(Boolean)
      if (words.length >= 2) {
        initialsInput.value = (words[0][0] + words[words.length - 1][0]).toUpperCase()
      } else if (words.length === 1 && words[0].length >= 2) {
        initialsInput.value = words[0].slice(0, 2).toUpperCase()
      }
      validate()
    })

    initialsInput.addEventListener('input', validate)

    function validate() {
      const ok = nameInput.value.trim().length > 0 && initialsInput.value.trim().length > 0
      confirmBtn.disabled = !ok
    }

    confirmBtn.addEventListener('click', () => {
      const identity = {
        name: nameInput.value.trim(),
        initials: initialsInput.value.trim().toUpperCase().slice(0, 4),
        color: selectedColor,
      }
      saveIdentity(identity)
      document.body.removeChild(overlay)
      resolve(identity)
    })

    // Enter bestätigt
    overlay.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !confirmBtn.disabled) confirmBtn.click()
    })

    setTimeout(() => nameInput.focus(), 50)
  })
}

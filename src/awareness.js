/**
 * Nutzer-Präsenz: Badges, Cursor-Farben, Online-Liste
 */

export function initAwareness(awareness, identity) {
  awareness.setLocalStateField('user', {
    name: identity.name,
    initials: identity.initials,
    color: identity.color,
  })
}

export function renderUserBadges(containerEl, awareness) {
  const update = () => {
    containerEl.innerHTML = ''
    const states = awareness.getStates()

    states.forEach((state, clientId) => {
      if (!state.user) return
      const { name, initials, color } = state.user
      const isLocal = clientId === awareness.clientID

      const badge = document.createElement('div')
      badge.className = 'user-badge' + (isLocal ? ' local' : '')
      badge.title = name + (isLocal ? ' (du)' : '')
      badge.style.setProperty('--badge-color', color)
      badge.textContent = initials
      containerEl.appendChild(badge)
    })

    if (states.size > 4) {
      import('./export.js').then(({ showToast }) => {
        showToast('Mehr als 4 Nutzer im Raum!', 'warning')
      })
    }
  }

  awareness.on('change', update)
  update()
}

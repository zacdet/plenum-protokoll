/**
 * Nutzer-Badges aus Firebase-Präsenz rendern
 */
export function renderUserBadges(containerEl, users) {
  containerEl.innerHTML = ''
  users.forEach(({ name, initials, color, isLocal }) => {
    const badge = document.createElement('div')
    badge.className = 'user-badge' + (isLocal ? ' local' : '')
    badge.title = name + (isLocal ? ' (du)' : '')
    badge.style.setProperty('--badge-color', color)
    badge.textContent = initials
    containerEl.appendChild(badge)
  })
}

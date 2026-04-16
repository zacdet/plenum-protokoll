/**
 * Protokoll-Selektor: Dropdown mit Liste + "Neues Protokoll"-Button
 */
import { createProtocol, watchProtocolList } from './protocols.js'
import { showToast } from './export.js'

export function initProtocolSelector(containerEl, currentId, onSwitch) {
  let protocols = []
  let open = false

  // Wrapper
  const wrapper = document.createElement('div')
  wrapper.className = 'protocol-selector'

  const trigger = document.createElement('button')
  trigger.className = 'protocol-trigger'
  trigger.innerHTML = '<span id="protocol-title-label">Lade…</span> <span class="caret">▾</span>'

  const dropdown = document.createElement('div')
  dropdown.className = 'protocol-dropdown hidden'

  wrapper.appendChild(trigger)
  wrapper.appendChild(dropdown)
  containerEl.appendChild(wrapper)

  // Dropdown öffnen/schließen
  trigger.addEventListener('click', () => {
    open = !open
    dropdown.classList.toggle('hidden', !open)
  })

  document.addEventListener('click', e => {
    if (!wrapper.contains(e.target)) {
      open = false
      dropdown.classList.add('hidden')
    }
  })

  // Live-Liste aus Firebase
  watchProtocolList(list => {
    protocols = list
    renderDropdown(list)
    const current = list.find(p => p.id === currentId)
    document.getElementById('protocol-title-label').textContent =
      current ? current.title : currentId
  })

  function renderDropdown(list) {
    dropdown.innerHTML = ''

    // "Neues Protokoll"-Button
    const newBtn = document.createElement('button')
    newBtn.className = 'protocol-new-btn'
    newBtn.textContent = '+ Neues Protokoll'
    newBtn.addEventListener('click', () => handleNew())
    dropdown.appendChild(newBtn)

    if (list.length > 0) {
      const divider = document.createElement('div')
      divider.className = 'protocol-divider'
      dropdown.appendChild(divider)
    }

    list.forEach(protocol => {
      const item = document.createElement('button')
      item.className = 'protocol-item' + (protocol.id === currentId ? ' active' : '')
      item.innerHTML = `
        <span class="protocol-item-title">${escapeHtml(protocol.title)}</span>
        <span class="protocol-item-date">${formatDate(protocol.createdAt)}</span>
      `
      item.addEventListener('click', () => {
        dropdown.classList.add('hidden')
        open = false
        onSwitch(protocol.id)
      })
      dropdown.appendChild(item)
    })
  }

  async function handleNew() {
    dropdown.classList.add('hidden')
    open = false

    const defaultTitle = 'Plenum ' + new Date().toLocaleDateString('de-DE')
    const title = await promptTitle(defaultTitle)
    if (!title) return

    const id = await createProtocol(title)
    showToast(`"${title}" erstellt`)
    onSwitch(id)
  }
}

function promptTitle(defaultValue) {
  return new Promise(resolve => {
    const overlay = document.createElement('div')
    overlay.className = 'modal-overlay'
    overlay.innerHTML = `
      <div class="modal">
        <h2>Neues Protokoll</h2>
        <label>
          Titel
          <input id="new-protocol-title" type="text" value="${escapeHtml(defaultValue)}" maxlength="80" />
        </label>
        <div class="modal-actions">
          <button class="btn-secondary" id="new-cancel">Abbrechen</button>
          <button class="btn-primary" id="new-confirm">Erstellen</button>
        </div>
      </div>
    `
    document.body.appendChild(overlay)
    const input = overlay.querySelector('#new-protocol-title')
    setTimeout(() => { input.focus(); input.select() }, 50)

    overlay.querySelector('#new-confirm').addEventListener('click', () => {
      const val = input.value.trim()
      document.body.removeChild(overlay)
      resolve(val || null)
    })
    overlay.querySelector('#new-cancel').addEventListener('click', () => {
      document.body.removeChild(overlay)
      resolve(null)
    })
    overlay.addEventListener('keydown', e => {
      if (e.key === 'Enter') overlay.querySelector('#new-confirm').click()
      if (e.key === 'Escape') overlay.querySelector('#new-cancel').click()
    })
  })
}

function formatDate(ts) {
  return new Date(ts).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function escapeHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

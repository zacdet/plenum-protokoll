import { createProtocol, watchProtocolList } from './protocols.js'
import { showToast } from './export.js'

export function initProtocolSelector(containerEl, initialId, onSwitch) {
  containerEl.innerHTML = ''

  let currentId = initialId
  let open = false

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

  trigger.addEventListener('click', e => {
    e.stopPropagation()
    open = !open
    dropdown.classList.toggle('hidden', !open)
  })

  document.addEventListener('click', () => {
    open = false
    dropdown.classList.add('hidden')
  })

  // currentId von außen aktualisieren (nach Protokollwechsel)
  function setCurrentId(id) {
    currentId = id
    const labelEl = document.getElementById('protocol-title-label')
    if (labelEl) {
      // Titel aus der aktuellen Liste suchen
      const btn = dropdown.querySelector(`.protocol-item[data-id="${id}"]`)
      labelEl.textContent = btn
        ? btn.querySelector('.protocol-item-title')?.textContent || id
        : id
    }
    // Aktiv-Markierung aktualisieren
    dropdown.querySelectorAll('.protocol-item').forEach(el => {
      el.classList.toggle('active', el.dataset.id === id)
    })
  }

  watchProtocolList(list => {
    renderDropdown(list)
    const current = list.find(p => p.id === currentId)
    const labelEl = document.getElementById('protocol-title-label')
    if (labelEl) labelEl.textContent = current ? current.title : currentId
  })

  function renderDropdown(list) {
    dropdown.innerHTML = ''

    const newBtn = document.createElement('button')
    newBtn.className = 'protocol-new-btn'
    newBtn.textContent = '+ Neues Protokoll'
    newBtn.addEventListener('click', e => { e.stopPropagation(); handleNew() })
    dropdown.appendChild(newBtn)

    if (list.length > 0) {
      const div = document.createElement('div')
      div.className = 'protocol-divider'
      dropdown.appendChild(div)
    }

    list.forEach(protocol => {
      const item = document.createElement('button')
      item.className = 'protocol-item' + (protocol.id === currentId ? ' active' : '')
      item.dataset.id = protocol.id
      item.innerHTML = `
        <span class="protocol-item-title">${esc(protocol.title)}</span>
        <span class="protocol-item-date">${fmtDate(protocol.createdAt)}</span>
      `
      item.addEventListener('click', e => {
        e.stopPropagation()
        dropdown.classList.add('hidden')
        open = false
        if (protocol.id !== currentId) {
          setCurrentId(protocol.id)
          onSwitch(protocol.id)
        }
      })
      dropdown.appendChild(item)
    })
  }

  async function handleNew() {
    dropdown.classList.add('hidden')
    open = false

    const title = await promptTitle('Plenum ' + new Date().toLocaleDateString('de-DE'))
    if (!title) return

    const id = await createProtocol(title)
    showToast(`"${title}" erstellt`)
    setCurrentId(id)
    onSwitch(id)
  }

  // Gibt Funktion zurück um currentId von außen zu setzen
  return setCurrentId
}

function promptTitle(defaultValue) {
  return new Promise(resolve => {
    const overlay = document.createElement('div')
    overlay.className = 'modal-overlay'
    overlay.innerHTML = `
      <div class="modal">
        <h2>Neues Protokoll</h2>
        <label>Titel<input id="new-proto-title" type="text" value="${esc(defaultValue)}" maxlength="80" /></label>
        <div class="modal-actions">
          <button class="btn-secondary" id="np-cancel">Abbrechen</button>
          <button class="btn-primary" id="np-confirm">Erstellen</button>
        </div>
      </div>
    `
    document.body.appendChild(overlay)
    const input = overlay.querySelector('#new-proto-title')
    setTimeout(() => { input.focus(); input.select() }, 50)

    overlay.querySelector('#np-confirm').onclick = () => {
      document.body.removeChild(overlay)
      resolve(input.value.trim() || null)
    }
    overlay.querySelector('#np-cancel').onclick = () => {
      document.body.removeChild(overlay)
      resolve(null)
    }
    overlay.addEventListener('keydown', e => {
      if (e.key === 'Enter')  overlay.querySelector('#np-confirm').click()
      if (e.key === 'Escape') overlay.querySelector('#np-cancel').click()
    })
  })
}

function fmtDate(ts) {
  return new Date(ts).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function esc(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

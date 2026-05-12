import { createProtocol, deleteProtocol, watchProtocolList } from './protocols.js'
import { showToast, downloadWiki } from './export.js'

export function initProtocolSelector(containerEl, initialId, onSwitch, isAdmin = false) {
  containerEl.innerHTML = ''

  let currentId = initialId
  let currentList = []
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

  function setCurrentId(id) {
    currentId = id
    const labelEl = document.getElementById('protocol-title-label')
    if (labelEl) {
      const item = dropdown.querySelector(`.protocol-item[data-id="${id}"]`)
      labelEl.textContent = item
        ? item.querySelector('.protocol-item-title')?.textContent || id
        : id
    }
    dropdown.querySelectorAll('.protocol-item').forEach(el => {
      el.classList.toggle('active', el.dataset.id === id)
    })
  }

  watchProtocolList(list => {
    currentList = list
    renderDropdown(list)
    const current = list.find(p => p.id === currentId && !p.isBackup)
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

    const regular = list.filter(p => !p.isBackup)
    const backups  = list.filter(p =>  p.isBackup)

    if (regular.length > 0) {
      dropdown.appendChild(dividerEl())
      regular.forEach(protocol => dropdown.appendChild(editableItem(protocol)))
    }

    if (backups.length > 0) {
      dropdown.appendChild(dividerEl())
      const lbl = document.createElement('div')
      lbl.className = 'protocol-section-label'
      lbl.textContent = 'Backups'
      dropdown.appendChild(lbl)
      backups.forEach(protocol => dropdown.appendChild(backupItem(protocol)))
    }
  }

  function dividerEl() {
    const d = document.createElement('div')
    d.className = 'protocol-divider'
    return d
  }

  function editableItem(protocol) {
    const item = document.createElement('div')
    item.className = 'protocol-item' + (protocol.id === currentId ? ' active' : '')
    item.dataset.id = protocol.id

    const body = document.createElement('div')
    body.className = 'protocol-item-body'
    body.innerHTML = `
      <span class="protocol-item-title">${esc(protocol.title)}</span>
      <span class="protocol-item-date">${fmtDate(protocol.createdAt)}</span>
    `
    item.appendChild(body)

    item.addEventListener('click', e => {
      e.stopPropagation()
      dropdown.classList.add('hidden')
      open = false
      if (protocol.id !== currentId) {
        setCurrentId(protocol.id)
        onSwitch(protocol.id)
      }
    })

    if (isAdmin) {
      item.appendChild(makeDeleteButton(protocol.title, async () => {
        const wasActive = protocol.id === currentId
        await deleteProtocol(protocol.id)
        if (wasActive) {
          const remaining = currentList.filter(p => !p.isBackup && p.id !== protocol.id)
          if (remaining.length > 0) {
            setCurrentId(remaining[0].id)
            onSwitch(remaining[0].id)
          } else {
            const newId = await createProtocol('Plenum ' + new Date().toLocaleDateString('de-DE'))
            setCurrentId(newId)
            onSwitch(newId)
          }
        }
      }))
    }

    return item
  }

  function backupItem(protocol) {
    const item = document.createElement('div')
    item.className = 'protocol-item protocol-item--backup'
    item.dataset.id = protocol.id

    const body = document.createElement('div')
    body.className = 'protocol-item-body'
    body.innerHTML = `
      <span class="protocol-item-title">⬇ ${esc(protocol.title)}</span>
      <span class="protocol-item-date">${fmtDateTime(protocol.createdAt)}</span>
    `
    item.appendChild(body)

    item.addEventListener('click', e => {
      e.stopPropagation()
      dropdown.classList.add('hidden')
      open = false
      downloadWiki(protocol.snapshotContent || '', protocol.id)
    })

    if (isAdmin) {
      item.appendChild(makeDeleteButton(protocol.title, () => deleteProtocol(protocol.id)))
    }

    return item
  }

  function makeDeleteButton(title, onConfirm) {
    const btn = document.createElement('button')
    btn.className = 'protocol-delete-btn'
    btn.title = 'Löschen'
    btn.textContent = '✕'
    btn.addEventListener('click', async e => {
      e.stopPropagation()
      dropdown.classList.add('hidden')
      open = false
      if (await confirmDelete(title)) await onConfirm()
    })
    return btn
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

  return setCurrentId
}

function confirmDelete(title) {
  return new Promise(resolve => {
    const overlay = document.createElement('div')
    overlay.className = 'modal-overlay'
    overlay.innerHTML = `
      <div class="modal">
        <h2>Wirklich löschen?</h2>
        <p class="confirm-delete-text">
          <strong>${esc(title)}</strong> wird dauerhaft gelöscht. Das kann nicht rückgängig gemacht werden.
        </p>
        <div class="modal-actions">
          <button class="btn-secondary" id="del-cancel">Abbrechen</button>
          <button class="btn-danger" id="del-confirm">Löschen</button>
        </div>
      </div>
    `
    document.body.appendChild(overlay)

    const done = (result) => {
      document.body.removeChild(overlay)
      resolve(result)
    }

    overlay.querySelector('#del-confirm').addEventListener('click', () => done(true))
    overlay.querySelector('#del-cancel').addEventListener('click',  () => done(false))
    overlay.addEventListener('keydown', e => {
      if (e.key === 'Escape') done(false)
    })

    setTimeout(() => overlay.querySelector('#del-cancel').focus(), 50)
  })
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

function fmtDateTime(ts) {
  return new Date(ts).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function esc(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

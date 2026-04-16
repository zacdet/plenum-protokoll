import { TEMPLATE_GROUPS } from './templates/index.js'

let _editor = null

export function initToolbar(containerEl, editor) {
  _editor = editor
  containerEl.innerHTML = ''

  TEMPLATE_GROUPS.forEach(group => {
    const groupEl = document.createElement('div')
    groupEl.className = 'toolbar-group'

    const label = document.createElement('span')
    label.className = 'toolbar-group-label'
    label.textContent = group.label
    groupEl.appendChild(label)

    group.buttons.forEach(btn => {
      const button = document.createElement('button')
      button.className = 'toolbar-btn'
      button.textContent = btn.label
      button.title = btn.tooltip || btn.label
      button.addEventListener('click', () => handleClick(btn))
      groupEl.appendChild(button)
    })

    containerEl.appendChild(groupEl)
  })
}

async function handleClick(btn) {
  if (!_editor) return

  // Direkter TipTap-Befehl
  if (btn.cmd) {
    btn.cmd(_editor)
    return
  }

  // Template mit Parametern
  if (btn.prompt?.length) {
    const params = await showPromptModal(btn.label, btn.prompt)
    if (params === null) return
    const content = btn.template(params)
    _editor.chain().focus().insertContent(btn.isJson ? content : content).run()
    return
  }

  // Template ohne Parameter
  const content = btn.template({})
  _editor.chain().focus().insertContent(content).run()
}

function showPromptModal(title, fields) {
  return new Promise(resolve => {
    const overlay = document.createElement('div')
    overlay.className = 'modal-overlay'

    const modal = document.createElement('div')
    modal.className = 'modal'
    modal.innerHTML = `<h2>${title}</h2>`

    const inputs = {}
    fields.forEach(f => {
      const label = document.createElement('label')
      label.textContent = f.label
      const input = document.createElement('input')
      input.type = 'text'
      input.value = f.default || ''
      input.placeholder = f.label
      inputs[f.key] = input
      label.appendChild(input)
      modal.appendChild(label)
    })

    const actions = document.createElement('div')
    actions.className = 'modal-actions'

    const cancelBtn = document.createElement('button')
    cancelBtn.textContent = 'Abbrechen'
    cancelBtn.className = 'btn-secondary'
    cancelBtn.onclick = () => { document.body.removeChild(overlay); resolve(null) }

    const confirmBtn = document.createElement('button')
    confirmBtn.textContent = 'Einfügen'
    confirmBtn.className = 'btn-primary'
    confirmBtn.onclick = () => {
      const params = {}
      fields.forEach(f => { params[f.key] = inputs[f.key].value })
      document.body.removeChild(overlay)
      resolve(params)
    }

    modal.addEventListener('keydown', e => {
      if (e.key === 'Enter' && e.target.tagName === 'INPUT') confirmBtn.click()
      if (e.key === 'Escape') cancelBtn.click()
    })

    actions.appendChild(cancelBtn)
    actions.appendChild(confirmBtn)
    modal.appendChild(actions)
    overlay.appendChild(modal)
    document.body.appendChild(overlay)

    setTimeout(() => modal.querySelector('input')?.focus(), 50)
  })
}

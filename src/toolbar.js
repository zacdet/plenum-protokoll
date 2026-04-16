/**
 * Toolbar: Buttons für alle Protokoll-Elemente
 */
import { TEMPLATE_GROUPS } from './templates/index.js'
import { insertAtCursor } from './editor.js'

let _editorView = null

export function initToolbar(containerEl, editorView) {
  _editorView = editorView

  TEMPLATE_GROUPS.forEach(group => {
    const groupEl = document.createElement('div')
    groupEl.className = 'toolbar-group'

    const labelEl = document.createElement('span')
    labelEl.className = 'toolbar-group-label'
    labelEl.textContent = group.label
    groupEl.appendChild(labelEl)

    group.buttons.forEach(btn => {
      const button = document.createElement('button')
      button.className = 'toolbar-btn'
      button.textContent = btn.label
      button.title = btn.label
      button.addEventListener('click', () => handleButtonClick(btn))
      groupEl.appendChild(button)
    })

    containerEl.appendChild(groupEl)
  })
}

async function handleButtonClick(btn) {
  if (btn.prompt && btn.prompt.length > 0) {
    const params = await showPromptModal(btn.label, btn.prompt)
    if (params === null) return // Abgebrochen
    const text = btn.template(params)
    insertAtCursor(_editorView, text)
  } else {
    const text = btn.template({})
    insertAtCursor(_editorView, text)
  }
}

function showPromptModal(title, fields) {
  return new Promise(resolve => {
    const overlay = document.createElement('div')
    overlay.className = 'modal-overlay'

    const modal = document.createElement('div')
    modal.className = 'modal'

    const h2 = document.createElement('h2')
    h2.textContent = title
    modal.appendChild(h2)

    const inputs = {}
    fields.forEach(field => {
      const label = document.createElement('label')
      label.textContent = field.label

      const input = document.createElement('input')
      input.type = 'text'
      input.value = field.default || ''
      input.placeholder = field.label
      inputs[field.key] = input

      label.appendChild(input)
      modal.appendChild(label)
    })

    const actions = document.createElement('div')
    actions.className = 'modal-actions'

    const cancelBtn = document.createElement('button')
    cancelBtn.textContent = 'Abbrechen'
    cancelBtn.className = 'btn-secondary'
    cancelBtn.addEventListener('click', () => {
      document.body.removeChild(overlay)
      resolve(null)
    })

    const confirmBtn = document.createElement('button')
    confirmBtn.textContent = 'Einfügen'
    confirmBtn.className = 'btn-primary'
    confirmBtn.addEventListener('click', () => {
      const params = {}
      fields.forEach(f => { params[f.key] = inputs[f.key].value })
      document.body.removeChild(overlay)
      resolve(params)
    })

    // Enter bestätigt
    modal.addEventListener('keydown', e => {
      if (e.key === 'Enter' && e.target.tagName === 'INPUT') confirmBtn.click()
      if (e.key === 'Escape') cancelBtn.click()
    })

    actions.appendChild(cancelBtn)
    actions.appendChild(confirmBtn)
    modal.appendChild(actions)
    overlay.appendChild(modal)
    document.body.appendChild(overlay)

    // Erstes Input-Feld fokussieren
    const firstInput = modal.querySelector('input')
    if (firstInput) setTimeout(() => firstInput.focus(), 50)
  })
}

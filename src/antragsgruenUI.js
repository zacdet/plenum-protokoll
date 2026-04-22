
import { fetchAmendments, fetchAmendmentDetails } from './antragsgruen.js'

let _editor = null
let _consultationUrl = localStorage.getItem('antragsgruen-url') || 'https://antragstool.bufak-wiwi.org/index.php?consultationPath=bufak-bremen'

export function initAntragsgruenUI(editor) {
  _editor = editor
}

export async function showAmendmentsModal() {
  if (!_consultationUrl) {
    const url = prompt('Bitte Antragsgrün Consultation URL eingeben:', 'https://antragstool.bufak-wiwi.org/index.php?consultationPath=bufak-bremen')
    if (!url) return
    _consultationUrl = url
    localStorage.setItem('antragsgruen-url', url)
  }

  const overlay = document.createElement('div')
  overlay.className = 'modal-overlay'

  const modal = document.createElement('div')
  modal.className = 'modal modal-large'
  modal.innerHTML = `
    <h2>Antragsgrün Änderungsanträge</h2>
    <div class="modal-search">
      <input type="text" id="ag-search" placeholder="Suchen..." autofocus>
      <button id="ag-refresh" class="btn-secondary">Aktualisieren</button>
      <button id="ag-config" class="btn-secondary" title="URL konfigurieren">⚙️</button>
    </div>
    <div id="ag-list" class="ag-list">
      <div class="loading">Lade Anträge...</div>
    </div>
    <div class="modal-actions">
      <button id="ag-close" class="btn-secondary">Schließen</button>
    </div>
  `

  overlay.appendChild(modal)
  document.body.appendChild(overlay)

  const listEl = modal.querySelector('#ag-list')
  const searchInput = modal.querySelector('#ag-search')
  let allAmendments = []

  const renderList = (filter = '') => {
    const filtered = allAmendments.filter(a => 
      a.fullTitle.toLowerCase().includes(filter.toLowerCase()) ||
      a.motionTitle.toLowerCase().includes(filter.toLowerCase())
    )
    
    if (filtered.length === 0) {
      listEl.innerHTML = '<div class="empty">Keine Anträge gefunden</div>'
      return
    }

    listEl.innerHTML = filtered.map(a => `
      <div class="ag-item" data-url="${a.url}">
        <div class="ag-item-id">${a.id}</div>
        <div class="ag-item-content">
          <div class="ag-item-title">${a.motionTitle}</div>
          <div class="ag-item-subtitle">${a.id}</div>
        </div>
        <button class="ag-item-insert btn-primary">Einfügen</button>
      </div>
    `).join('')

    listEl.querySelectorAll('.ag-item-insert').forEach((btn, idx) => {
      btn.onclick = () => insertAmendment(filtered[idx].url)
    })
  }

  const loadData = async () => {
    listEl.innerHTML = '<div class="loading">Lade Anträge...</div>'
    try {
      allAmendments = await fetchAmendments(_consultationUrl)
      renderList(searchInput.value)
    } catch (err) {
      listEl.innerHTML = `<div class="error">Fehler beim Laden: ${err.message}</div>`
    }
  }

  modal.querySelector('#ag-refresh').onclick = loadData
  modal.querySelector('#ag-close').onclick = () => document.body.removeChild(overlay)
  modal.querySelector('#ag-config').onclick = () => {
    const newUrl = prompt('Antragsgrün Consultation URL:', _consultationUrl)
    if (newUrl) {
      _consultationUrl = newUrl
      localStorage.setItem('antragsgruen-url', newUrl)
      loadData()
    }
  }

  searchInput.oninput = (e) => renderList(e.target.value)

  loadData()
}

async function insertAmendment(url) {
  if (!_editor) return
  
  // Show loading state or toast
  const details = await fetchAmendmentDetails(url)
  
  // Template format from templates/index.js
  const content = [
    {
      type: 'paragraph',
      content: [{ type: 'text', text: '{{Änderungsantrag' }]
    },
    {
      type: 'paragraph',
      content: [{ type: 'text', text: `|1=${details.title}` }]
    },
    {
      type: 'paragraph',
      content: [{ type: 'text', text: `|2=${details.instructions}` }]
    },
    {
      type: 'paragraph',
      content: [{ type: 'text', text: `|3=${details.reasoning}` }]
    },
    {
      type: 'paragraph',
      content: [{ type: 'text', text: '|4=Abstimmung: Der Änderungsantrag wurde mit Ja: X Nein: Y Enthaltung: Z angenommen' }]
    },
    {
      type: 'paragraph',
      content: [{ type: 'text', text: '}}' }]
    },
    { type: 'paragraph' }
  ]

  _editor.chain().focus().insertContent(content).run()
}

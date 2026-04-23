
import { fetchAllMotions, fetchAllAmendments, fetchFullMotionData, fetchAmendmentDetails } from './antragsgruen.js'

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
    <h2>Antragsgrün Anträge & Änderungen</h2>
    <div class="modal-tabs">
      <button class="tab-btn active" data-tab="amendments">Änderungsanträge</button>
      <button class="tab-btn" data-tab="motions">Hauptanträge</button>
    </div>
    <div class="modal-search">
      <input type="text" id="ag-search" placeholder="Suchen..." autofocus>
      <button id="ag-refresh" class="btn-secondary">Aktualisieren</button>
      <button id="ag-config" class="btn-secondary" title="URL konfigurieren">⚙️</button>
    </div>
    <div id="ag-list" class="ag-list">
      <div class="loading">Lade Daten...</div>
    </div>
    <div class="modal-actions">
      <button id="ag-close" class="btn-secondary">Schließen</button>
    </div>
  `

  overlay.appendChild(modal)
  document.body.appendChild(overlay)

  const listEl = modal.querySelector('#ag-list')
  const searchInput = modal.querySelector('#ag-search')
  let allMotions = []
  let allAmendments = []
  let currentTab = 'amendments'

  const renderList = (filter = '') => {
    const items = currentTab === 'amendments' ? allAmendments : allMotions
    const filtered = items.filter(m => 
      m.fullTitle.toLowerCase().includes(filter.toLowerCase())
    )
    
    if (filtered.length === 0) {
      listEl.innerHTML = '<div class="empty">Keine Einträge gefunden</div>'
      return
    }

    listEl.innerHTML = filtered.map(m => `
      <div class="ag-item">
        <div class="ag-item-id">${m.id}</div>
        <div class="ag-item-content">
          <div class="ag-item-title">${currentTab === 'amendments' ? m.id : m.title}</div>
          <div class="ag-item-subtitle">${m.fullTitle}</div>
        </div>
        <button class="ag-item-insert btn-primary">${currentTab === 'amendments' ? 'Einfügen' : 'Gesamtpaket einfügen'}</button>
      </div>
    `).join('')

    listEl.querySelectorAll('.ag-item-insert').forEach((btn, idx) => {
      btn.onclick = async () => {
        btn.disabled = true
        btn.textContent = 'Lädt...'
        if (currentTab === 'amendments') {
          await insertSingleAmendment(filtered[idx].url)
        } else {
          await insertFullMotion(filtered[idx].url)
        }
        document.body.removeChild(overlay)
      }
    })
  }

  const loadData = async () => {
    listEl.innerHTML = '<div class="loading">Lade Anträge und Änderungen...</div>'
    try {
      [allMotions, allAmendments] = await Promise.all([
        fetchAllMotions(_consultationUrl),
        fetchAllAmendments(_consultationUrl)
      ])
      renderList(searchInput.value)
    } catch (err) {
      listEl.innerHTML = `<div class="error">Fehler beim Laden: ${err.message}</div>`
    }
  }

  modal.querySelectorAll('.tab-btn').forEach(btn => {
    btn.onclick = () => {
      modal.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'))
      btn.classList.add('active')
      currentTab = btn.dataset.tab
      renderList(searchInput.value)
    }
  })

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

async function insertSingleAmendment(url) {
  if (!_editor) return
  const am = await fetchAmendmentDetails(url)
  
  const lines = [
    `'''${am.title.split(':')[0].trim()}'''`,
    '{{Änderungsantrag',
    `|1=${am.applicant || 'Antragsteller'}`,
    `|2=${am.instructions}`,
    `|3=${am.reasoning}`,
    '|4=Abstimmung: ',
    '}}'
  ]

  insertLines(lines)
}

async function insertFullMotion(url) {
  if (!_editor) return
  const data = await fetchFullMotionData(url)
  
  const lines = []
  lines.push(`=== ${data.id}: ${data.title} ===`)
  lines.push('{{Antrag')
  lines.push(`|1=${data.applicant || 'Antragsteller'}`)
  lines.push(`|2=${data.text}`)
  lines.push('')

  // Amendments inside parameter 2
  data.amendments.forEach(am => {
    lines.push(`'''${am.id}'''`)
    lines.push('{{Änderungsantrag')
    lines.push(`|1=${am.applicant || 'Antragsteller'}`)
    lines.push(`|2=${am.instructions}`)
    lines.push(`|3=${am.reasoning}`)
    lines.push('|4=Abstimmung: ')
    lines.push('}}')
    lines.push('')
  })

  lines.push(`|3=${data.reasoning}`)
  lines.push('|4=DISKUSSION ZUM ANTRAG:')
  lines.push('* ')
  lines.push('|5=Abstimmung: ')
  lines.push('}}')

  insertLines(lines)
}

function insertLines(lines) {
  const content = lines.map(line => ({
    type: 'paragraph',
    content: line ? [{ type: 'text', text: line }] : []
  }))
  _editor.chain().focus().insertContent(content).run()
}

import { fetchConsultationData, fetchFullMotionData, fetchAmendmentDetails, prefetch } from './antragsgruen.js'
import { showToast } from './export.js'

let _editor = null
const DEFAULT_URL = 'https://antragstool.bufak-wiwi.org/index.php?consultationPath=bufak-bremen'
let _consultationUrl = localStorage.getItem('antragsgruen-url') || DEFAULT_URL

export function initAntragsgruenUI(editor) {
  _editor = editor
}

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ))
}

export async function showAmendmentsModal() {
  if (!_consultationUrl) {
    const url = prompt('Bitte Antragsgrün Consultation URL eingeben:', DEFAULT_URL)
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

  const closeModal = () => { if (overlay.parentNode) document.body.removeChild(overlay) }

  const listEl = modal.querySelector('#ag-list')
  const searchInput = modal.querySelector('#ag-search')
  let allMotions = []
  let allAmendments = []
  let currentTab = 'amendments'

  const renderList = (filter = '') => {
    const items = currentTab === 'amendments' ? allAmendments : allMotions
    const q = filter.toLowerCase()
    const filtered = items.filter(m => m.fullTitle.toLowerCase().includes(q))

    if (!filtered.length) {
      listEl.innerHTML = '<div class="empty">Keine Einträge gefunden</div>'
      return
    }

    const isAmendments = currentTab === 'amendments'
    listEl.innerHTML = filtered.map(m => `
      <div class="ag-item">
        <div class="ag-item-id${isAmendments ? ' amendment' : ''}">${escapeHtml(isAmendments ? `${m.id} zu ${m.motionPrefix}` : m.id)}</div>
        <div class="ag-item-content">
          <div class="ag-item-title">${escapeHtml(isAmendments ? m.fullTitle : m.title)}</div>
          <div class="ag-item-subtitle">${escapeHtml(isAmendments ? m.motionTitle : m.id)}</div>
        </div>
        <button class="ag-item-insert btn-primary">Einfügen</button>
      </div>
    `).join('')

    listEl.querySelectorAll('.ag-item').forEach((itemEl, idx) => {
      const m = filtered[idx]
      itemEl.addEventListener('mouseenter', () => prefetch(m.url), { once: true })

      const btn = itemEl.querySelector('.ag-item-insert')
      btn.onclick = async () => {
        btn.disabled = true
        btn.textContent = 'Lädt…'
        try {
          if (currentTab === 'amendments') await insertSingleAmendment(m.url)
          else await insertFullMotion(m.url)
          closeModal()
        } catch (e) {
          btn.disabled = false
          btn.textContent = 'Einfügen'
          showToast('Einfügen fehlgeschlagen: ' + e.message, 'error')
        }
      }
    })
  }

  const loadData = async () => {
    listEl.innerHTML = '<div class="loading">Lade Anträge und Änderungen…</div>'
    try {
      const data = await fetchConsultationData(_consultationUrl)
      allMotions = data.motions
      allAmendments = data.amendments
      renderList(searchInput.value)
    } catch (err) {
      const msg = (err.name === 'AbortError' || err.name === 'TimeoutError' || err.message?.includes('aborted'))
        ? 'Zeitüberschreitung – bitte erneut versuchen (Aktualisieren im Modal)'
        : err.message
      listEl.innerHTML = `<div class="error">Fehler beim Laden: ${escapeHtml(msg)}</div>`
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
  modal.querySelector('#ag-close').onclick = closeModal
  modal.querySelector('#ag-config').onclick = () => {
    const newUrl = prompt('Antragsgrün Consultation URL:', _consultationUrl)
    if (newUrl) {
      _consultationUrl = newUrl
      localStorage.setItem('antragsgruen-url', newUrl)
      loadData()
    }
  }

  searchInput.oninput = e => renderList(e.target.value)

  loadData()
}

// ─── Insert helpers ──────────────────────────────────────────────────────────
// Content is inserted as plain paragraphs; the editor's appendTransaction plugins
// auto-convert `=== title ===` → heading and `* item` → bullet list.

function linesToParagraphs(lines) {
  return lines.map(line => ({
    type: 'paragraph',
    content: line ? [{ type: 'text', text: line }] : [],
  }))
}

async function insertSingleAmendment(url) {
  if (!_editor) return
  const am = await fetchAmendmentDetails(url)
  _editor.chain().focus().insertContent(linesToParagraphs([
    `'''${am.id}'''`,
    '{{Änderungsantrag',
    `|1=${am.applicant || 'N.N.'}`,
    `|2=${am.instructions}`,
    `|3=${am.reasoning || 'keiner'}`,
    '|4=Abstimmung: ',
    '}}',
  ])).run()
}

async function insertFullMotion(url) {
  if (!_editor) return
  const data = await fetchFullMotionData(url)

  const lines = [
    `=== ${data.id}: ${data.title} ===`,
    '{{Antrag',
    `|1=${data.applicant || 'N.N.'}`,
    `|2=${data.text}`,
    '',
  ]

  for (const am of data.amendments) {
    lines.push(
      `'''${am.id}'''`,
      '{{Änderungsantrag',
      `|1=${am.applicant || 'N.N.'}`,
      `|2=${am.instructions}`,
      `|3=${am.reasoning || 'keiner'}`,
      '|4=Abstimmung: ',
      '}}',
      '',
    )
  }

  lines.push(
    `|3=${data.reasoning}`,
    '|4=DISKUSSION ZUM ANTRAG:',
    '* ',
    '|5=Abstimmung: ',
    '}}',
    '',
  )

  _editor.chain().focus().insertContent(linesToParagraphs(lines)).run()
}

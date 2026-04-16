/**
 * MediaWiki → HTML Preview (vereinfachter Renderer)
 */

export function renderMediaWiki(wikitext) {
  let t = wikitext

  // Zeilen einzeln verarbeiten für Listen und Einrückungen
  const lines = t.split('\n')
  const out = []
  let inUl = false, inOl = false

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i]

    // Überschriften
    if (/^======(.+?)======\s*$/.test(line)) { closeLists(); out.push(`<h6>${md(line.replace(/^======(.+?)======\s*$/, '$1'))}</h6>`); continue }
    if (/^=====(.+?)=====\s*$/.test(line))  { closeLists(); out.push(`<h5>${md(line.replace(/^=====(.+?)=====\s*$/, '$1'))}</h5>`); continue }
    if (/^====(.+?)====\s*$/.test(line))    { closeLists(); out.push(`<h4>${md(line.replace(/^====(.+?)====\s*$/, '$1'))}</h4>`); continue }
    if (/^===(.+?)===\s*$/.test(line))      { closeLists(); out.push(`<h3>${md(line.replace(/^===(.+?)===\s*$/, '$1'))}</h3>`); continue }
    if (/^==(.+?)==\s*$/.test(line))        { closeLists(); out.push(`<h2>${md(line.replace(/^==(.+?)==\s*$/, '$1'))}</h2>`); continue }
    if (/^=(.+?)=\s*$/.test(line))          { closeLists(); out.push(`<h1>${md(line.replace(/^=(.+?)=\s*$/, '$1'))}</h1>`); continue }

    // Horizontale Linie
    if (/^----/.test(line)) { closeLists(); out.push('<hr>'); continue }

    // Ungeordnete Liste
    if (/^\*(.+)/.test(line)) {
      if (!inUl) { if (inOl) { out.push('</ol>'); inOl = false } out.push('<ul>'); inUl = true }
      out.push(`<li>${md(line.replace(/^\*\s*/, ''))}</li>`)
      continue
    }

    // Geordnete Liste
    if (/^#(.+)/.test(line)) {
      if (!inOl) { if (inUl) { out.push('</ul>'); inUl = false } out.push('<ol>'); inOl = true }
      out.push(`<li>${md(line.replace(/^#\s*/, ''))}</li>`)
      continue
    }

    closeLists()

    // Einrückung
    if (/^;(.+)/.test(line)) { out.push(`<dt>${md(line.slice(1).trim())}</dt>`); continue }
    if (/^:(.+)/.test(line)) { out.push(`<dd>${md(line.slice(1).trim())}</dd>`); continue }

    // Leerzeile → Absatz-Trennung
    if (line.trim() === '') { out.push('<br>'); continue }

    out.push(`<p>${md(line)}</p>`)
  }

  closeLists()

  // Einfache Tabellen
  let html = out.join('\n')
  html = renderTables(html)

  return html

  function closeLists() {
    if (inUl) { out.push('</ul>'); inUl = false }
    if (inOl) { out.push('</ol>'); inOl = false }
  }
}

// Inline-Markup (fett, kursiv, links)
function md(text) {
  return text
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    // Links [[Ziel|Text]] oder [[Ziel]]
    .replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, '<a class="wiki-link">$2</a>')
    .replace(/\[\[([^\]]+)\]\]/g, '<a class="wiki-link">$1</a>')
    // Fett + Kursiv gleichzeitig
    .replace(/'''''(.+?)'''''/g, '<strong><em>$1</em></strong>')
    // Fett
    .replace(/'''(.+?)'''/g, '<strong>$1</strong>')
    // Kursiv
    .replace(/''(.+?)''/g, '<em>$1</em>')
    // Templates {{...}} grau
    .replace(/\{\{(.+?)\}\}/g, '<span class="wiki-template">{{$1}}</span>')
}

function renderTables(html) {
  // Einfache Wikitabellen {| ... |}
  return html.replace(/\{\|[^\n]*\n([\s\S]*?)\|\}/g, (match, body) => {
    const rows = body.split('|-').filter(r => r.trim())
    let tableHtml = '<table class="wiki-table">'
    rows.forEach(row => {
      tableHtml += '<tr>'
      // Header-Zellen !! getrennt
      const isHeader = /^\s*!/.test(row)
      const sep = isHeader ? /!!/g : /\|\|/g
      const tag = isHeader ? 'th' : 'td'
      const cells = row.replace(/^\s*[!|]/, '').split(sep)
      cells.forEach(cell => {
        tableHtml += `<${tag}>${md(cell.trim())}</${tag}>`
      })
      tableHtml += '</tr>'
    })
    tableHtml += '</table>'
    return tableHtml
  })
}

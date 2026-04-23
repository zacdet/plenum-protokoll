
function debounce(fn, ms) {
  let t
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms) }
}

function extractHeadings(editor) {
  const headings = []
  editor.state.doc.descendants((node, pos) => {
    if (node.type.name === 'heading')
      headings.push({ level: node.attrs.level, text: node.textContent, pos })
  })
  return headings
}

function render(listEl, editor) {
  const headings = extractHeadings(editor)
  if (headings.length === 0) {
    listEl.innerHTML = '<div class="toc-empty">Keine Überschriften</div>'
    return
  }

  listEl.innerHTML = headings.map(h =>
    `<div class="toc-item toc-h${h.level}" data-pos="${h.pos}" title="${h.text}">${h.text}</div>`
  ).join('')

  listEl.querySelectorAll('.toc-item').forEach(item => {
    item.addEventListener('click', () => {
      const pos = parseInt(item.dataset.pos, 10)
      try {
        editor.chain().focus().setTextSelection(pos + 1).run()
        const { node } = editor.view.domAtPos(pos + 1)
        const el = node.nodeType === Node.TEXT_NODE ? node.parentElement : node
        ;(el.closest('h1,h2,h3,h4,h5,h6') || el).scrollIntoView({ behavior: 'smooth', block: 'start' })
      } catch (e) { /* no-op */ }
    })
  })
}

export function initToc(panelEl, editor) {
  const listEl = panelEl.querySelector('#toc-list')
  const update = debounce(() => render(listEl, editor), 350)
  editor.on('update', update)
  render(listEl, editor)
}

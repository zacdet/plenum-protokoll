import { ViewPlugin, Decoration } from '@codemirror/view'
import { RangeSetBuilder } from '@codemirror/state'

const lineClassPlugin = ViewPlugin.fromClass(class {
  constructor(view) { this.decorations = build(view) }
  update(u) {
    if (u.docChanged || u.viewportChanged) this.decorations = build(u.view)
  }
}, { decorations: v => v.decorations })

function build(view) {
  const b = new RangeSetBuilder()
  for (const { from, to } of view.visibleRanges) {
    for (let pos = from; pos <= to; ) {
      const line = view.state.doc.lineAt(pos)
      const t = line.text
      let cls = null
      if      (/^={6}/.test(t)) cls = 'wl-h6'
      else if (/^={5}/.test(t)) cls = 'wl-h5'
      else if (/^={4}/.test(t)) cls = 'wl-h4'
      else if (/^={3}/.test(t)) cls = 'wl-h3'
      else if (/^={2}/.test(t)) cls = 'wl-h2'
      else if (/^={1}/.test(t)) cls = 'wl-h1'
      else if (/^\*/.test(t))   cls = 'wl-ul'
      else if (/^#/.test(t))    cls = 'wl-ol'
      else if (/^;/.test(t))    cls = 'wl-dt'
      else if (/^:/.test(t))    cls = 'wl-dd'
      else if (/^----/.test(t)) cls = 'wl-hr'
      if (cls) b.add(line.from, line.from, Decoration.line({ class: cls }))
      pos = line.to + 1
    }
  }
  return b.finish()
}

export { lineClassPlugin }

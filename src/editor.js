import { EditorView, keymap, lineNumbers, drawSelection, highlightActiveLine } from '@codemirror/view'
import { EditorState } from '@codemirror/state'
import { defaultKeymap, historyKeymap, history, indentWithTab } from '@codemirror/commands'
import { yCollab } from 'y-codemirror.next'

const baseTheme = EditorView.theme({
  '&': { height: '100%', fontSize: '14px', fontFamily: '"Fira Mono", "Consolas", monospace' },
  '.cm-content': { padding: '12px 16px', caretColor: 'var(--color-accent)' },
  '.cm-line': { lineHeight: '1.6' },
  '.cm-gutters': { background: 'var(--color-bg-secondary)', borderRight: '1px solid var(--color-border)', color: 'var(--color-text-muted)' },
  '.cm-activeLineGutter': { background: 'var(--color-bg-highlight)' },
  '.cm-activeLine': { background: 'var(--color-bg-highlight)' },
})

export function createEditor(domElement, ytext, awareness) {
  const state = EditorState.create({
    doc: ytext.toString(),
    extensions: [
      lineNumbers(),
      history(),
      drawSelection(),
      highlightActiveLine(),
      keymap.of([...defaultKeymap, ...historyKeymap, indentWithTab]),
      EditorView.lineWrapping,
      baseTheme,
      yCollab(ytext, awareness),
    ],
  })
  return new EditorView({ state, parent: domElement })
}

/** Text an Cursorposition einfügen */
export function insertAtCursor(view, text) {
  const { from, to } = view.state.selection.main
  view.dispatch({
    changes: { from, to, insert: text },
    selection: { anchor: from + text.length },
  })
  view.focus()
}

/**
 * Markierten Text mit before/after umschließen.
 * Ohne Selektion: Marker einfügen und Cursor dazwischen.
 */
export function wrapSelection(view, before, after) {
  const { from, to } = view.state.selection.main
  const selected = view.state.sliceDoc(from, to)
  if (selected) {
    view.dispatch({
      changes: { from, to, insert: before + selected + after },
      selection: { anchor: from + before.length, head: from + before.length + selected.length },
    })
  } else {
    view.dispatch({
      changes: { from, insert: before + after },
      selection: { anchor: from + before.length },
    })
  }
  view.focus()
}

/** Ganzen Dokumentinhalt als String */
export function getContent(view) {
  return view.state.doc.toString()
}

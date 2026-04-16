import { EditorView, keymap, drawSelection, highlightActiveLine } from '@codemirror/view'
import { EditorState } from '@codemirror/state'
import { defaultKeymap, historyKeymap, history, indentWithTab } from '@codemirror/commands'
import { yCollab } from 'y-codemirror.next'
import { lineClassPlugin } from './wikiDecorations.js'

const baseTheme = EditorView.theme({
  '&': {
    height: '100%',
    fontSize: '15px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
  '.cm-content': {
    padding: '32px 48px',
    caretColor: 'var(--color-accent)',
    maxWidth: '820px',
    margin: '0 auto',
    lineHeight: '1.8',
  },
  '.cm-line': { padding: '0' },
  '.cm-focused .cm-cursor': { borderLeftColor: 'var(--color-accent)' },
  '.cm-gutters': { display: 'none' },
  '.cm-activeLine': { background: 'rgba(77,171,247,0.04)' },
  // Wiki-Überschriften
  '.wl-h1': { fontSize: '1.7em', fontWeight: '700', paddingBottom: '6px', borderBottom: '2px solid var(--color-border)', marginBottom: '4px' },
  '.wl-h2': { fontSize: '1.4em', fontWeight: '700', paddingBottom: '4px', borderBottom: '1px solid var(--color-border)', marginBottom: '2px' },
  '.wl-h3': { fontSize: '1.2em', fontWeight: '600' },
  '.wl-h4': { fontSize: '1.05em', fontWeight: '600', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '.04em' },
  '.wl-h5': { fontSize: '1em', fontWeight: '600', color: 'var(--color-text-muted)' },
  '.wl-h6': { fontSize: '.95em', fontWeight: '600', color: 'var(--color-text-muted)' },
  '.wl-ul':  { paddingLeft: '1.2em' },
  '.wl-ol':  { paddingLeft: '1.2em' },
  '.wl-dt':  { fontWeight: '600' },
  '.wl-dd':  { paddingLeft: '1.4em', color: 'var(--color-text-muted)' },
  '.wl-hr':  { color: 'var(--color-border)', opacity: '0.5' },
})

export function createEditor(domElement, ytext, awareness) {
  const state = EditorState.create({
    doc: ytext.toString(),
    extensions: [
      history(),
      drawSelection(),
      highlightActiveLine(),
      keymap.of([...defaultKeymap, ...historyKeymap, indentWithTab]),
      EditorView.lineWrapping,
      baseTheme,
      lineClassPlugin,
      yCollab(ytext, awareness),
    ],
  })
  return new EditorView({ state, parent: domElement })
}

export function insertAtCursor(view, text) {
  const { from, to } = view.state.selection.main
  view.dispatch({
    changes: { from, to, insert: text },
    selection: { anchor: from + text.length },
  })
  view.focus()
}

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

export function getContent(view) {
  return view.state.doc.toString()
}

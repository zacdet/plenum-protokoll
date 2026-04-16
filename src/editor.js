/**
 * CodeMirror 6 Editor mit Yjs-Binding
 */
import { EditorView, keymap, lineNumbers, drawSelection, highlightActiveLine } from '@codemirror/view'
import { EditorState, Compartment } from '@codemirror/state'
import { defaultKeymap, historyKeymap, history, indentWithTab } from '@codemirror/commands'
import { yCollab } from 'y-codemirror.next'

const themeCompartment = new Compartment()

const baseTheme = EditorView.theme({
  '&': {
    height: '100%',
    fontSize: '14px',
    fontFamily: '"Fira Mono", "Consolas", monospace',
  },
  '.cm-content': {
    padding: '12px 16px',
    caretColor: 'var(--color-accent)',
  },
  '.cm-line': {
    lineHeight: '1.6',
  },
  '.cm-gutters': {
    background: 'var(--color-bg-secondary)',
    borderRight: '1px solid var(--color-border)',
    color: 'var(--color-text-muted)',
  },
  '.cm-activeLineGutter': {
    background: 'var(--color-bg-highlight)',
  },
  '.cm-activeLine': {
    background: 'var(--color-bg-highlight)',
  },
})

export function createEditor(domElement, ytext, awareness) {
  const state = EditorState.create({
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

  const view = new EditorView({
    state,
    parent: domElement,
  })

  return view
}

export function insertAtCursor(view, text) {
  const { from, to } = view.state.selection.main
  view.dispatch({
    changes: { from, to, insert: text },
    selection: { anchor: from + text.length },
  })
  view.focus()
}

export function getContent(view) {
  return view.state.doc.toString()
}

import { Editor, Extension } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import Collaboration from '@tiptap/extension-collaboration'
import { Decoration, DecorationSet } from '@tiptap/pm/view'
import { Plugin, PluginKey } from '@tiptap/pm/state'

// Lokaler Speicher für eingeklappte Blöcke (nicht synchronisiert)
const collapsedStarts = new Set()

const WikiFoldingPlugin = new Plugin({
  key: new PluginKey('wikiFolding'),
  state: {
    init() { return DecorationSet.empty },
    apply(tr, oldState) {
      const meta = tr.getMeta('wikiFoldingUpdate')
      if (tr.docChanged || meta) {
        const decorations = []
        let currentTemplateStartPos = null
        let isCollapsed = false

        tr.doc.descendants((node, pos) => {
          if (node.type.name === 'paragraph') {
            const text = node.textContent.trim()
            const isStart = text.startsWith('{{')
            const isEnd = text.endsWith('}}') || text === '}}'

            if (isStart) {
              currentTemplateStartPos = pos
              isCollapsed = collapsedStarts.has(pos)
              
              // Dekorator für die Start-Zeile (Pfeil-Indikator)
              decorations.push(Decoration.node(pos, pos + node.nodeSize, {
                class: 'wiki-template-start' + (isCollapsed ? ' is-collapsed' : ''),
                'data-folding-trigger': 'true'
              }))
            } else if (currentTemplateStartPos !== null) {
              // Markiere Zeilen innerhalb eines Templates
              const classes = ['wiki-template-line']
              if (isCollapsed) classes.push('is-hidden')
              
              decorations.push(Decoration.node(pos, pos + node.nodeSize, {
                class: classes.join(' ')
              }))
            }

            if (isEnd) {
              currentTemplateStartPos = null
              isCollapsed = false
            }
          }
        })
        return DecorationSet.create(tr.doc, decorations)
      }
      return oldState.map(tr.mapping, tr.doc)
    }
  },
  props: {
    decorations(state) {
      return this.getState(state)
    },
    handleClick(view, pos, event) {
      const { state } = view
      const $pos = state.doc.resolve(pos)
      const nodePos = $pos.before()
      const node = state.doc.nodeAt(nodePos)

      if (node && node.textContent.trim().startsWith('{{')) {
        if (collapsedStarts.has(nodePos)) {
          collapsedStarts.delete(nodePos)
        } else {
          collapsedStarts.add(nodePos)
        }
        view.dispatch(state.tr.setMeta('wikiFoldingUpdate', true))
        return true
      }
      return false
    }
  }
})

const WikiFoldingExtension = Extension.create({
  name: 'wikiFolding',
  addProseMirrorPlugins() {
    return [WikiFoldingPlugin]
  }
})

export function createRichEditor(domElement, yXmlFragment, awareness, identity) {
  const editor = new Editor({
    element: domElement,
    extensions: [
      StarterKit.configure({ undoRedo: false }),
      Collaboration.configure({ fragment: yXmlFragment }),
      WikiFoldingExtension,
    ],
    autofocus: true,
    editorProps: {
      attributes: { class: 'rich-editor-content' },
    },
  })
  return editor
}

export function getEditorWikiContent(editor) {
  if (!editor || editor.destroyed) return ''
  const json = editor.getJSON()
  return tiptapToWiki(json)
}

function tiptapToWiki(doc) {
  if (!doc?.content) return ''
  return doc.content.map(node => blockToWiki(node)).filter(s => s !== null).join('\n')
}

function blockToWiki(node, depth = 1) {
  switch (node.type) {
    case 'heading': {
      const m = '='.repeat(node.attrs?.level ?? 2)
      return `${m} ${inlineToWiki(node.content)} ${m}`
    }
    case 'paragraph':
      return inlineToWiki(node.content)
    case 'bulletList':
      return (node.content ?? []).map(li => listItemToWiki(li, '*', depth)).join('\n')
    case 'orderedList':
      return (node.content ?? []).map(li => listItemToWiki(li, '#', depth)).join('\n')
    case 'blockquote':
      return (node.content ?? []).map(n => ': ' + inlineToWiki(n.content)).join('\n')
    case 'horizontalRule':
      return '----'
    case 'codeBlock':
      return `<syntaxhighlight>\n${node.content?.[0]?.text ?? ''}\n</syntaxhighlight>`
    default:
      return ''
  }
}

function listItemToWiki(li, marker, depth) {
  const prefix = marker.repeat(depth)
  const lines = []
  for (const child of li.content ?? []) {
    if (child.type === 'paragraph') {
      lines.push(`${prefix} ${inlineToWiki(child.content)}`)
    } else if (child.type === 'bulletList') {
      for (const nested of child.content ?? [])
        lines.push(listItemToWiki(nested, '*', depth + 1))
    } else if (child.type === 'orderedList') {
      for (const nested of child.content ?? [])
        lines.push(listItemToWiki(nested, '#', depth + 1))
    }
  }
  return lines.join('\n')
}

function inlineToWiki(nodes = []) {
  if (!nodes) return ''
  return nodes.map(node => {
    if (node.type === 'hardBreak') return '\n'
    if (node.type !== 'text') return ''
    let t = node.text ?? ''
    const marks = node.marks ?? []
    const bold   = marks.some(m => m.type === 'bold')
    const italic = marks.some(m => m.type === 'italic')
    const code   = marks.some(m => m.type === 'code')
    if (code)   t = `<code>${t}</code>`
    if (bold && italic) t = `'''''${t}'''''`
    else if (bold)      t = `'''${t}'''`
    else if (italic)    t = `''${t}''`
    return t
  }).join('')
}

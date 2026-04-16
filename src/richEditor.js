import { Editor } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import Collaboration from '@tiptap/extension-collaboration'

export function createRichEditor(domElement, yXmlFragment, awareness, identity) {
  const editor = new Editor({
    element: domElement,
    extensions: [
      StarterKit.configure({ undoRedo: false }),
      Collaboration.configure({ fragment: yXmlFragment }),
    ],
    autofocus: true,
    editorProps: {
      attributes: { class: 'rich-editor-content' },
    },
  })
  return editor
}

export function getEditorWikiContent(editor) {
  return tiptapToWiki(editor.getJSON())
}

// ─── TipTap JSON → Wiki-Syntax ────────────────────────────────────────────────

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

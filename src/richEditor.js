import { Editor, Extension } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import Collaboration from '@tiptap/extension-collaboration'

const WikiTemplateExtension = Extension.create({
  name: 'wikiTemplate',
  addGlobalAttributes() {
    return [
      {
        types: ['paragraph'],
        attributes: {
          isTemplate: {
            default: false,
            parseHTML: element => element.hasAttribute('data-template'),
            renderHTML: attributes => {
              const attrs = {}
              if (attributes.isTemplate) {
                attrs.class = 'wiki-template-line'
                attrs['data-template'] = ''
              }
              if (attributes.isTemplateStart) attrs['data-template-start'] = ''
              if (attributes.isTemplateEnd) attrs['data-template-end'] = ''
              return attrs
            },
          },
          isTemplateStart: { default: false },
          isTemplateEnd: { default: false },
        },
      },
    ]
  },
  onUpdate() {
    const { state, view } = this.editor
    const { doc } = state
    let inTemplate = false

    const transaction = state.tr
    doc.descendants((node, pos) => {
      if (node.type.name === 'paragraph') {
        const text = node.textContent.trim()
        const isStart = text.startsWith('{{')
        const isEnd = text.endsWith('}}') || text === '}}'
        
        let newIsTemplate = inTemplate || isStart
        if (isStart) inTemplate = true
        
        if (node.attrs.isTemplate !== newIsTemplate || node.attrs.isTemplateStart !== isStart || node.attrs.isTemplateEnd !== isEnd) {
          transaction.setNodeMarkup(pos, null, {
            ...node.attrs,
            isTemplate: newIsTemplate,
            isTemplateStart: isStart,
            isTemplateEnd: isEnd
          })
        }

        if (isEnd) inTemplate = false
      }
    })
    if (transaction.docChanged) {
      view.dispatch(transaction)
    }
  }
})

export function createRichEditor(domElement, yXmlFragment, awareness, identity) {
  const editor = new Editor({
    element: domElement,
    extensions: [
      StarterKit.configure({ undoRedo: false }),
      Collaboration.configure({ fragment: yXmlFragment }),
      WikiTemplateExtension,
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

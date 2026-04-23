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
                if (attributes.isCollapsed) attrs['data-collapsed'] = ''
              }
              if (attributes.isTemplateStart) attrs['data-template-start'] = ''
              if (attributes.isTemplateEnd) attrs['data-template-end'] = ''
              return attrs
            },
          },
          isTemplateStart: { default: false },
          isTemplateEnd: { default: false },
          isCollapsed: { default: false },
        },
      },
    ]
  },
  addStorage() {
    return {
      collapsedStarts: new Set(),
    }
  },
  onUpdate() {
    const { state, view } = this.editor
    const { doc } = state
    let currentTemplateStartPos = null
    
    const transaction = state.tr
    doc.descendants((node, pos) => {
      if (node.type.name === 'paragraph') {
        const text = node.textContent.trim()
        const isStart = text.startsWith('{{')
        const isEnd = text.endsWith('}}') || text === '}}'
        
        if (isStart) currentTemplateStartPos = pos

        const shouldBeCollapsed = currentTemplateStartPos !== null && 
                                  this.storage.collapsedStarts.has(currentTemplateStartPos) && 
                                  !isStart

        if (node.attrs.isTemplate !== (currentTemplateStartPos !== null) || 
            node.attrs.isTemplateStart !== isStart || 
            node.attrs.isTemplateEnd !== isEnd ||
            node.attrs.isCollapsed !== shouldBeCollapsed) {
          
          transaction.setNodeMarkup(pos, null, {
            ...node.attrs,
            isTemplate: currentTemplateStartPos !== null,
            isTemplateStart: isStart,
            isTemplateEnd: isEnd,
            isCollapsed: shouldBeCollapsed
          })
        }

        if (isEnd) currentTemplateStartPos = null
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
      handleClick(view, pos, event) {
        const { state } = view
        const node = state.doc.nodeAt(state.doc.resolve(pos).before())
        if (node?.attrs?.isTemplateStart) {
          const startPos = state.doc.resolve(pos).before()
          const extension = editor.extensionManager.extensions.find(e => e.name === 'wikiTemplate')
          if (extension.storage.collapsedStarts.has(startPos)) {
            extension.storage.collapsedStarts.delete(startPos)
          } else {
            extension.storage.collapsedStarts.add(startPos)
          }
          // Force update
          editor.commands.focus()
          return true
        }
        return false
      }
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

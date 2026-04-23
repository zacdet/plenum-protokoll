import { Editor, Extension, textblockTypeInputRule } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import Collaboration from '@tiptap/extension-collaboration'
import { Decoration, DecorationSet } from '@tiptap/pm/view'
import { Plugin, PluginKey } from '@tiptap/pm/state'

const collapsedStarts   = new Set()  // template block positions
const collapsedHeadings = new Set()  // heading positions

// ─── Wiki heading input rules + paste/insert conversion ──────────────────────
const WIKI_HEADING_RE = /^(={2,6})\s+(.+?)\s+={2,}$/

const WikiHeadingExtension = Extension.create({
  name: 'wikiHeading',

  addInputRules() {
    const headingType = this.editor.schema.nodes.heading
    if (!headingType) return []
    // Fires when user types "== " / "=== " at start of a block → converts to heading
    return [
      textblockTypeInputRule({
        find: /^(={2,6})\s$/,
        type: headingType,
        getAttributes: match => ({ level: Math.min(match[1].length, 6) }),
      }),
    ]
  },

  addProseMirrorPlugins() {
    return [new Plugin({
      key: new PluginKey('wikiHeadingConvert'),
      appendTransaction(transactions, _old, newState) {
        if (!transactions.some(tr => tr.docChanged)) return null
        const changes = []
        newState.doc.descendants((node, pos) => {
          if (node.type.name !== 'paragraph') return
          const m = node.textContent.match(WIKI_HEADING_RE)
          if (!m) return
          changes.push({ pos, end: pos + node.nodeSize, level: Math.min(m[1].length, 6), text: m[2] })
        })
        if (!changes.length) return null
        const tr = newState.tr
        for (const { pos, end, level, text: t } of changes.reverse()) {
          tr.replaceWith(pos, end, newState.schema.nodes.heading.create(
            { level },
            t ? [newState.schema.text(t)] : []
          ))
        }
        return tr
      },
    })]
  },
})

// ─── Combined Folding Plugin (templates + headings) ───────────────────────────
const WikiFoldingPlugin = new Plugin({
  key: new PluginKey('wikiFolding'),
  state: {
    init() { return DecorationSet.empty },
    apply(tr, oldState) {
      if (tr.docChanged) {
        for (const [src, dst] of [[collapsedStarts, new Set()], [collapsedHeadings, new Set()]]) {
          const remapped = dst
          for (const pos of src) remapped.add(tr.mapping.map(pos))
          src.clear()
          for (const pos of remapped) src.add(pos)
        }
      }

      if (!tr.docChanged && !tr.getMeta('wikiFoldingUpdate')) {
        return oldState.map(tr.mapping, tr.doc)
      }

      const decorations = []
      const templateStack = []  // { isAmendment, isCollapsed }
      const headingsList  = []  // { pos, level, nodeSize }

      // ── Phase 1: traverse doc ──────────────────────────────────────────────
      tr.doc.descendants((node, pos) => {
        const type = node.type.name

        if (type === 'paragraph') {
          const text = node.textContent.trim()
          const isStart = text.startsWith('{{')
          const isEnd   = text === '}}' || (text.endsWith('}}') && !isStart)

          if (isStart) {
            const isAmendment   = text.startsWith('{{Änderungsantrag')
            const selfCollapsed = collapsedStarts.has(pos)
            const outerCollapsed = templateStack.some(t => t.isCollapsed)
            templateStack.push({ isAmendment, isCollapsed: selfCollapsed })

            if (outerCollapsed) {
              decorations.push(Decoration.node(pos, pos + node.nodeSize, { class: 'wiki-template-line is-hidden' }))
            } else {
              const cls = ['wiki-template-start', isAmendment ? 'amendment-template' : '', selfCollapsed ? 'is-collapsed' : ''].filter(Boolean).join(' ')
              decorations.push(Decoration.node(pos, pos + node.nodeSize, { class: cls, 'data-folding-trigger': 'true' }))
            }

          } else if (templateStack.length > 0) {
            const innermost    = templateStack[templateStack.length - 1]
            const anyCollapsed = templateStack.some(t => t.isCollapsed)
            const classes = ['wiki-template-line', innermost.isAmendment ? 'amendment-template' : ''].filter(Boolean)
            if (anyCollapsed) classes.push('is-hidden')
            decorations.push(Decoration.node(pos, pos + node.nodeSize, { class: classes.join(' ') }))
          }

          if (isEnd && templateStack.length > 0) templateStack.pop()

        } else if (type === 'heading') {
          headingsList.push({ pos, level: node.attrs.level, nodeSize: node.nodeSize })

          if (templateStack.length > 0) {
            // Heading inside a template block → treat as template line
            const innermost    = templateStack[templateStack.length - 1]
            const anyCollapsed = templateStack.some(t => t.isCollapsed)
            const classes = ['wiki-template-line', innermost.isAmendment ? 'amendment-template' : ''].filter(Boolean)
            if (anyCollapsed) classes.push('is-hidden')
            decorations.push(Decoration.node(pos, pos + node.nodeSize, { class: classes.join(' ') }))
          } else {
            // Free-standing heading → add fold indicator
            const isColl = collapsedHeadings.has(pos)
            decorations.push(Decoration.node(pos, pos + node.nodeSize, {
              class: 'heading-fold' + (isColl ? ' is-collapsed' : ''),
              'data-heading-fold': 'true',
            }))
          }
          return false // don't recurse into inline content

        } else if (['bulletList', 'orderedList', 'blockquote'].includes(type)) {
          if (templateStack.length > 0) {
            // Block node inside template → template line styling
            const innermost    = templateStack[templateStack.length - 1]
            const anyCollapsed = templateStack.some(t => t.isCollapsed)
            const classes = ['wiki-template-line', innermost.isAmendment ? 'amendment-template' : ''].filter(Boolean)
            if (anyCollapsed) classes.push('is-hidden')
            decorations.push(Decoration.node(pos, pos + node.nodeSize, { class: classes.join(' ') }))
            return false // don't descend into list items
          }
        }
      })

      // ── Phase 2: hide content under collapsed headings ─────────────────────
      headingsList.forEach(({ pos, level, nodeSize }, i) => {
        if (!collapsedHeadings.has(pos)) return
        const next   = headingsList.slice(i + 1).find(h => h.level <= level)
        const endPos = next ? next.pos : tr.doc.content.size

        tr.doc.forEach((childNode, childPos) => {
          if (childPos >= pos + nodeSize && childPos < endPos) {
            decorations.push(Decoration.node(childPos, childPos + childNode.nodeSize, { class: 'is-hidden' }))
          }
        })
      })

      return DecorationSet.create(tr.doc, decorations)
    },
  },
  props: {
    decorations(state) { return this.getState(state) },
    handleDOMEvents: {
      click(view, event) {
        let el = event.target
        while (el && el !== view.dom) {
          const attr = el.getAttribute

          if (attr && el.getAttribute('data-heading-fold')) {
            try {
              const domPos  = view.posAtDOM(el, 0)
              const $pos    = view.state.doc.resolve(domPos)
              const nodePos = $pos.depth > 0 ? $pos.before() : domPos
              collapsedHeadings.has(nodePos) ? collapsedHeadings.delete(nodePos) : collapsedHeadings.add(nodePos)
              view.dispatch(view.state.tr.setMeta('wikiFoldingUpdate', true))
              event.preventDefault()
            } catch (e) { console.warn('Heading fold error', e) }
            return true
          }

          if (attr && el.getAttribute('data-folding-trigger')) {
            try {
              const domPos  = view.posAtDOM(el, 0)
              const $pos    = view.state.doc.resolve(domPos)
              const nodePos = $pos.depth > 0 ? $pos.before() : domPos
              collapsedStarts.has(nodePos) ? collapsedStarts.delete(nodePos) : collapsedStarts.add(nodePos)
              view.dispatch(view.state.tr.setMeta('wikiFoldingUpdate', true))
              event.preventDefault()
            } catch (e) { console.warn('WikiFolding click error', e) }
            return true
          }

          el = el.parentElement
        }
        return false
      },
    },
  },
})

const WikiFoldingExtension = Extension.create({
  name: 'wikiFolding',
  addProseMirrorPlugins() { return [WikiFoldingPlugin] },
})

// ─── Inline syntax colouring (<del> → red, '''ins''' → green) ────────────────
function buildSyntaxDecorations(doc) {
  const decorations = []
  doc.descendants((node, pos) => {
    if (!node.isText) return
    const text = node.text
    let m
    const delRe  = /<del>[\s\S]*?<\/del>/g
    const boldRe = /'''[\s\S]*?'''/g
    while ((m = delRe.exec(text))  !== null)
      decorations.push(Decoration.inline(pos + m.index, pos + m.index + m[0].length, { class: 'wiki-del' }))
    while ((m = boldRe.exec(text)) !== null)
      decorations.push(Decoration.inline(pos + m.index, pos + m.index + m[0].length, { class: 'wiki-ins' }))
  })
  return DecorationSet.create(doc, decorations)
}

const WikiSyntaxExtension = Extension.create({
  name: 'wikiSyntax',
  addProseMirrorPlugins() {
    return [new Plugin({
      key: new PluginKey('wikiSyntax'),
      state: {
        init(_, state) { return buildSyntaxDecorations(state.doc) },
        apply(tr, old) { return tr.docChanged ? buildSyntaxDecorations(tr.doc) : old.map(tr.mapping, tr.doc) },
      },
      props: {
        decorations(state) { return this.getState(state) },
      },
    })]
  },
})

// ─── Wiki list conversion (* / ** / *** → bulletList) ────────────────────────
const BULLET_LINE_RE = /^(\*+)\s*(.*)/

function buildNestedList(items, schema) {
  const minDepth = Math.min(...items.map(it => it.depth))

  function build(slice, depth) {
    const listItems = []
    let i = 0
    while (i < slice.length) {
      if (slice[i].depth !== depth) { i++; continue }
      let j = i + 1
      while (j < slice.length && slice[j].depth > depth) j++
      const para = schema.nodes.paragraph.create(
        {}, slice[i].text ? [schema.text(slice[i].text)] : []
      )
      const sub = slice.slice(i + 1, j)
      listItems.push(schema.nodes.listItem.create(
        {}, sub.length ? [para, build(sub, depth + 1)] : [para]
      ))
      i = j
    }
    return schema.nodes.bulletList.create({}, listItems)
  }

  return build(items, minDepth)
}

const WikiListExtension = Extension.create({
  name: 'wikiList',
  addProseMirrorPlugins() {
    return [new Plugin({
      key: new PluginKey('wikiListConvert'),
      appendTransaction(transactions, _old, newState) {
        if (!transactions.some(tr => tr.docChanged)) return null

        const groups = []
        let current = []

        newState.doc.forEach((node, pos) => {
          if (node.type.name === 'paragraph') {
            const m = node.textContent.match(BULLET_LINE_RE)
            if (m) {
              current.push({ pos, end: pos + node.nodeSize, depth: m[1].length, text: m[2] })
              return
            }
          }
          if (current.length) { groups.push([...current]); current = [] }
        })
        if (current.length) groups.push(current)
        if (!groups.length) return null

        const tr = newState.tr
        for (const group of groups.reverse()) {
          tr.replaceWith(group[0].pos, group[group.length - 1].end,
            buildNestedList(group, newState.schema))
        }
        return tr
      },
    })]
  },
})

// ─── Editor factory ───────────────────────────────────────────────────────────
export function createRichEditor(domElement, yXmlFragment, awareness, identity) {
  return new Editor({
    element: domElement,
    extensions: [
      StarterKit.configure({ undoRedo: false }),
      Collaboration.configure({ fragment: yXmlFragment }),
      WikiFoldingExtension,
      WikiHeadingExtension,
      WikiSyntaxExtension,
      WikiListExtension,
    ],
    autofocus: true,
    editorProps: { attributes: { class: 'rich-editor-content' } },
  })
}

export function getEditorWikiContent(editor) {
  if (!editor || editor.destroyed) return ''
  return tiptapToWiki(editor.getJSON())
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
      lines.push(`${prefix}${inlineToWiki(child.content)}`)
    } else if (child.type === 'bulletList') {
      for (const nested of child.content ?? []) lines.push(listItemToWiki(nested, '*', depth + 1))
    } else if (child.type === 'orderedList') {
      for (const nested of child.content ?? []) lines.push(listItemToWiki(nested, '#', depth + 1))
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
    const marks  = node.marks ?? []
    const bold   = marks.some(m => m.type === 'bold')
    const italic = marks.some(m => m.type === 'italic')
    const code   = marks.some(m => m.type === 'code')
    if (code)            t = `<code>${t}</code>`
    if (bold && italic)  t = `'''''${t}'''''`
    else if (bold)       t = `'''${t}'''`
    else if (italic)     t = `''${t}''`
    return t
  }).join('')
}

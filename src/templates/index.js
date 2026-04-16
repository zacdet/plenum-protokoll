// Toolbar-Button-Definitionen für TipTap
// cmd: Funktion (editor) => void — direkter TipTap-Befehl
// wrap / template: Fallback via insertContent (für komplexe Wiki-Strukturen)

export const TEMPLATE_GROUPS = [
  {
    label: 'Format',
    buttons: [
      { id: 'h2',     label: 'H2', tooltip: 'Überschrift 2', cmd: e => e.chain().focus().toggleHeading({ level: 2 }).run() },
      { id: 'h3',     label: 'H3', tooltip: 'Überschrift 3', cmd: e => e.chain().focus().toggleHeading({ level: 3 }).run() },
      { id: 'h4',     label: 'H4', tooltip: 'Überschrift 4', cmd: e => e.chain().focus().toggleHeading({ level: 4 }).run() },
      { id: 'bold',   label: 'F',  tooltip: 'Fett',           cmd: e => e.chain().focus().toggleBold().run() },
      { id: 'italic', label: 'K',  tooltip: 'Kursiv',         cmd: e => e.chain().focus().toggleItalic().run() },
    ],
  },
  {
    label: 'Struktur',
    buttons: [
      {
        id: 'sitzungskopf',
        label: 'Sitzungskopf',
        template: () => {
          const date = new Date().toLocaleDateString('de-DE')
          const time = new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
          return [
            { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Sitzungsprotokoll' }] },
            { type: 'paragraph', content: [{ type: 'text', marks: [{ type: 'bold' }], text: 'Datum: ' }, { type: 'text', text: date }] },
            { type: 'paragraph', content: [{ type: 'text', marks: [{ type: 'bold' }], text: 'Beginn: ' }, { type: 'text', text: `${time} Uhr` }] },
            { type: 'paragraph', content: [{ type: 'text', marks: [{ type: 'bold' }], text: 'Ort: ' }] },
            { type: 'paragraph', content: [{ type: 'text', marks: [{ type: 'bold' }], text: 'Sitzungsleitung: ' }] },
            { type: 'paragraph', content: [{ type: 'text', marks: [{ type: 'bold' }], text: 'Protokoll: ' }] },
            { type: 'paragraph', content: [{ type: 'text', marks: [{ type: 'bold' }], text: 'Anwesend: ' }] },
            { type: 'horizontalRule' },
          ]
        },
        isJson: true,
      },
      {
        id: 'top',
        label: 'TOP',
        prompt: [
          { key: 'nr',    label: 'TOP-Nummer', default: '1' },
          { key: 'titel', label: 'Titel',       default: '' },
        ],
        template: ({ nr, titel }) => [
          { type: 'heading', attrs: { level: 3 }, content: [{ type: 'text', text: `TOP ${nr}: ${titel}` }] },
          { type: 'paragraph' },
        ],
        isJson: true,
      },
      {
        id: 'pause',
        label: 'Pause',
        prompt: [
          { key: 'von', label: 'Von', default: '' },
          { key: 'bis', label: 'Bis', default: '' },
        ],
        template: ({ von, bis }) => [
          { type: 'paragraph', content: [{ type: 'text', marks: [{ type: 'italic' }], text: `Sitzungsunterbrechung: ${von} – ${bis} Uhr` }] },
        ],
        isJson: true,
      },
      {
        id: 'ende',
        label: 'Sitzungsende',
        template: () => {
          const time = new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
          return [
            { type: 'horizontalRule' },
            { type: 'paragraph', content: [{ type: 'text', marks: [{ type: 'italic' }], text: `Ende der Sitzung: ${time} Uhr` }] },
          ]
        },
        isJson: true,
      },
    ],
  },
  {
    label: 'Verlauf',
    buttons: [
      {
        id: 'redebeitrag',
        label: 'Redebeitrag',
        prompt: [{ key: 'name', label: 'Name', default: '' }],
        template: ({ name }) => [
          { type: 'paragraph', content: [
            { type: 'text', marks: [{ type: 'bold' }], text: `${name}: ` },
          ]},
        ],
        isJson: true,
      },
      {
        id: 'meinungsbild',
        label: 'Meinungsbild',
        prompt: [
          { key: 'frage', label: 'Frage', default: '' },
          { key: 'd',     label: 'Dafür', default: '0' },
          { key: 'g',     label: 'Dagegen', default: '0' },
          { key: 'e',     label: 'Enthaltungen', default: '0' },
        ],
        template: ({ frage, d, g, e }) => [
          { type: 'paragraph', content: [
            { type: 'text', marks: [{ type: 'bold' }], text: 'Meinungsbild: ' },
            { type: 'text', text: frage },
          ]},
          { type: 'paragraph', content: [{ type: 'text', text: `Dafür: ${d}  •  Dagegen: ${g}  •  Enthaltungen: ${e}` }] },
        ],
        isJson: true,
      },
    ],
  },
  {
    label: 'Beschlüsse',
    buttons: [
      {
        id: 'abstimmung',
        label: 'Abstimmung',
        prompt: [
          { key: 'd',        label: 'Dafür',        default: '0' },
          { key: 'g',        label: 'Dagegen',       default: '0' },
          { key: 'e',        label: 'Enthaltungen',  default: '0' },
          { key: 'ergebnis', label: 'Ergebnis',      default: 'angenommen' },
        ],
        template: ({ d, g, e, ergebnis }) => [
          { type: 'heading', attrs: { level: 4 }, content: [{ type: 'text', text: 'Abstimmung' }] },
          { type: 'paragraph', content: [{ type: 'text', text: `Dafür: ${d}  |  Dagegen: ${g}  |  Enthaltungen: ${e}` }] },
          { type: 'paragraph', content: [
            { type: 'text', marks: [{ type: 'bold' }], text: 'Ergebnis: ' },
            { type: 'text', text: ergebnis },
          ]},
        ],
        isJson: true,
      },
      {
        id: 'beschluss',
        label: 'Beschluss',
        prompt: [
          { key: 'text', label: 'Beschlusstext', default: '' },
          { key: 'd',    label: 'Dafür',          default: '0' },
          { key: 'g',    label: 'Dagegen',         default: '0' },
          { key: 'e',    label: 'Enthaltungen',    default: '0' },
        ],
        template: ({ text, d, g, e }) => [
          { type: 'heading', attrs: { level: 4 }, content: [{ type: 'text', text: 'Beschluss' }] },
          { type: 'paragraph', content: [{ type: 'text', text }] },
          { type: 'paragraph', content: [{ type: 'text', text: `Abstimmung: ${d} – ${g} – ${e} (Dafür – Dagegen – Enthaltungen)` }] },
        ],
        isJson: true,
      },
    ],
  },
  {
    label: 'Listen',
    buttons: [
      { id: 'ul', label: '• Liste',  cmd: e => e.chain().focus().toggleBulletList().run() },
      { id: 'ol', label: '1. Liste', cmd: e => e.chain().focus().toggleOrderedList().run() },
      { id: 'hr', label: '—',        cmd: e => e.chain().focus().setHorizontalRule().run() },
    ],
  },
]

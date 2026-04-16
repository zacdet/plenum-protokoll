// Toolbar-Button-Definitionen für TipTap
// cmd: (editor) => void  — direkter TipTap-Befehl
// template: (params) => TipTap-JSON-Array
// prompt: Felder für Modal

// Hilfsfunktion: Text-Zeilen → TipTap-Absatz-Array
const p = (...lines) => lines.map(text =>
  text
    ? { type: 'paragraph', content: [{ type: 'text', text }] }
    : { type: 'paragraph' }
)

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
    label: 'Anträge',
    buttons: [
      {
        id: 'antrag',
        label: 'Antrag',
        prompt: [
          { key: 'steller',    label: 'Antragsteller',  default: '' },
          { key: 'text',       label: 'Antragstext',    default: '' },
          { key: 'begruendung', label: 'Begründung',    default: '' },
        ],
        template: ({ steller, text, begruendung }) => [
          ...p(
            '{{Antrag',
            `|1=${steller}`,
            `|2=${text}`,
            `|3=${begruendung}`,
            '|4=DISKUSSION ZUM ANTRAG:',
            '* ',
            '|5=Abstimmung: Der Antrag wurde mit Ja: X Nein: Y Enthaltung: Z angenommen.',
            '}}',
          ),
          { type: 'paragraph' },
        ],
        isJson: true,
      },
      {
        id: 'aenderungsantrag',
        label: 'Änderungsantrag',
        prompt: [
          { key: 'name',         label: 'Name (Hochschule)',      default: '' },
          { key: 'anweisung',    label: 'Änderungsanweisung',     default: '' },
          { key: 'begruendung',  label: 'Begründung',             default: '' },
        ],
        template: ({ name, anweisung, begruendung }) => [
          ...p(
            '{{Änderungsantrag',
            `|1=${name}`,
            `|2=${anweisung}`,
            `|3=${begruendung}`,
            '|4=Abstimmung: Der Änderungsantrag wurde mit Ja: X Nein: Y Enthaltung: Z angenommen',
            '}}',
          ),
          { type: 'paragraph' },
        ],
        isJson: true,
      },
      {
        id: 'neufassung',
        label: 'Neufassung',
        prompt: [
          { key: 'name',  label: 'Name (Hochschule)', default: '' },
          { key: 'text',  label: 'Antragstext',       default: '' },
        ],
        template: ({ name, text }) => [
          ...p(
            '{{Antrag',
            `|1=${name}`,
            `|2=${text}`,
            '|3=Das Positionspapier wurde inhaltlich überarbeitet.',
            '|4=DISKUSSION ZUM ANTRAG:',
            '* ',
            '|5=Abstimmung: Die Neufassung wurde mit Ja: X Nein: Y Enthaltung: Z angenommen. Der Antrag selbst wurde mit Ja: X Nein: Y Enthaltung: Z angenommen.',
            '}}',
          ),
          { type: 'paragraph' },
        ],
        isJson: true,
      },
    ],
  },
  {
    label: 'Protokoll',
    buttons: [
      {
        id: 'quorum',
        label: 'Quorum',
        prompt: [
          { key: 'anzahl',   label: 'Fachschaften anwesend', default: '' },
          { key: 'absolut',  label: 'Absolute Mehrheit bei', default: '' },
          { key: 'zwei',     label: '⅔ Mehrheit bei',        default: '' },
        ],
        template: ({ anzahl, absolut, zwei }) => [
          { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Quorum' }] },
          ...p(
            `* Es sind ${anzahl} Fachschaften anwesend`,
            `** absolute Mehrheit bei ${absolut}`,
            `** ⅔ Mehrheit bei ${zwei}`,
          ),
          { type: 'paragraph' },
        ],
        isJson: true,
      },
      {
        id: 'abstimmung',
        label: 'Abstimmung',
        prompt: [
          { key: 'ja',        label: 'Ja',           default: 'X' },
          { key: 'nein',      label: 'Nein',         default: 'Y' },
          { key: 'enth',      label: 'Enthaltung',   default: 'Z' },
          { key: 'ergebnis',  label: 'Ergebnis',     default: 'angenommen' },
        ],
        template: ({ ja, nein, enth, ergebnis }) => [
          ...p(`Abstimmung: Der Antrag wurde mit Ja: ${ja} Nein: ${nein} Enthaltung: ${enth} ${ergebnis}.`),
          { type: 'paragraph' },
        ],
        isJson: true,
      },
      {
        id: 'wahlen',
        label: 'Wahlen',
        prompt: [
          { key: 'nr',      label: 'Wahlpunkt-Nr.',  default: 'X.X' },
          { key: 'titel',   label: 'Wahlpunkt',      default: '' },
          { key: 'ergebnis', label: 'Ergebnis',      default: 'keine' },
        ],
        template: ({ nr, titel, ergebnis }) => [
          { type: 'heading', attrs: { level: 3 }, content: [{ type: 'text', text: `${nr} ${titel}` }] },
          ...p(`* ${ergebnis}`),
          { type: 'paragraph' },
        ],
        isJson: true,
      },
      {
        id: 'barcamp',
        label: 'Barcamp',
        prompt: [
          { key: 'titel',       label: 'Titel',             default: '' },
          { key: 'name',        label: 'Name (Hochschule)', default: '' },
          { key: 'beschreibung', label: 'Beschreibung',     default: '' },
        ],
        template: ({ titel, name, beschreibung }) => [
          ...p(
            `*${titel}`,
            `**${name}`,
            `**${beschreibung}`,
            `**${name} berichtet: `,
          ),
          { type: 'paragraph' },
        ],
        isJson: true,
      },
      {
        id: 'sitzungsvorstand',
        label: 'Sitzungsvorstand',
        prompt: [
          { key: 'name',      label: 'Vorname Nachname', default: '' },
          { key: 'uni',       label: 'Universität',      default: '' },
          { key: 'funktion',  label: 'Funktion',         default: '' },
        ],
        template: ({ name, uni, funktion }) => [
          ...p(`**${name} (Universität ${uni} – ${funktion})`),
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

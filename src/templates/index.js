export const TEMPLATE_GROUPS = [
  {
    label: 'Format',
    buttons: [
      { id: 'h2',     label: 'H2',      tooltip: 'Abschnittsüberschrift',  wrap: ['== ', ' =='] },
      { id: 'h3',     label: 'H3',      tooltip: 'Unterüberschrift',       wrap: ['=== ', ' ==='] },
      { id: 'h4',     label: 'H4',      tooltip: 'Unter-Unterüberschrift', wrap: ['==== ', ' ===='] },
      { id: 'bold',   label: 'F',       tooltip: 'Fett (Strg+B)',          wrap: ["'''", "'''"] },
      { id: 'italic', label: 'K',       tooltip: 'Kursiv (Strg+I)',        wrap: ["''", "''"] },
      { id: 'link',   label: 'Link',    tooltip: 'Interner Link',
        prompt: [
          { key: 'ziel', label: 'Linkziel', default: '' },
          { key: 'text', label: 'Anzeigetext (optional)', default: '' },
        ],
        template: ({ ziel, text }) => text ? `[[${ziel}|${text}]]` : `[[${ziel}]]`,
      },
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
          return `== Sitzungsprotokoll ==\n; Datum: ${date}\n; Beginn: ${time} Uhr\n; Ort:\n; Sitzungsleitung:\n; Protokoll:\n; Anwesend:\n\n----\n`
        },
      },
      {
        id: 'top',
        label: 'TOP',
        prompt: [
          { key: 'nr', label: 'TOP-Nummer', default: '1' },
          { key: 'titel', label: 'Titel', default: '' },
        ],
        template: ({ nr, titel }) => `\n=== TOP ${nr}: ${titel} ===\n\n`,
      },
      {
        id: 'pause',
        label: 'Pause',
        prompt: [
          { key: 'von', label: 'Von', default: '' },
          { key: 'bis', label: 'Bis', default: '' },
        ],
        template: ({ von, bis }) => `\n''Sitzungsunterbrechung: ${von} – ${bis} Uhr''\n`,
      },
      {
        id: 'ende',
        label: 'Sitzungsende',
        template: () => {
          const time = new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
          return `\n----\n''Ende der Sitzung: ${time} Uhr''\n\n[[Kategorie:Protokoll]]\n`
        },
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
        template: ({ name }) => `:'''${name}:''' `,
      },
      {
        id: 'meinungsbild',
        label: 'Meinungsbild',
        prompt: [
          { key: 'frage', label: 'Frage', default: '' },
          { key: 'd', label: 'Dafür', default: '0' },
          { key: 'g', label: 'Dagegen', default: '0' },
          { key: 'e', label: 'Enthaltungen', default: '0' },
        ],
        template: ({ frage, d, g, e }) =>
          `\n'''Meinungsbild:''' ${frage}\n: Dafür: ${d} &bull; Dagegen: ${g} &bull; Enthaltungen: ${e}\n`,
      },
    ],
  },
  {
    label: 'Beschlüsse',
    buttons: [
      {
        id: 'antrag',
        label: 'Antrag',
        prompt: [
          { key: 'name', label: 'Antragsteller/in', default: '' },
          { key: 'text', label: 'Antragstext', default: '' },
        ],
        template: ({ name, text }) =>
          `\n====Antrag====\n{{Antrag\n| Antragsteller = ${name}\n| Antragstext = ${text}\n| Ergebnis = \n}}\n`,
      },
      {
        id: 'abstimmung',
        label: 'Abstimmung',
        prompt: [
          { key: 'd', label: 'Dafür', default: '0' },
          { key: 'g', label: 'Dagegen', default: '0' },
          { key: 'e', label: 'Enthaltungen', default: '0' },
          { key: 'ergebnis', label: 'Ergebnis', default: 'angenommen' },
        ],
        template: ({ d, g, e, ergebnis }) =>
          `\n====Abstimmung====\n{| class="wikitable"\n|-\n! Dafür !! Dagegen !! Enthaltungen\n|-\n| ${d} || ${g} || ${e}\n|}\n'''Ergebnis:''' ${ergebnis}\n`,
      },
      {
        id: 'beschluss',
        label: 'Beschluss',
        prompt: [
          { key: 'text', label: 'Beschlusstext', default: '' },
          { key: 'd', label: 'Dafür', default: '0' },
          { key: 'g', label: 'Dagegen', default: '0' },
          { key: 'e', label: 'Enthaltungen', default: '0' },
        ],
        template: ({ text, d, g, e }) =>
          `\n{{Beschluss|\nDas Plenum beschließt: ${text}\n|Abstimmung: ${d} – ${g} – ${e} (Dafür – Dagegen – Enthaltungen)}}\n`,
      },
    ],
  },
  {
    label: 'Listen',
    buttons: [
      { id: 'ul',    label: '• Liste',   template: () => '\n* Punkt 1\n* Punkt 2\n* Punkt 3\n' },
      { id: 'ol',    label: '1. Liste',  template: () => '\n# Punkt 1\n# Punkt 2\n# Punkt 3\n' },
      { id: 'hr',    label: '—',         template: () => '\n----\n' },
      { id: 'table', label: 'Tabelle',   template: () => '\n{| class="wikitable"\n|-\n! Spalte 1 !! Spalte 2\n|-\n| Zelle 1 || Zelle 2\n|}\n' },
    ],
  },
]

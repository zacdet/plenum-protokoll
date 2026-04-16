/**
 * Alle MediaWiki-Templates für das Plenum-Protokoll
 */

export const TEMPLATE_GROUPS = [
  {
    label: 'Struktur',
    buttons: [
      {
        id: 'sitzungskopf',
        label: 'Sitzungskopf',
        template: () => {
          const date = new Date().toLocaleDateString('de-DE')
          const time = new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
          return `== Sitzungsprotokoll ==
; Datum: ${date}
; Beginn: ${time} Uhr
; Ort:
; Sitzungsleitung:
; Protokoll:
; Anwesend:

----\n`
        },
      },
      {
        id: 'top',
        label: 'TOP',
        prompt: [
          { key: 'nr', label: 'TOP-Nummer', default: '1' },
          { key: 'titel', label: 'Titel', default: 'Titel' },
        ],
        template: ({ nr, titel }) => `\n=== TOP ${nr}: ${titel} ===\n\n`,
      },
      {
        id: 'sitzungsende',
        label: 'Sitzungsende',
        template: () => {
          const time = new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
          return `\n----\n''Ende der Sitzung: ${time} Uhr''\n\n[[Kategorie:Protokoll]]\n`
        },
      },
      {
        id: 'pause',
        label: 'Pause',
        prompt: [
          { key: 'von', label: 'Von (Uhrzeit)', default: '' },
          { key: 'bis', label: 'Bis (Uhrzeit)', default: '' },
        ],
        template: ({ von, bis }) => `\n''Sitzungsunterbrechung: ${von} – ${bis} Uhr''\n`,
      },
    ],
  },
  {
    label: 'Verlauf',
    buttons: [
      {
        id: 'redebeitrag',
        label: 'Redebeitrag',
        prompt: [
          { key: 'name', label: 'Name', default: '' },
        ],
        template: ({ name }) => `:'''${name}:''' `,
      },
      {
        id: 'wortmeldung',
        label: 'Wortmeldung',
        template: () => `: `,
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
    label: 'Formatierung',
    buttons: [
      {
        id: 'fett',
        label: 'Fett',
        template: () => `'''fett'''`,
        wrap: true,
        wrapWith: ["'''", "'''"],
      },
      {
        id: 'kursiv',
        label: 'Kursiv',
        template: () => `''kursiv''`,
        wrap: true,
        wrapWith: ["''", "''"],
      },
      {
        id: 'liste',
        label: 'Liste',
        template: () => `\n* Punkt 1\n* Punkt 2\n* Punkt 3\n`,
      },
      {
        id: 'tabelle',
        label: 'Tabelle',
        template: () =>
          `\n{| class="wikitable"\n|-\n! Spalte 1 !! Spalte 2 !! Spalte 3\n|-\n| Zelle 1 || Zelle 2 || Zelle 3\n|}\n`,
      },
      {
        id: 'link',
        label: 'Link',
        prompt: [
          { key: 'ziel', label: 'Linkziel', default: 'Seite' },
          { key: 'text', label: 'Anzeigetext', default: '' },
        ],
        template: ({ ziel, text }) => text ? `[[${ziel}|${text}]]` : `[[${ziel}]]`,
      },
    ],
  },
]

/** The quiz's own texts. Its Czech twin is typed against these keys, so a key missing there is a compile error. */
export const en = {
  title: 'Czech verb trainer',
  intro: 'Fill in all six present-tense forms of the verb, then check your answers.',
  empty: 'There are no verbs to practise yet.',

  'prompt.label': 'Conjugate',
  'cell.1sg': 'I (1st sg.)',
  'cell.1pl': 'we (1st pl.)',
  'cell.2sg': 'you (2nd sg.)',
  'cell.2pl': 'you (2nd pl.)',
  'cell.3sg': 'he / she / it (3rd sg.)',
  'cell.3pl': 'they (3rd pl.)',
  'answer.label': 'All correct forms:',
  next: 'Next verb',
  'help.reflexive': 'For reflexive verbs, type the particle too (se / si), e.g. bojím se.',

  'meter.cells': 'Forms correct',
  'meter.items': 'Verbs fully correct',
}

export type VerbPresentTextKey = keyof typeof en

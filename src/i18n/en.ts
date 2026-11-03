export const en = {
  'app.title': 'Czech verb trainer',
  'app.intro': 'Fill in all six present-tense forms of the verb, then check your answers.',
  'prompt.label': 'Conjugate',
  'language.label': 'Language',
  'language.switchLabel': 'EN',

  'verbPresent.1sg': 'I (1st sg.)',
  'verbPresent.1pl': 'we (1st pl.)',
  'verbPresent.2sg': 'you (2nd sg.)',
  'verbPresent.2pl': 'you (2nd pl.)',
  'verbPresent.3sg': 'he / she / it (3rd sg.)',
  'verbPresent.3pl': 'they (3rd pl.)',

  'cell.check': 'Check',
  'checkAll': 'Check all',
  'next': 'Next verb',

  'chars.label': 'Insert special character',
  'help.title': 'Typing shortcuts',
  'help.reflexive': 'For reflexive verbs, type the particle too (se / si), e.g. bojím se.',

  'scores.title': 'Score',
  'scores.cells': 'Forms correct',
  'scores.items': 'Verbs fully correct',
  'scores.reset': 'Reset scores',
  'scores.resetConfirm': 'Reset all scores? This cannot be undone.',

  'status.loading': 'Loading…',
  'status.loadError': 'Could not load the exercise data. If you are running this locally, run "npm run scrape" first.',
  'status.empty': 'There are no verbs to practise yet.',
} as const

export type TranslationKey = keyof typeof en

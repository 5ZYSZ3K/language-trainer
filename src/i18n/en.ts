/**
 * The shell's own texts. What a quiz type or the type-in blocks show lives with them. Its Czech twin is typed against
 * these keys, so a key missing there is a compile error.
 */
export const en = {
  'language.label': 'Language',
  'language.switchLabel': 'EN',

  'scores.title': 'Score',
  'scores.reset': 'Reset scores',
  'scores.resetConfirm': 'Reset all scores? This cannot be undone.',

  'status.loading': 'Loading…',
  'status.loadError': 'Could not load the exercise data. If you are running this locally, run "npm run scrape" first.',
}

export type TranslationKey = keyof typeof en

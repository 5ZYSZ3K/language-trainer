/**
 * The shell's own texts. What a quiz type or the type-in blocks show lives with them. Its Czech twin is typed against
 * these keys, so a key missing there is a compile error.
 */
export const en = {
  'language.label': 'Language',
  'language.switchLabel': 'EN',

  'selector.language': 'Language to learn',
  'selector.quiz': 'Exercise',

  /** After the name of a source that is not trusted, in the selector. */
  'source.unverified': 'unverified',
  'notice.title': 'Unverified source:',
  'notice.text': 'these answers have not been checked against an authoritative reference.',
  'notice.source': 'Source:',

  'scores.title': 'Score',
  'scores.reset': 'Reset scores',
  'scores.resetConfirm': 'Reset all scores? This cannot be undone.',

  'status.loading': 'Loading…',
  'status.loadError': 'Could not load the exercise data. If you are running this locally, run "npm run scrape:cs:verbs" or "npm run scrape:cs:nouns" first.',
}

export type TranslationKey = keyof typeof en

/** The quiz's own texts. Its Czech twin is typed against these keys, so a key missing there is a compile error. */
export const en = {
  title: 'Czech adjectives with nouns',
  name: 'Adjectives with nouns',
  intro: 'Fill in the adjective and the noun in the form the sentence needs, then check your answers. Use Filters to practise only some cases.',
  empty: 'There are no nouns to practise yet.',

  'case.nom': '1. nominative',
  'case.gen': '2. genitive',
  'case.dat': '3. dative',
  'case.acc': '4. accusative',
  'case.voc': '5. vocative',
  'case.loc': '6. locative',
  'case.ins': '7. instrumental',
  'number.sg': 'singular',
  'number.pl': 'plural',
  /** The case and the number a sentence asks for, after the adjective and the noun: "dobrý · advokát — 3. dative, singular". */
  form: '{case}, {number}',
  'field.adjective': 'The adjective',
  'field.noun': 'The noun',
  nothing: 'The current filters leave nothing to ask for.',
  next: 'Next sentence',

  'filters.open': 'Filters',
  'filters.title': 'Cases to practise',
  'filters.hint': 'Tick the cases you want to be asked for.',
  'filters.selectAll': 'Select all',
  'filters.clearAll': 'Clear all',
  'filters.done': 'Done',

  'meter.adjectives': 'Adjective forms correct',
  'meter.nouns': 'Noun forms correct',
  'meter.sentences': 'Sentences fully correct',
}

export type AdjectiveNounTextKey = keyof typeof en

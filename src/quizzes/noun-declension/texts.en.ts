/** The quiz's own texts. Its Czech twin is typed against these keys, so a key missing there is a compile error. */
export const en = {
  title: 'Czech noun trainer',
  name: 'Nouns: declension',
  intro: 'Fill in the forms of the noun in every case, then check your answers. Use Filters to practise only some forms.',
  empty: 'There are no nouns to practise yet.',

  'prompt.label': 'Decline',
  'case.nom': '1. nominative',
  'case.gen': '2. genitive',
  'case.dat': '3. dative',
  'case.acc': '4. accusative',
  'case.voc': '5. vocative',
  'case.loc': '6. locative',
  'case.ins': '7. instrumental',
  'number.sg': 'Singular',
  'number.pl': 'Plural',
  'given.label': 'given',
  'answer.label': 'All correct forms:',
  next: 'Next noun',

  'filters.open': 'Filters',
  'filters.title': 'Forms to practise',
  'filters.hint': 'Tick the forms you want to be asked for. A row or column heading switches the whole row or column.',
  'filters.selectAll': 'Select all',
  'filters.clearAll': 'Clear all',
  'filters.done': 'Done',

  'meter.cells': 'Forms correct',
  'meter.items': 'Nouns fully correct',
}

export type NounDeclensionTextKey = keyof typeof en

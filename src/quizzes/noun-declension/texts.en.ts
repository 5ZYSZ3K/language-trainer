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
  nothing: 'The current filters leave nothing to ask for.',
  'given.label': 'given',
  'answer.label': 'All correct forms:',
  next: 'Next noun',
  'goTo.label': 'Go to noun:',
  'goTo.notFound': 'No noun “{word}” in this list.',

  // A label per remark code (NOUN_REMARK_CODES in ./remarks), and the shared explanation (HTML) of every code that has
  // one. `meaning` has none: only the noun's own explanation can say which meaning is which.
  'remark.dual': 'dual',
  'remark.non-final': 'before another noun',
  'remark.meaning': 'other meaning',
  'remark-explanation.dual':
    'A dual form, left over from the old dual number. Czech keeps it for things that come in pairs, above all parts of the body (<em>rukama</em>, <em>nohama</em>, <em>očima</em>). Where a noun has both, the dual form is the usual one for the body part, and the ordinary plural form for its other meanings.',
  'remark-explanation.non-final':
    'The form for a noun that comes before another one in a string of nouns, such as a title before a name: in the dative and locative singular, only the last noun takes <em>-ovi</em>, and the ones before it take <em>-u</em> (<em>panu doktoru Novákovi</em>).',
  'explanation.open': 'Explain this form',
  'explanation.close': 'Close',

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

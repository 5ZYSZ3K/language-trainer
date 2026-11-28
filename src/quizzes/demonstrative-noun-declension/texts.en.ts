import type { GoverningCase } from '../adjective-noun-declension/sentence-items'
import type { SentenceTextKey } from '../adjective-noun-declension/sentence-texts'

/**
 * The quiz's own texts, with every text a sentence quiz has for the cases it offers (all but the vocative). Its Czech
 * twin is typed against these keys, so a key missing there is a compile error.
 */
export const en = {
  title: 'Czech demonstratives with nouns',
  name: 'Demonstratives with nouns',
  intro: 'Fill in the demonstrative pronoun and the noun in the form the sentence needs, then check your answers. Use Filters to practise only some forms.',
  empty: 'There are no nouns to practise yet.',

  'case.nom': '1. nominative',
  'case.gen': '2. genitive',
  'case.dat': '3. dative',
  'case.acc': '4. accusative',
  'case.loc': '6. locative',
  'case.ins': '7. instrumental',
  'number.sg': 'singular',
  'number.pl': 'plural',
  /**
   * The case and the number of a form: what a sentence asks for, after the pronoun and the noun ("ten · advokát — 3.
   * dative, singular"), and the name of its checkbox in the filter.
   */
  form: '{case}, {number}',
  'field.pronoun': 'The demonstrative pronoun',
  'field.noun': 'The noun',
  nothing: 'The current filters leave nothing to ask for.',
  next: 'Next sentence',

  'filters.open': 'Filters',
  'filters.title': 'Forms to practise',
  'filters.hint': 'Tick the forms you want to be asked for. A row or column heading switches the whole row or column.',
  /** The filter's column headings, one per number. */
  'filters.number.sg': 'Singular',
  'filters.number.pl': 'Plural',
  'filters.selectAll': 'Select all',
  'filters.clearAll': 'Clear all',
  'filters.done': 'Done',

  'meter.pronouns': 'Pronoun forms correct',
  'meter.nouns': 'Noun forms correct',
  'meter.sentences': 'Sentences fully correct',
} satisfies Record<SentenceTextKey<GoverningCase> | 'field.pronoun', string> & Record<string, string>

export type DemonstrativeNounTextKey = keyof typeof en

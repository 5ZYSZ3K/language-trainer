import type { GoverningCase } from '../adjective-noun-declension/sentence-items'
import type { SentenceTextKey } from '../adjective-noun-declension/sentence-texts'
import type { PronounRemark } from './tables'

/**
 * The quiz's own texts, with every text a sentence quiz has for the cases it offers (all but the vocative) and a chip
 * label for every remark a pronoun's variant may have. Its Czech twin is typed against these keys, so a key missing there
 * is a compile error.
 */
export const en = {
  title: 'Czech personal pronouns',
  name: 'Personal pronouns',
  intro: 'Replace the noun with its personal pronoun, in the form the sentence needs, then check your answer. Use Filters to practise only some forms.',
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
   * The case and the number of a form: what a sentence asks for, after the noun ("advokát — 3. dative, singular"), and
   * the name of its checkbox in the filter.
   */
  form: '{case}, {number}',
  'field.pronoun': 'The personal pronoun',
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

  /** The chips after an accepted form in a wrong field's answer line, one per remark. */
  'remark.less-commonly-used': 'less common',
  'remark.unstressed-not-sentence-initial': 'unstressed',
  'remark.ijp-animate-only': 'IJP: animate only',

  'meter.pronouns': 'Pronouns correct',
} satisfies Record<SentenceTextKey<GoverningCase> | 'field.pronoun' | `remark.${PronounRemark}`, string> & Record<string, string>

export type PersonalPronounTextKey = keyof typeof en

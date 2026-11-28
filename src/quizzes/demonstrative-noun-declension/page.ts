import { GOVERNING_CASES, type GoverningCase, type SentenceNounItem } from '../adjective-noun-declension/sentence-items'
import { TwoFieldSentencePage, type SentencePageHost, type TwoFieldSentenceRules } from '../adjective-noun-declension/sentence-page'
import type { DemonstrativeNounItem } from './items'
import type { DemonstrativeTable } from './tables'

/** The meter of each field, in field order (the pronoun, then the noun), and the meter of whole sentences. */
export const FIELD_METERS = ['pronouns', 'nouns'] as const
export const SENTENCE_METER = 'sentences'

export interface DemonstrativePageDeps extends SentencePageHost {
  readonly items: readonly DemonstrativeNounItem[]
  readonly table: DemonstrativeTable
}

/**
 * The rules of demonstratives with nouns: the demonstrative pronoun in the first blank, shown as `table.baseForm` (`ten`)
 * whatever the noun, its accepted form the table's for the round's case and number and the noun's gender (its plural
 * gender in the plural); every case but the vocative, which the pronoun does not have.
 */
export const demonstrativeRules = (table: DemonstrativeTable): TwoFieldSentenceRules<SentenceNounItem, 'pronoun', GoverningCase> => ({
  kind: 'pronoun',
  cases: GOVERNING_CASES,
  baseForm: () => table.baseForm,
  acceptedForms: (_baseForm, form) => [table.form(form)],
})

/**
 * The page of demonstratives with nouns without its DOM: the page of a sentence quiz of two fields (see
 * TwoFieldSentencePage) with the demonstrative pronoun in the first blank, its form from the language's table, in every
 * case but the vocative.
 */
export class DemonstrativePage extends TwoFieldSentencePage<SentenceNounItem, 'pronoun', GoverningCase> {
  constructor({ table, ...deps }: DemonstrativePageDeps) {
    super({ ...deps, rules: demonstrativeRules(table), meters: { fields: FIELD_METERS, sentence: SENTENCE_METER } })
  }
}

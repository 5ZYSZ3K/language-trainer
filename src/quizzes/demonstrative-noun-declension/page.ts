import { GOVERNING_CASES, type GoverningCase, type SentenceNounItem } from '../adjective-noun-declension/sentence-items'
import { SentenceQuizPage, type SentenceQuizRules } from '../adjective-noun-declension/sentence-page'
import type { QuizSettings } from '../quiz-type'
import type { DemonstrativeNounItem } from './items'
import type { DemonstrativeTable } from './tables'

/** The meter of each field, in field order (the pronoun, then the noun), and the meter of whole sentences. */
export const FIELD_METERS = ['pronouns', 'nouns'] as const
export const SENTENCE_METER = 'sentences'

export interface DemonstrativePageDeps {
  readonly items: readonly DemonstrativeNounItem[]
  readonly table: DemonstrativeTable
  /** The quiz's saved settings for the pool: the filter, a case and a number each (the noun quiz's). */
  readonly settings: QuizSettings
  record(meterId: string, correct: boolean): void
  /** Returns [0, 1), like Math.random. */
  readonly random: () => number
}

/**
 * The rules of demonstratives with nouns: the demonstrative pronoun in the first blank, shown as `table.baseForm` (`ten`)
 * whatever the noun, its accepted form the table's for the round's case and number and the noun's gender (its plural
 * gender in the plural); every case but the vocative, which the pronoun does not have.
 */
export const demonstrativeRules = (table: DemonstrativeTable): SentenceQuizRules<SentenceNounItem, 'pronoun', GoverningCase> => ({
  kind: 'pronoun',
  cases: GOVERNING_CASES,
  baseForm: () => table.baseForm,
  acceptedForms: (_baseForm, form) => [table.form(form)],
})

/**
 * The page of demonstratives with nouns without its DOM: the sentence quiz page (see SentenceQuizPage) with the
 * demonstrative pronoun in the first blank, its form from the language's table, in every case but the vocative.
 */
export class DemonstrativePage extends SentenceQuizPage<SentenceNounItem, 'pronoun', GoverningCase> {
  constructor({ table, ...deps }: DemonstrativePageDeps) {
    super({ ...deps, rules: demonstrativeRules(table), meters: { fields: FIELD_METERS, sentence: SENTENCE_METER } })
  }
}

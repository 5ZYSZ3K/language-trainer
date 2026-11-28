import type { CaseId } from '../noun-declension/cells'
import type { QuizSettings } from '../quiz-type'
import { ADJECTIVE_DRAW } from './draw'
import type { AdjectiveDeclensionGenerator } from './generators'
import type { AdjectiveNounItem, PairedNounItem } from './items'
import { SentenceQuizPage, type SentenceQuizRules } from './sentence-page'

/** The meter of each field, in field order (the adjective, then the noun), and the meter of whole sentences. */
export const FIELD_METERS = ['adjectives', 'nouns'] as const
export const SENTENCE_METER = 'sentences'

export interface SentencePageDeps {
  readonly items: readonly AdjectiveNounItem[]
  readonly generator: AdjectiveDeclensionGenerator
  /** The quiz's saved settings for the pool: the filter, a case and a number each (the noun quiz's). */
  readonly settings: QuizSettings
  record(meterId: string, correct: boolean): void
  /** Returns [0, 1), like Math.random. */
  readonly random: () => number
}

/** The rules of adjectives with nouns: one of the noun's adjectives, declined by the generator, in any of the seven cases. */
export const adjectiveRules = (generator: AdjectiveDeclensionGenerator): SentenceQuizRules<PairedNounItem, 'adjective', CaseId> => ({
  ...ADJECTIVE_DRAW,
  acceptedForms: (adjective, form) => generator.decline(adjective, form),
})

/**
 * The page of adjectives with nouns without its DOM: the sentence quiz page (see SentenceQuizPage) with an adjective in
 * the first blank, its forms from the language's adjective declension generator.
 */
export class SentencePage extends SentenceQuizPage<PairedNounItem, 'adjective', CaseId> {
  constructor({ generator, ...deps }: SentencePageDeps) {
    super({ ...deps, rules: adjectiveRules(generator), meters: { fields: FIELD_METERS, sentence: SENTENCE_METER } })
  }
}

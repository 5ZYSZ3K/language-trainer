import type { CaseId } from '../noun-declension/cells'
import { ADJECTIVE_DRAW } from './draw'
import type { AdjectiveDeclensionGenerator } from './generators'
import type { AdjectiveNounItem, PairedNounItem } from './items'
import { TwoFieldSentencePage, type SentencePageHost, type TwoFieldSentenceRules } from './sentence-page'

/** The meter of each field, in field order (the adjective, then the noun), and the meter of whole sentences. */
export const FIELD_METERS = ['adjectives', 'nouns'] as const
export const SENTENCE_METER = 'sentences'

export interface SentencePageDeps extends SentencePageHost {
  readonly items: readonly AdjectiveNounItem[]
  readonly generator: AdjectiveDeclensionGenerator
}

/** The rules of adjectives with nouns: one of the noun's adjectives, declined by the generator, in any of the seven cases. */
export const adjectiveRules = (generator: AdjectiveDeclensionGenerator): TwoFieldSentenceRules<PairedNounItem, 'adjective', CaseId> => ({
  ...ADJECTIVE_DRAW,
  acceptedForms: (adjective, form) => generator.decline(adjective, form),
})

/**
 * The page of adjectives with nouns without its DOM: the page of a sentence quiz of two fields (see TwoFieldSentencePage)
 * with an adjective in the first blank, its forms from the language's adjective declension generator.
 */
export class SentencePage extends TwoFieldSentencePage<PairedNounItem, 'adjective', CaseId> {
  constructor({ generator, ...deps }: SentencePageDeps) {
    super({ ...deps, rules: adjectiveRules(generator), meters: { fields: FIELD_METERS, sentence: SENTENCE_METER } })
  }
}

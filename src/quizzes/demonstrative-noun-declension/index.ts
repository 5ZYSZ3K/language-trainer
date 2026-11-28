import type { Meter, QuizType } from '../quiz-type'
import { demonstrativeNounContract, type DemonstrativeNounItem } from './items'
import { mountDemonstrativeNounDeclension } from './mount'
import { FIELD_METERS, SENTENCE_METER } from './page'
import { demonstrativeNounTexts, type DemonstrativeNounTextKey } from './texts'

export { DEMONSTRATIVE_TABLES, type DemonstrativeTable } from './tables'
export { demonstrativeNounContract, type DemonstrativeNounItem } from './items'

// The page records into these (see page.ts): one meter per field, in field order, and one for whole sentences.
const meters: readonly Meter<DemonstrativeNounTextKey>[] = [
  { id: FIELD_METERS[0], label: 'meter.pronouns' },
  { id: FIELD_METERS[1], label: 'meter.nouns' },
  { id: SENTENCE_METER, label: 'meter.sentences' },
]

/**
 * Decline the demonstrative pronoun (`ten`, `ta`, `to`) together with its noun, in the case a sentence's governing verb
 * asks for: adjectives with nouns, with the pronoun in the adjective's place and no vocative. The items are the nouns
 * and the governing verbs (a joined dataset); the pronoun's accepted form comes from the language's table.
 */
export const demonstrativeNounDeclension: QuizType<DemonstrativeNounItem> = {
  id: 'demonstrative-noun-declension',
  contract: demonstrativeNounContract,
  meters,
  texts: demonstrativeNounTexts,
  mount: mountDemonstrativeNounDeclension,
}

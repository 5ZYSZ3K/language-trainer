import type { Meter, QuizType } from '../quiz-type'
import { adjectiveNounContract, type AdjectiveNounItem } from './items'
import { mountAdjectiveNounDeclension } from './mount'
import { FIELD_METERS, SENTENCE_METER } from './page'
import { adjectiveNounTexts, type AdjectiveNounTextKey } from './texts'

export { ADJECTIVE_DECLENSION_GENERATORS, type AdjectiveDeclensionGenerator, type AdjectiveForm } from './generators'
export {
  adjectiveNounContract,
  GOVERNING_CASES,
  PERSONS,
  type AdjectiveNounItem,
  type GoverningCase,
  type GoverningVerbItem,
  type PairedNounItem,
  type Person,
} from './items'
export { caseLabelKey, formText, numberLabelKey } from './texts'

// The page records into these (see page.ts): one meter per field, in field order, and one for whole sentences.
const meters: readonly Meter<AdjectiveNounTextKey>[] = [
  { id: FIELD_METERS[0], label: 'meter.adjectives' },
  { id: FIELD_METERS[1], label: 'meter.nouns' },
  { id: SENTENCE_METER, label: 'meter.sentences' },
]

/**
 * Decline an adjective together with its noun, in the case a sentence's governing verb asks for. The items are the
 * nouns, each with the adjectives it may be paired with, and the governing verbs (a joined dataset); the adjective's
 * accepted forms come from the language's adjective declension generator.
 */
export const adjectiveNounDeclension: QuizType<AdjectiveNounItem> = {
  id: 'adjective-noun-declension',
  contract: adjectiveNounContract,
  meters,
  texts: adjectiveNounTexts,
  mount: mountAdjectiveNounDeclension,
}

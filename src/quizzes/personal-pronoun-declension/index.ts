import type { Meter, QuizType } from '../quiz-type'
import { personalPronounContract, type PersonalPronounItem } from './items'
import { mountPersonalPronounDeclension } from './mount'
import { PRONOUN_METER } from './page'
import { personalPronounTexts, type PersonalPronounTextKey } from './texts'

export { PERSONAL_PRONOUN_TABLES, PRONOUN_REMARKS, type PersonalPronounTable, type PronounRemark, type PronounVariant } from './tables'
export { acceptedPronouns, POSITIONS, type Position } from './positions'
export {
  personalPronounContract,
  reflexiveOf,
  type PersonalPronounItem,
  type PronounVerbItem,
  type ReflexiveParticle,
} from './items'

// The page records into this one (see page.ts): the pronoun, the one field of every sentence.
const meters: readonly Meter<PersonalPronounTextKey>[] = [{ id: PRONOUN_METER, label: 'meter.pronouns' }]

/**
 * Replace a noun with its personal pronoun of the third person (`on`, `ona`, `ono`) in a sentence: `Pomáhám advokátovi.`
 * → `Pomáhám mu.` Where the noun stands (its position) decides which forms are right: only the `n-` forms after a
 * preposition (`Mluvím o něm.`), never an unstressed one at the start (`Jemu pomáhám.`). The items are the nouns and the
 * governing verbs (a joined dataset); the pronoun's accepted forms come from the language's table.
 */
export const personalPronounDeclension: QuizType<PersonalPronounItem> = {
  id: 'personal-pronoun-declension',
  contract: personalPronounContract,
  meters,
  texts: personalPronounTexts,
  mount: mountPersonalPronounDeclension,
}

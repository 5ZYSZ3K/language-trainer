import { declineAnAdjective } from './declension-of-adjectives_with_nouns'
import type { AdjectiveDeclensionGenerator } from './generators'
import { CZECH_CASES, CZECH_GENDERS, CZECH_NUMBERS, czechGenderOf } from './grammar-keys.cs'

// The owner's generator (declension-of-adjectives_with_nouns.ts) is used as it is; the keys the sentence quizzes share
// (grammar-keys.cs.ts) adapt it to the quiz's neutral ids, so a case, number or gender it lacks is a compile error.

/** Czech: hard (`-ý`), soft (`-í`) and possessive (`-ův`, `-in`) adjectives. */
export const czechAdjectiveDeclension: AdjectiveDeclensionGenerator = {
  genders: CZECH_GENDERS,
  decline(adjective, { caseId, number, gender, pluralGender }) {
    return declineAnAdjective({
      adjective,
      grammarCase: CZECH_CASES[caseId],
      grammarNumber: CZECH_NUMBERS[number],
      grammarGender: czechGenderOf(gender),
      ...(pluralGender === undefined ? {} : { pluralGrammarGender: czechGenderOf(pluralGender) }),
    })
  },
}

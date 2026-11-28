import type { CaseId, GrammaticalNumber } from '../noun-declension/cells'
import { declineAnAdjective, type GrammarCase, type GrammarGender, type GrammarNumber } from './declension-of-adjectives_with_nouns'
import type { AdjectiveDeclensionGenerator } from './generators'

// The owner's generator (declension-of-adjectives_with_nouns.ts) is used as it is; this adapts it to the quiz's
// neutral ids. Every key of the records below is required, so a case, number or gender it lacks is a compile error.

const CASES: Readonly<Record<CaseId, GrammarCase>> = {
  nom: 'nominativ',
  gen: 'genitiv',
  dat: 'dativ',
  acc: 'akuzativ',
  voc: 'vokativ',
  loc: 'lokál',
  ins: 'instrumentál',
}

const NUMBERS: Readonly<Record<GrammaticalNumber, GrammarNumber>> = { sg: 'singular', pl: 'plural' }

/** The generator's genders, which are worded as the noun dataset words them. */
const GENDERS: Readonly<Record<GrammarGender, true>> = { 'm. živ.': true, 'm. neživ.': true, 'ž.': true, 's.': true }

function genderOf(gender: string): GrammarGender {
  if (!Object.hasOwn(GENDERS, gender)) throw new Error(`unknown gender ${JSON.stringify(gender)}`)
  return gender as GrammarGender
}

/** Czech: hard (`-ý`), soft (`-í`) and possessive (`-ův`, `-in`) adjectives. */
export const czechAdjectiveDeclension: AdjectiveDeclensionGenerator = {
  genders: Object.keys(GENDERS),
  decline(adjective, { caseId, number, gender, pluralGender }) {
    return declineAnAdjective({
      adjective,
      grammarCase: CASES[caseId],
      grammarNumber: NUMBERS[number],
      grammarGender: genderOf(gender),
      ...(pluralGender === undefined ? {} : { pluralGrammarGender: genderOf(pluralGender) }),
    })
  },
}

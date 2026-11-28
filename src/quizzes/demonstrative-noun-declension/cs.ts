import type { GoverningCase } from '../adjective-noun-declension/sentence-items'
import type { GrammaticalNumber } from '../noun-declension/cells'
import { pointingPronoun, type GrammarCase, type GrammarGender, type GrammarNumber } from './pointing-pronouns'
import type { DemonstrativeTable } from './tables'

// The owner's table (pointing-pronouns.ts) is used as it is; this adapts it to the quiz's neutral ids. Every key of the
// records below is required, so a case, number or gender it lacks is a compile error. It has no vocative, and neither
// has the quiz.

const CASES: Readonly<Record<GoverningCase, GrammarCase>> = {
  nom: 'nominativ',
  gen: 'genitiv',
  dat: 'dativ',
  acc: 'akuzativ',
  loc: 'lokál',
  ins: 'instrumentál',
}

const NUMBERS: Readonly<Record<GrammaticalNumber, GrammarNumber>> = { sg: 'singular', pl: 'plural' }

/** The table's genders, which are worded as the noun dataset words them. */
const GENDERS: Readonly<Record<GrammarGender, true>> = { 'm. živ.': true, 'm. neživ.': true, 'ž.': true, 's.': true }

function genderOf(gender: string): GrammarGender {
  if (!Object.hasOwn(GENDERS, gender)) throw new Error(`unknown gender ${JSON.stringify(gender)}`)
  return gender as GrammarGender
}

/** Czech `ten`, `ta`, `to`. In the plural it agrees with the noun's plural gender, if it has one (`to dítě`, `ty děti`). */
export const czechDemonstratives: DemonstrativeTable = {
  baseForm: pointingPronoun('nominativ', 'singular', 'm. živ.'),
  genders: Object.keys(GENDERS),
  form: ({ caseId, number, gender, pluralGender }) =>
    pointingPronoun(CASES[caseId], NUMBERS[number], genderOf(number === 'pl' ? (pluralGender ?? gender) : gender)),
}

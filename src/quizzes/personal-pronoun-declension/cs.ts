import type { GoverningCase } from '../adjective-noun-declension/sentence-items'
import type { GrammaticalNumber } from '../noun-declension/cells'
import { pronoun, type GrammarCase, type GrammarGender, type GrammarNumber } from './base-pronouns'
import type { PersonalPronounTable, PronounRemark, PronounVariant } from './tables'

// The owner's table (base-pronouns.ts) is used as it is; this adapts it to the quiz's neutral ids. Every key of the
// records below is required, so a case, number or gender it lacks is a compile error, and so is a remark of its that
// the quiz has no chip for (see Entry). It has no vocative, and neither has the quiz.

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

/** A variant as the table writes it: a plain form, or a form with its remarks. */
type Entry = string | { readonly value: string; readonly remarks: readonly PronounRemark[] }

const variantOf = (entry: Entry): PronounVariant => (typeof entry === 'string' ? { value: entry } : { value: entry.value, remarks: [...entry.remarks] })

/**
 * Czech `on`, `ona`, `ono`, with the `j-` forms without a preposition and the `n-` forms after one. In the plural it
 * agrees with the noun's plural gender, if it has one (`ono`, `ony` for `dítě`, `děti`).
 */
export const czechPersonalPronouns: PersonalPronounTable = {
  genders: Object.keys(GENDERS),
  forms({ caseId, number, gender, pluralGender }, afterPreposition) {
    const entries: readonly Entry[] = pronoun(CASES[caseId], NUMBERS[number], genderOf(number === 'pl' ? (pluralGender ?? gender) : gender), afterPreposition)
    return entries.map(variantOf)
  },
}

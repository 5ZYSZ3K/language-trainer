import type { CaseId, GrammaticalNumber } from '../noun-declension/cells'
import type { AgreementForm } from './sentence-page'

// The keys the owner's Czech tables and generator look a form up by (`genitiv`, `plural`, `m. živ.`), by the quiz's
// neutral ids: what the Czech adapter of every sentence quiz shares. Each adapter hands these keys to the owner's
// function, which is typed by its own keys, so a case, number or gender the owner's file lacks is a compile error.

/** The case keys, for each of the seven cases. */
export const CZECH_CASES = {
  nom: 'nominativ',
  gen: 'genitiv',
  dat: 'dativ',
  acc: 'akuzativ',
  voc: 'vokativ',
  loc: 'lokál',
  ins: 'instrumentál',
} as const satisfies Readonly<Record<CaseId, string>>

export const CZECH_NUMBERS = { sg: 'singular', pl: 'plural' } as const satisfies Readonly<Record<GrammaticalNumber, string>>

/** The genders, which the owner's files word as the noun dataset words them. */
export const CZECH_GENDERS = ['m. živ.', 'm. neživ.', 'ž.', 's.'] as const
export type CzechGender = (typeof CZECH_GENDERS)[number]

/** `gender` as a gender key; throws for one that is not a Czech gender. */
export function czechGenderOf(gender: string): CzechGender {
  if (!(CZECH_GENDERS as readonly string[]).includes(gender)) throw new Error(`unknown gender ${JSON.stringify(gender)}`)
  return gender as CzechGender
}

/**
 * The keys of `form`, for a word that agrees with the noun: its case and number, and the noun's gender, or in the plural
 * its plural gender, if it has one (`to dítě`, `ty děti`). Throws for a gender that is not a Czech gender.
 */
export function czechKeysOf<C extends CaseId>({ caseId, number, gender, pluralGender }: AgreementForm<C>) {
  return {
    grammarCase: CZECH_CASES[caseId],
    grammarNumber: CZECH_NUMBERS[number],
    grammarGender: czechGenderOf(number === 'pl' ? (pluralGender ?? gender) : gender),
  }
}

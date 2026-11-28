import type { CaseId, GrammaticalNumber } from '../noun-declension/cells'
import { czechAdjectiveDeclension } from './cs'

/** Which form of an adjective is wanted: a case and a number, agreeing with a noun of `gender`. */
export interface AdjectiveForm {
  readonly caseId: CaseId
  readonly number: GrammaticalNumber
  /** The noun's gender, worded as the noun dataset words it (`m. živ.`). */
  readonly gender: string
  /** The gender the noun's plural agrees in, where it differs from `gender` (`dítě` is neuter, `děti` feminine). */
  readonly pluralGender?: string
}

/** A learned language's rules for declining any adjective by case, number and gender. */
export interface AdjectiveDeclensionGenerator {
  /** The genders it declines by, worded as the noun dataset words them. */
  readonly genders: readonly string[]
  /** Every accepted form of `adjective` in `form`. Throws for an adjective, or a gender, it cannot decline. */
  decline(adjective: string, form: AdjectiveForm): string[]
}

/**
 * The adjective declension generator of each learned language, by language id. A pool of the quiz needs one for its
 * language (a test checks that every provided pool has one); without it the quiz asks nothing and shows only its help.
 */
export const ADJECTIVE_DECLENSION_GENERATORS: Readonly<Partial<Record<string, AdjectiveDeclensionGenerator>>> = {
  cs: czechAdjectiveDeclension,
}

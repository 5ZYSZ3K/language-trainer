import type { AgreementForm } from '../adjective-noun-declension/sentence-page'
import type { GoverningCase } from '../adjective-noun-declension/sentence-items'
import { czechDemonstratives } from './cs'

/** A learned language's demonstrative pronoun (`ten`, `ta`, `to`): its one form for each case but the vocative, number and gender. */
export interface DemonstrativeTable {
  /** The form shown above every sentence, whatever the noun's gender, so that the gender is not given away (`ten`). */
  readonly baseForm: string
  /** The genders it declines by, worded as the noun dataset words them. */
  readonly genders: readonly string[]
  /**
   * Its form in `form`: the case and the number, agreeing with the noun's gender, or with its plural gender in the
   * plural. Throws for a gender it does not know.
   */
  form(form: AgreementForm<GoverningCase>): string
}

/**
 * The demonstrative pronoun table of each learned language, by language id. A pool of the quiz needs one for its
 * language (a test checks that every provided pool has one); without it the quiz asks nothing and shows only its help.
 */
export const DEMONSTRATIVE_TABLES: Readonly<Partial<Record<string, DemonstrativeTable>>> = {
  cs: czechDemonstratives,
}

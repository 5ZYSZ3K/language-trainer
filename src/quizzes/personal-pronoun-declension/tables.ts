import type { GoverningCase } from '../adjective-noun-declension/sentence-items'
import type { AgreementForm } from '../adjective-noun-declension/sentence-page'
import { czechPersonalPronouns } from './cs'

/**
 * The remarks a personal pronoun's variant may have, each with a chip in the quiz's texts (`remark.<code>`): a form less
 * common than the others, an unstressed form, which never starts a sentence (Czech `ho`, `mu`), and a form that IJP
 * gives only for an animate noun.
 */
export const PRONOUN_REMARKS = ['less-commonly-used', 'unstressed-not-sentence-initial', 'ijp-animate-only'] as const
export type PronounRemark = (typeof PRONOUN_REMARKS)[number]

/** One variant of the personal pronoun in a form: its value, an accepted form, and its remarks, if it has any. */
export interface PronounVariant {
  readonly value: string
  readonly remarks?: readonly PronounRemark[]
}

/**
 * A learned language's personal pronoun of the third person (`on`, `ona`, `ono`): its variants for each case but the
 * vocative, number and gender, without a preposition and after one.
 */
export interface PersonalPronounTable {
  /** The genders it declines by, worded as the noun dataset words them. */
  readonly genders: readonly string[]
  /**
   * Its variants in `form`, in the table's order: the case and the number, agreeing with the noun's gender, or with its
   * plural gender in the plural, without a preposition or after one (a case with one list gives it either way). Throws
   * for a gender it does not know.
   */
  forms(form: AgreementForm<GoverningCase>, afterPreposition: boolean): readonly PronounVariant[]
}

/**
 * The personal pronoun table of each learned language, by language id. A pool of the quiz needs one for its language (a
 * test checks that every provided pool has one); without it the quiz asks nothing and shows only its help.
 */
export const PERSONAL_PRONOUN_TABLES: Readonly<Partial<Record<string, PersonalPronounTable>>> = {
  cs: czechPersonalPronouns,
}

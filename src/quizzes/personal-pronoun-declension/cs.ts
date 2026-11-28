import { CZECH_GENDERS, czechKeysOf } from '../adjective-noun-declension/grammar-keys.cs'
import { pronoun } from './base-pronouns'
import type { PersonalPronounTable, PronounRemark, PronounVariant } from './tables'

// The owner's table (base-pronouns.ts) is used as it is; the keys the sentence quizzes share (grammar-keys.cs.ts) adapt
// it to the quiz's neutral ids, so a case, number or gender it lacks is a compile error, and so is a remark of its that
// the quiz has no chip for (see TableVariant). It has no vocative, and neither has the quiz.

/** A variant as the table writes it: a plain form, or a form with its remarks. */
type TableVariant = string | { readonly value: string; readonly remarks: readonly PronounRemark[] }

const variantOf = (variant: TableVariant): PronounVariant =>
  typeof variant === 'string' ? { value: variant } : { value: variant.value, remarks: [...variant.remarks] }

/**
 * Czech `on`, `ona`, `ono`, with the `j-` forms without a preposition and the `n-` forms after one. In the plural it
 * agrees with the noun's plural gender, if it has one (`ono`, `ony` for `dítě`, `děti`).
 */
export const czechPersonalPronouns: PersonalPronounTable = {
  genders: CZECH_GENDERS,
  forms(form, afterPreposition) {
    const { grammarCase, grammarNumber, grammarGender } = czechKeysOf(form)
    const variants: readonly TableVariant[] = pronoun(grammarCase, grammarNumber, grammarGender, afterPreposition)
    return variants.map(variantOf)
  },
}

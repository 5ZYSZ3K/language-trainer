import { CZECH_GENDERS, czechKeysOf } from '../adjective-noun-declension/grammar-keys.cs'
import { pointingPronoun } from './pointing-pronouns'
import type { DemonstrativeTable } from './tables'

// The owner's table (pointing-pronouns.ts) is used as it is; the keys the sentence quizzes share (grammar-keys.cs.ts)
// adapt it to the quiz's neutral ids, so a case, number or gender it lacks is a compile error. It has no vocative, and
// neither has the quiz.

/** Czech `ten`, `ta`, `to`. In the plural it agrees with the noun's plural gender, if it has one (`to dítě`, `ty děti`). */
export const czechDemonstratives: DemonstrativeTable = {
  baseForm: pointingPronoun('nominativ', 'singular', 'm. živ.'),
  genders: CZECH_GENDERS,
  form(form) {
    const { grammarCase, grammarNumber, grammarGender } = czechKeysOf(form)
    return pointingPronoun(grammarCase, grammarNumber, grammarGender)
  },
}

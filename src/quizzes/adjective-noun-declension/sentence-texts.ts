import type { CaseId, GrammaticalNumber } from '../noun-declension/cells'

/**
 * The texts every sentence quiz has, for the cases `C` it offers: what the shared page shows on its behalf (see
 * sentence-mount.ts and filter-dialog.ts). A quiz's texts also name its first field, `field.<kind>`, and hold its title,
 * name, intro, empty status and meters.
 */
export type SentenceTextKey<C extends CaseId = CaseId> =
  | `case.${C}`
  | `number.${GrammaticalNumber}`
  /**
   * The case and the number of a form: what a sentence asks for, after the words in their base forms ("dobrý · advokát
   * — 3. dative, singular"), and the name of its checkbox in the filter. `{case}` and `{number}` stand for the two.
   */
  | 'form'
  | 'field.noun'
  /** In place of the sentence, when the filter leaves nothing to ask for. */
  | 'nothing'
  /** The button that starts the next sentence, once both fields are checked. */
  | 'next'
  | 'filters.open'
  | 'filters.title'
  | 'filters.hint'
  /** The filter's column headings, one per number. */
  | `filters.number.${GrammaticalNumber}`
  | 'filters.selectAll'
  | 'filters.clearAll'
  | 'filters.done'

/** The key of a case's name: `case.<id>`. Typed against the texts, so a case without a name is a compile error. */
export const caseLabelKey = <C extends CaseId>(caseId: C): `case.${C}` => `case.${caseId}`

/** The key of a number's name: `number.<id>`. */
export const numberLabelKey = (number: GrammaticalNumber): `number.${GrammaticalNumber}` => `number.${number}`

/** The key of a number's column heading in the filter: `filters.number.<id>`. */
export const filterNumberKey = (number: GrammaticalNumber): `filters.number.${GrammaticalNumber}` => `filters.number.${number}`

/** The case and the number a sentence asks for, in the texts `translate` gives: "3. dative, singular". */
export const formText = <C extends CaseId>(
  translate: (key: 'form' | `case.${C}` | `number.${GrammaticalNumber}`) => string,
  caseId: C,
  number: GrammaticalNumber,
): string => translate('form').replace('{case}', translate(caseLabelKey(caseId))).replace('{number}', translate(numberLabelKey(number)))

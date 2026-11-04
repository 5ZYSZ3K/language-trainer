import type { NounDeclensionTextKey } from './texts.en'

const CASE_IDS = ['nom', 'gen', 'dat', 'acc', 'voc', 'loc', 'ins'] as const
const NUMBERS = ['sg', 'pl'] as const

export type CaseId = (typeof CASE_IDS)[number]
export type GrammaticalNumber = (typeof NUMBERS)[number]
export type NounCellId = `${CaseId}-${GrammaticalNumber}`

/**
 * The cases, named after what they are rather than numbered: the number a case goes by differs between languages
 * (Czech has the vocative fifth, Polish seventh), so a number would mean different things in different datasets.
 * The order is the Czech one, which is also the order of the page's rows.
 */
export const nounCaseIds: readonly CaseId[] = CASE_IDS
export const nounNumbers: readonly GrammaticalNumber[] = NUMBERS

export const nounCellId = (caseId: CaseId, number: GrammaticalNumber): NounCellId => `${caseId}-${number}`

/**
 * Every cell an item can have, in display order: the seven singular cases, then the seven plural ones. This is also
 * the order of Enter and Tab, and the order the cells of a stored item come in. An item holds only the cells that
 * exist, so a noun without a plural has just the singular ones.
 */
export const nounDeclensionCellIds: readonly NounCellId[] = NUMBERS.flatMap((number) => CASE_IDS.map((caseId) => nounCellId(caseId, number)))

/** The case and the number of a cell id; undefined for an id that is not one of `nounDeclensionCellIds`. */
export function partsOf(id: string): { caseId: CaseId; number: GrammaticalNumber } | undefined {
  const [caseId, number, ...rest] = id.split('-')
  const known = CASE_IDS.find((candidate) => candidate === caseId)
  const knownNumber = NUMBERS.find((candidate) => candidate === number)
  return known && knownNumber && rest.length === 0 ? { caseId: known, number: knownNumber } : undefined
}

/** The key, in the quiz's texts, of the label of a case: `case.<id>`. Typed against the texts, so a case without a label is a compile error. */
export const nounCaseLabelKey = (caseId: CaseId): NounDeclensionTextKey => `case.${caseId}`

/** The key of the heading of a number: `number.<id>`. */
export const nounNumberLabelKey = (number: GrammaticalNumber): NounDeclensionTextKey => `number.${number}`

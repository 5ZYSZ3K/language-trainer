import type { Contract } from '../../core/contract'
import { nounDeclensionCellIds } from '../noun-declension/cells'
import { isText, nounCellsProblems, nounPartsProblems, sentenceItemKey, sentenceItemProblems, type GoverningVerbItem, type SentenceNounItem } from './sentence-items'

export {
  GOVERNING_CASES,
  isGoverningCase,
  PERSONS,
  type GoverningCase,
  type GoverningVerbItem,
  type Person,
  type SentenceNounItem,
} from './sentence-items'

/**
 * A noun with the adjectives it may be paired with: what a round asks about. Its cells are those of the noun dataset,
 * every case, without the variants a noun has only before another noun and without any remark.
 */
export interface PairedNounItem extends SentenceNounItem {
  /** Base forms, each once. */
  adjectives: string[]
}

export type AdjectiveNounItem = PairedNounItem | GoverningVerbItem

/**
 * What the quiz needs of an item: a noun (`kind: 'noun'`) or a governing verb (`kind: 'verb'`).
 *
 * A noun has a non-empty `prompt` and `gender`, an optional non-empty `pluralGender`, a non-empty list of `adjectives`
 * (each a non-empty text, none twice) and `cells`: at least one, with ids among the noun quiz's cell ids, in their order
 * and without repeats, each with at least one variant and no remarks (this quiz shows none).
 *
 * A verb has a non-empty `verb`, an optional non-empty `subject` and `preposition`, a `case` among `GOVERNING_CASES`
 * and `forms`, a non-empty text for each of `PERSONS`. Other properties are ignored.
 */
export const adjectiveNounContract: Contract<AdjectiveNounItem> = {
  validateItem: (value) => sentenceItemProblems(value, nounProblems),
  keyOf: sentenceItemKey,
}

function nounProblems(value: Record<string, unknown>): string[] {
  const problems = nounPartsProblems(value)
  const adjectives = value.adjectives
  if (!Array.isArray(adjectives) || adjectives.length === 0 || !adjectives.every(isText)) {
    problems.push('adjectives must be a non-empty list of text')
  } else {
    const repeated = adjectives.find((adjective, i) => adjectives.indexOf(adjective) !== i)
    if (repeated !== undefined) problems.push(`the adjective ${JSON.stringify(repeated)} is there twice`)
  }
  return [...problems, ...nounCellsProblems(value.cells, nounDeclensionCellIds)]
}

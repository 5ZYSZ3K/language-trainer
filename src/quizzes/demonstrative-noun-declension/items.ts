import type { Contract } from '../../core/contract'
import {
  GOVERNING_CASE_CELL_IDS,
  nounCellsProblems,
  nounPartsProblems,
  sentenceItemKey,
  sentenceItemProblems,
  type GoverningVerbItem,
  type SentenceNounItem,
} from '../adjective-noun-declension/sentence-items'

/** A noun (`SentenceNounItem`, with no vocative cell) or a governing verb. */
export type DemonstrativeNounItem = SentenceNounItem | GoverningVerbItem

/**
 * What the quiz needs of an item: a noun (`kind: 'noun'`) or a governing verb (`kind: 'verb'`).
 *
 * A noun has a non-empty `prompt` and `gender`, an optional non-empty `pluralGender`, and `cells`: at least one, with
 * ids among the noun quiz's cell ids but the vocative ones, in their order and without repeats, each with at least one
 * variant and no remarks (this quiz shows none).
 *
 * A verb is as in adjectives with nouns: a non-empty `verb`, an optional non-empty `subject` and `preposition`, a
 * `case` among `GOVERNING_CASES` and `forms`, a non-empty text for each person. Other properties are ignored.
 */
export const demonstrativeNounContract: Contract<DemonstrativeNounItem> = {
  validateItem: (value) =>
    sentenceItemProblems(value, (noun) => [...nounPartsProblems(noun), ...nounCellsProblems(noun.cells, GOVERNING_CASE_CELL_IDS)]),
  keyOf: sentenceItemKey,
}

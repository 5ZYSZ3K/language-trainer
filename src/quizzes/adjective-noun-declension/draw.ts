import { pickNext } from '../../core/pick'
import { nounCaseIds, type CaseId } from '../noun-declension/cells'
import type { CellFilter } from '../noun-declension/filter'
import type { AdjectiveNounItem, GoverningVerbItem, PairedNounItem } from './items'
import { drawSentenceOf, splitItems as splitSentenceItems, type SentenceDraw, type SentenceRules } from './sentence-draw'

/** What one round asks: an adjective with its noun, in a case and a number, after a governing verb's form. */
export type Draw = SentenceDraw<PairedNounItem, 'adjective', CaseId>

/** The draw of adjectives with nouns: one of the noun's adjectives in the first blank, in any of the seven cases. */
export const ADJECTIVE_DRAW: SentenceRules<PairedNounItem, 'adjective', CaseId> = {
  kind: 'adjective',
  cases: nounCaseIds,
  baseForm: (noun, random) => pickNext(noun.adjectives, undefined, random),
}

/** The dataset's nouns and its governing verbs, each in dataset order. */
export const splitItems = (items: readonly AdjectiveNounItem[]): { nouns: PairedNounItem[]; verbs: GoverningVerbItem[] } => splitSentenceItems(items)

/**
 * A new round, each part drawn uniformly in turn: a noun (never `previous` again, unless it is the only one), one of
 * its adjectives, a case, a number, a governing verb followed by that case and a person and number for the verb (see
 * drawSentenceOf, the draw every sentence quiz shares). Undefined when nothing is left to draw.
 */
export const drawSentence = (
  nouns: readonly PairedNounItem[],
  verbs: readonly GoverningVerbItem[],
  filter: CellFilter,
  previous: PairedNounItem | undefined,
  random: () => number,
): Draw | undefined => drawSentenceOf(ADJECTIVE_DRAW, nouns, verbs, filter, previous, random)

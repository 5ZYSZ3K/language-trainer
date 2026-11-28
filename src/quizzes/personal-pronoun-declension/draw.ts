import { drawForm, drawNoun, drawPerson, pick } from '../adjective-noun-declension/sentence-draw'
import { GOVERNING_CASES, type GoverningCase, type Person, type SentenceNounItem } from '../adjective-noun-declension/sentence-items'
import type { GrammaticalNumber } from '../noun-declension/cells'
import type { CellFilter } from '../noun-declension/filter'
import type { PronounVerbItem } from './items'
import { fits, POSITIONS, type Position } from './positions'

/** What one round asks: the personal pronoun for a noun in a case and a number, where a governing verb's sentence puts the noun. */
export interface PronounDraw {
  readonly noun: SentenceNounItem
  readonly caseId: GoverningCase
  readonly number: GrammaticalNumber
  readonly position: Position
  /** After a preposition: whether the preposition starts the sentence (`O advokátovi mluvím.`). Otherwise false. */
  readonly prepositionFirst: boolean
  /** The governing verb and the person its form is in. */
  readonly verb: { readonly item: PronounVerbItem; readonly person: Person }
}

/**
 * A new round, each part drawn uniformly in turn: a noun (never `previous` again, unless it is the only one), a case
 * (never the vocative, which the personal pronoun does not have) and a number, as the other sentence quizzes draw them
 * (see drawNoun, drawForm); then a position among those the case's governing verbs allow, a governing verb of the case
 * that fits it (see fits), after a preposition whether the preposition starts the sentence (½ each), and a person and
 * number for the verb (see drawPerson). Drawing the position before the verb keeps the sentences after a preposition
 * common, though few verbs have one. A verb with a subject never has its preposition first (`To je …`). Undefined when
 * nothing is left to draw.
 */
export function drawPronounSentence(
  nouns: readonly SentenceNounItem[],
  verbs: readonly PronounVerbItem[],
  filter: CellFilter,
  previous: SentenceNounItem | undefined,
  random: () => number,
): PronounDraw | undefined {
  const noun = drawNoun(GOVERNING_CASES, nouns, verbs, filter, previous, random)
  if (!noun) return undefined
  const { caseId, number } = drawForm(GOVERNING_CASES, noun, verbs, filter, random)

  const ofCase = verbs.filter((verb) => verb.case === caseId)
  const position = pick(
    POSITIONS.filter((candidate) => ofCase.some((verb) => fits(verb, candidate))),
    random,
  )
  const item = pick(
    ofCase.filter((verb) => fits(verb, position)),
    random,
  )
  const prepositionFirst = position === 'after-preposition' && item.subject === undefined && random() < 0.5
  return { noun, caseId, number, position, prepositionFirst, verb: { item, person: drawPerson(item, caseId, number, random) } }
}

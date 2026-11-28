import type { Contract } from '../../core/contract'
import { isRecord } from '../../core/is-record'
import {
  GOVERNING_CASES,
  isText,
  nounCellsProblems,
  nounPartsProblems,
  sentenceItemKey,
  sentenceItemProblems,
  type GoverningVerbItem,
  type SentenceNounItem,
} from '../adjective-noun-declension/sentence-items'
import { nounDeclensionCellIds, partsOf } from '../noun-declension/cells'

/** The reflexive particles: the last word of a reflexive verb's prompt (`bát se`, `všimnout si`). */
export const REFLEXIVE_PARTICLES = ['se', 'si'] as const
export type ReflexiveParticle = (typeof REFLEXIVE_PARTICLES)[number]

/** The reflexive particle of `verb`, a verb's prompt: its last word, if that is `se` or `si`. */
export function reflexiveOf(verb: string): ReflexiveParticle | undefined {
  const last = verb.trim().split(/\s+/).at(-1)
  return (REFLEXIVE_PARTICLES as readonly (string | undefined)[]).includes(last) ? (last as ReflexiveParticle) : undefined
}

/**
 * The cells a noun of this quiz may have: the noun quiz's, without the vocative ones, which it never asks (the personal
 * pronoun has no vocative).
 */
export const personalPronounCellIds: readonly string[] = nounDeclensionCellIds.filter((id) =>
  (GOVERNING_CASES as readonly string[]).includes(partsOf(id)!.caseId),
)

/**
 * A governing verb of this quiz: the governing verb item of the other sentence quizzes, but a reflexive verb's particle
 * is kept apart from its forms, so that a sentence can put it second (`Advokáta se bojím.`).
 */
export interface PronounVerbItem extends GoverningVerbItem {
  /** A reflexive verb's particle, the last word of `verb`; its `forms` are without it (`bojím`, not `bojím se`). */
  reflexive?: ReflexiveParticle
}

/** A noun (`SentenceNounItem`, with no vocative cell) or a governing verb. */
export type PersonalPronounItem = SentenceNounItem | PronounVerbItem

/**
 * What the quiz needs of an item: a noun (`kind: 'noun'`) or a governing verb (`kind: 'verb'`).
 *
 * A noun is as in demonstratives with nouns: a non-empty `prompt` and `gender`, an optional non-empty `pluralGender`,
 * and `cells`: at least one, with ids among the noun quiz's cell ids but the vocative ones, in their order and without
 * repeats, each with at least one variant and no remarks (no noun remark is shown).
 *
 * A verb is as in the other sentence quizzes: a non-empty `verb`, an optional non-empty `subject` and `preposition`, a
 * `case` among `GOVERNING_CASES` and `forms`, a non-empty text for each person. A reflexive verb, one whose last word is
 * `se` or `si`, also has that word as its `reflexive`, and no other verb has one. Other properties are ignored.
 */
export const personalPronounContract: Contract<PersonalPronounItem> = {
  validateItem: (value) =>
    sentenceItemProblems(value, (noun) => [...nounPartsProblems(noun), ...nounCellsProblems(noun.cells, personalPronounCellIds)]).concat(
      reflexiveProblems(value),
    ),
  keyOf: sentenceItemKey,
}

/** A verb's `reflexive`: the last word of its `verb` if that is a reflexive particle, and absent otherwise. */
function reflexiveProblems(value: unknown): string[] {
  if (!isRecord(value) || value.kind !== 'verb' || !isText(value.verb)) return []
  const { verb, reflexive } = value
  const particle = reflexiveOf(verb)
  if (particle === undefined) {
    return reflexive === undefined ? [] : [`the verb ${JSON.stringify(verb)} is not reflexive, but has the reflexive particle ${JSON.stringify(reflexive)}`]
  }
  if (reflexive === undefined) return [`the reflexive verb ${JSON.stringify(verb)} has no reflexive particle apart from its forms`]
  return reflexive === particle ? [] : [`reflexive must be ${JSON.stringify(particle)}, the last word of the verb, found ${JSON.stringify(reflexive)}`]
}

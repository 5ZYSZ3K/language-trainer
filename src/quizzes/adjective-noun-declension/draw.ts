import { pickNext } from '../../core/pick'
import { nounCaseIds, nounCellId, nounNumbers, type CaseId, type GrammaticalNumber } from '../noun-declension/cells'
import type { CellFilter } from '../noun-declension/filter'
import { isGoverningCase, PERSONS, type AdjectiveNounItem, type GoverningVerbItem, type PairedNounItem, type Person } from './items'

/** What one round asks: an adjective with its noun, in a case and a number, after a governing verb's form. */
export interface Draw {
  readonly noun: PairedNounItem
  readonly adjective: string
  readonly caseId: CaseId
  readonly number: GrammaticalNumber
  /** The governing verb and the person its form is in; none in the vocative, whose sentence has no verb. */
  readonly verb?: { readonly item: GoverningVerbItem; readonly person: Person }
}

/** The dataset's nouns and its governing verbs, each in dataset order. */
export function splitItems(items: readonly AdjectiveNounItem[]): { nouns: PairedNounItem[]; verbs: GoverningVerbItem[] } {
  return {
    nouns: items.filter((item): item is PairedNounItem => item.kind === 'noun'),
    verbs: items.filter((item): item is GoverningVerbItem => item.kind === 'verb'),
  }
}

/** One of `choices`, all equally likely. */
const pick = <T>(choices: readonly T[], random: () => number): T => pickNext(choices, undefined, random)

/**
 * The numbers a round on `noun` may ask for in a case: those the filter has ticked in it and the noun has (`dveře` has
 * only the plural, `zdraví` only the singular).
 */
const numbersIn = (noun: PairedNounItem, caseId: CaseId, filter: CellFilter): GrammaticalNumber[] =>
  nounNumbers.filter((number) => {
    const id = nounCellId(caseId, number)
    return filter.has(id) && noun.cells.some((cell) => cell.id === id)
  })

/**
 * The cases a round on `noun` may ask for, in case order: those with a number left to ask (see numbersIn) and some
 * governing verb followed by them (the vocative needs none).
 */
const casesOf = (noun: PairedNounItem, verbs: readonly GoverningVerbItem[], filter: CellFilter): CaseId[] =>
  nounCaseIds.filter(
    (caseId) => numbersIn(noun, caseId, filter).length > 0 && (!isGoverningCase(caseId) || verbs.some((verb) => verb.case === caseId)),
  )

/**
 * A new round, each part drawn uniformly in turn: a noun (never `previous` again, unless it is the only one), then the
 * rest as drawSentenceOn draws it. Only a noun with a case left to ask is drawn. Undefined when no noun has one.
 */
export function drawSentence(
  nouns: readonly PairedNounItem[],
  verbs: readonly GoverningVerbItem[],
  filter: CellFilter,
  previous: PairedNounItem | undefined,
  random: () => number,
): Draw | undefined {
  const eligible = nouns.filter((noun) => casesOf(noun, verbs, filter).length > 0)
  if (eligible.length === 0) return undefined
  return drawSentenceOn(pickNext(eligible, previous, random), verbs, filter, random)
}

/**
 * A round on `noun` (a random one, or one opened with Go to noun), the rest drawn uniformly in turn: one of its
 * adjectives, a case, a number, a governing verb followed by that case and a person and number for the verb. The case is
 * one where the filter ticks a form the noun has, and some governing verb is followed by it (the vocative needs none);
 * the number is one the filter ticks in that case and the noun has. A verb with a subject is always in the third person
 * (`to je`), and in the nominative the verb's number follows the noun's (`to jsou dobří advokáti`); the vocative has no
 * verb. Undefined when the filter leaves the noun no such case.
 */
export function drawSentenceOn(
  noun: PairedNounItem,
  verbs: readonly GoverningVerbItem[],
  filter: CellFilter,
  random: () => number,
): Draw | undefined {
  const cases = casesOf(noun, verbs, filter)
  if (cases.length === 0) return undefined

  const adjective = pick(noun.adjectives, random)
  const caseId = pick(cases, random)
  const number = pick(numbersIn(noun, caseId, filter), random)
  if (!isGoverningCase(caseId)) return { noun, adjective, caseId, number }

  const item = pick(
    verbs.filter((verb) => verb.case === caseId),
    random,
  )
  const persons = PERSONS.filter(
    (person) => (item.subject === undefined || person.startsWith('3')) && (caseId !== 'nom' || person.endsWith(number)),
  )
  return { noun, adjective, caseId, number, verb: { item, person: pick(persons, random) } }
}

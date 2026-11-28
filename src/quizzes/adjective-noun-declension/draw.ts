import { pickNext } from '../../core/pick'
import { nounCellId, nounNumbers, partsOf, type CaseId, type GrammaticalNumber } from '../noun-declension/cells'
import type { CaseFilter } from './filter'
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

/** The numbers `noun` has in a case: both, or only the one it has (`dveře` only plural, `zdraví` only singular). */
const numbersIn = (noun: PairedNounItem, caseId: CaseId): GrammaticalNumber[] =>
  nounNumbers.filter((number) => noun.cells.some((cell) => cell.id === nounCellId(caseId, number)))

/**
 * A new round, each part drawn uniformly in turn: a noun (never `previous` again, unless it is the only one), one of
 * its adjectives, a case the filter has ticked, a number the noun has in that case, a governing verb followed by that
 * case and a person and number for the verb. In the nominative the verb's number follows the noun's (`jsme dobří
 * advokáti`), so only the person is drawn; the vocative has no verb. A case is only drawn where the noun has it and
 * some governing verb is followed by it (the vocative needs none). Undefined when nothing is left to draw.
 */
export function drawSentence(
  nouns: readonly PairedNounItem[],
  verbs: readonly GoverningVerbItem[],
  filter: CaseFilter,
  previous: PairedNounItem | undefined,
  random: () => number,
): Draw | undefined {
  const casesOf = (noun: PairedNounItem): CaseId[] => {
    const own = new Set(noun.cells.map((cell) => partsOf(cell.id)?.caseId))
    return [...filter].filter((caseId) => own.has(caseId) && (!isGoverningCase(caseId) || verbs.some((verb) => verb.case === caseId)))
  }
  const eligible = nouns.filter((noun) => casesOf(noun).length > 0)
  if (eligible.length === 0) return undefined

  const noun = pickNext(eligible, previous, random)
  const adjective = pick(noun.adjectives, random)
  const caseId = pick(casesOf(noun), random)
  const number = pick(numbersIn(noun, caseId), random)
  if (!isGoverningCase(caseId)) return { noun, adjective, caseId, number }

  const item = pick(
    verbs.filter((verb) => verb.case === caseId),
    random,
  )
  const persons = caseId === 'nom' ? PERSONS.filter((person) => person.endsWith(number)) : PERSONS
  return { noun, adjective, caseId, number, verb: { item, person: pick(persons, random) } }
}

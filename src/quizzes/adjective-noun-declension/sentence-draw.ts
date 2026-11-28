import { pickNext } from '../../core/pick'
import { nounCellId, nounNumbers, type CaseId, type GrammaticalNumber } from '../noun-declension/cells'
import type { CellFilter } from '../noun-declension/filter'
import { isGoverningCase, PERSONS, type GoverningVerbItem, type Person, type SentenceNounItem } from './sentence-items'

/**
 * What a sentence quiz puts in a round, as its draw needs it: what fills the first blank, before the noun, and the cases
 * it offers.
 */
export interface SentenceRules<Noun extends SentenceNounItem, Kind extends string, C extends CaseId> {
  /** What fills the first blank (`adjective`, `pronoun`): the name a round gives its base form. */
  readonly kind: Kind
  /** The cases the quiz offers, in case order: a round asks only for these, and the filter shows only their rows. */
  readonly cases: readonly C[]
  /** The base form of the first blank's word in a round on `noun`: one of its adjectives, or always `ten`. */
  baseForm(noun: Noun, random: () => number): string
}

/** What one round asks: the first blank's word (named by its kind) with its noun, in a case and a number, after a governing verb's form. */
export type SentenceDraw<Noun extends SentenceNounItem, Kind extends string, C extends CaseId> = {
  readonly noun: Noun
  readonly caseId: C
  readonly number: GrammaticalNumber
  /** The governing verb and the person its form is in; none in the vocative, whose sentence has no verb. */
  readonly verb?: { readonly item: GoverningVerbItem; readonly person: Person }
} & { readonly [K in Kind]: string }

/** `value` under the name `kind`: the first blank's word in a round, as `{ adjective: 'dobrý' }`. */
export const named = <Kind extends string>(kind: Kind, value: string) => ({ [kind]: value }) as { readonly [K in Kind]: string }

/** The dataset's nouns and its governing verbs, each in dataset order. */
export function splitItems<Item extends SentenceNounItem | GoverningVerbItem>(
  items: readonly Item[],
): { nouns: Extract<Item, { kind: 'noun' }>[]; verbs: Extract<Item, { kind: 'verb' }>[] } {
  return {
    nouns: items.filter((item): item is Extract<Item, { kind: 'noun' }> => item.kind === 'noun'),
    verbs: items.filter((item): item is Extract<Item, { kind: 'verb' }> => item.kind === 'verb'),
  }
}

/** One of `choices`, all equally likely. */
export const pick = <T>(choices: readonly T[], random: () => number): T => pickNext(choices, undefined, random)

/**
 * The numbers a round on `noun` may ask for in a case: those the filter has ticked in it and the noun has (`dveře` has
 * only the plural, `zdraví` only the singular).
 */
const numbersIn = (noun: SentenceNounItem, caseId: CaseId, filter: CellFilter): GrammaticalNumber[] =>
  nounNumbers.filter((number) => {
    const id = nounCellId(caseId, number)
    return filter.has(id) && noun.cells.some((cell) => cell.id === id)
  })

/**
 * The cases a round on `noun` may ask for, among `cases` and in their order: those with a number left to ask (see
 * numbersIn) and some governing verb followed by them (the vocative needs none).
 */
const casesOf = <C extends CaseId>(cases: readonly C[], noun: SentenceNounItem, verbs: readonly GoverningVerbItem[], filter: CellFilter): C[] =>
  cases.filter((caseId) => numbersIn(noun, caseId, filter).length > 0 && (!isGoverningCase(caseId) || verbs.some((verb) => verb.case === caseId)))

/**
 * The noun of a new round, drawn uniformly (never `previous` again, unless it is the only one) among those with a case
 * left to ask among `cases` (see drawForm). Undefined when no noun has one.
 */
export function drawNoun<Noun extends SentenceNounItem>(
  cases: readonly CaseId[],
  nouns: readonly Noun[],
  verbs: readonly GoverningVerbItem[],
  filter: CellFilter,
  previous: Noun | undefined,
  random: () => number,
): Noun | undefined {
  const eligible = nouns.filter((noun) => casesOf(cases, noun, verbs, filter).length > 0)
  return eligible.length === 0 ? undefined : pickNext(eligible, previous, random)
}

/**
 * The case and the number of a round on `noun`, a noun drawNoun gave, each drawn uniformly in turn: a case among `cases`
 * where the filter ticks a form the noun has and some governing verb is followed by it (the vocative needs none), then a
 * number the filter ticks in that case and the noun has.
 */
export function drawForm<C extends CaseId>(
  cases: readonly C[],
  noun: SentenceNounItem,
  verbs: readonly GoverningVerbItem[],
  filter: CellFilter,
  random: () => number,
): { readonly caseId: C; readonly number: GrammaticalNumber } {
  const caseId = pick(casesOf(cases, noun, verbs, filter), random)
  return { caseId, number: pick(numbersIn(noun, caseId, filter), random) }
}

/**
 * The person and number of a governing verb's form in a round in `caseId` and `number`, drawn uniformly: a verb with a
 * subject is always in the third person (`to je`), and in the nominative the verb's number follows the noun's (`to jsou
 * dobří advokáti`).
 */
export function drawPerson(verb: GoverningVerbItem, caseId: CaseId, number: GrammaticalNumber, random: () => number): Person {
  const persons = PERSONS.filter(
    (person) => (verb.subject === undefined || person.startsWith('3')) && (caseId !== 'nom' || person.endsWith(number)),
  )
  return pick(persons, random)
}

/**
 * A new round, each part drawn uniformly in turn: a noun (see drawNoun), the first blank's word for it
 * (`rules.baseForm`), a case and a number (see drawForm), a governing verb followed by that case, and a person and
 * number for the verb (see drawPerson). The vocative has no verb. Undefined when nothing is left to draw.
 */
export function drawSentenceOf<Noun extends SentenceNounItem, Kind extends string, C extends CaseId>(
  rules: SentenceRules<Noun, Kind, C>,
  nouns: readonly Noun[],
  verbs: readonly GoverningVerbItem[],
  filter: CellFilter,
  previous: Noun | undefined,
  random: () => number,
): SentenceDraw<Noun, Kind, C> | undefined {
  const noun = drawNoun(rules.cases, nouns, verbs, filter, previous, random)
  if (!noun) return undefined
  const word = named(rules.kind, rules.baseForm(noun, random))
  const { caseId, number } = drawForm(rules.cases, noun, verbs, filter, random)
  if (!isGoverningCase(caseId)) return { noun, ...word, caseId, number }

  const item = pick(
    verbs.filter((verb) => verb.case === caseId),
    random,
  )
  return { noun, ...word, caseId, number, verb: { item, person: drawPerson(item, caseId, number, random) } }
}

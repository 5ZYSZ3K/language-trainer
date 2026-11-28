import type { Cell } from '../../core/cell'
import { isRecord } from '../../core/is-record'
import { checkVariants } from '../../core/variants'
import { nounCellId, nounDeclensionCellIds, partsOf, type CaseId, type GrammaticalNumber } from '../noun-declension/cells'

// What the items of every sentence quiz share: a noun with its gender and cells, and the governing verbs, which frame a
// round and are never asked about; and the checks of their contracts.

/** The persons a governing verb's form can be in: the cell ids of the verb dataset. */
export const PERSONS = ['1sg', '2sg', '3sg', '1pl', '2pl', '3pl'] as const
export type Person = (typeof PERSONS)[number]

/** The cases a governing verb can be followed by: every case but the vocative, whose sentence has no verb. */
export const GOVERNING_CASES = ['nom', 'gen', 'dat', 'acc', 'loc', 'ins'] as const satisfies readonly CaseId[]
export type GoverningCase = (typeof GOVERNING_CASES)[number]

/** Whether some governing verb can be followed by `caseId`: false for the vocative, and for anything that is not a case. */
export const isGoverningCase = (caseId: unknown): caseId is GoverningCase => (GOVERNING_CASES as readonly unknown[]).includes(caseId)

/**
 * The cells a noun may have in a sentence quiz whose first blank's word has no vocative (demonstratives with nouns,
 * personal pronouns): the noun quiz's, in their order, without the vocative ones.
 */
export const GOVERNING_CASE_CELL_IDS: readonly string[] = nounDeclensionCellIds.filter((id) => isGoverningCase(partsOf(id)!.caseId))

/**
 * A noun of a sentence quiz: what a round asks about. Its cells are those of the noun dataset that the quiz asks,
 * without the variants a noun has only before another noun and without any remark.
 */
export interface SentenceNounItem {
  kind: 'noun'
  /** The noun's dictionary form, as in the noun dataset. */
  prompt: string
  /** As the noun dataset words it (`m. živ.`, `m. neživ.`, `ž.`, `s.`). The page never shows it. */
  gender: string
  /** The gender its plural agrees in, where it differs from `gender` (`dítě` is neuter, `děti` feminine). */
  pluralGender?: string
  cells: Cell[]
}

/** A governing verb, with the form for each person that its sentences show. It frames a round and is never asked about. */
export interface GoverningVerbItem {
  kind: 'verb'
  /** A prompt of the verb dataset. */
  verb: string
  /** A word before the verb form (`to`), which puts the form in the third person. */
  subject?: string
  /** At most one, and one that never changes its form. */
  preposition?: string
  case: GoverningCase
  forms: Record<Person, string>
}

/** The noun's cell of `caseId` and `number`, which a round asks only of a noun that has it. */
export const nounCell = (noun: SentenceNounItem, caseId: CaseId, number: GrammaticalNumber): Cell =>
  noun.cells.find((cell) => cell.id === nounCellId(caseId, number))!

export const isText = (value: unknown): value is string => typeof value === 'string' && value.trim() !== ''

/**
 * What every sentence quiz's contract asks of an item: a noun (`kind: 'noun'`), whose problems `nounProblems` gives, or a
 * governing verb (`kind: 'verb'`, see governingVerbProblems).
 */
export function sentenceItemProblems(value: unknown, nounProblems: (value: Record<string, unknown>) => string[]): string[] {
  if (!isRecord(value)) return ['item must be an object']
  if (value.kind === 'noun') return nounProblems(value)
  if (value.kind === 'verb') return governingVerbProblems(value)
  return [`kind must be noun or verb, found ${JSON.stringify(value.kind)}`]
}

/** What makes two items of a sentence quiz the same: a noun's prompt (`noun:<prompt>`), a verb with its preposition. */
export const sentenceItemKey = (item: SentenceNounItem | GoverningVerbItem): string =>
  item.kind === 'noun' ? `noun:${item.prompt}` : `verb:${item.verb}${item.preposition === undefined ? '' : `+${item.preposition}`}`

/** A noun's own parts: a non-empty `prompt` and `gender`, and an optional non-empty `pluralGender`. */
export function nounPartsProblems(value: Record<string, unknown>): string[] {
  const problems: string[] = []
  if (!isText(value.prompt)) problems.push('missing prompt')
  if (!isText(value.gender)) problems.push('gender must be text')
  if (value.pluralGender !== undefined && !isText(value.pluralGender)) problems.push('pluralGender must be text')
  return problems
}

/**
 * A noun's `cells`: at least one, with ids among `cellIds` (the noun quiz's, or those of the cases the quiz asks), in
 * their order and without repeats, each with at least one variant and no remarks (no sentence quiz shows any).
 */
export function nounCellsProblems(cells: unknown, cellIds: readonly string[]): string[] {
  if (!Array.isArray(cells)) return ['cells must be a list']
  if (cells.length === 0) return ['no cells']

  const problems: string[] = []
  const ids = cells.map((cell: unknown) => (isRecord(cell) ? cell.id : undefined))
  const positions = ids.map((id) => (typeof id === 'string' ? cellIds.indexOf(id) : -1))
  const found = ids.map(String).join(', ')
  if (positions.includes(-1)) problems.push(`cell ids must be among ${cellIds.join(', ')}, found ${found}`)
  else if (positions.some((position, i) => i > 0 && position <= positions[i - 1]!)) {
    problems.push(`cell ids must come in the order ${cellIds.join(', ')}, without repeats, found ${found}`)
  }

  cells.forEach((cell: unknown, i) => {
    const id = isRecord(cell) && typeof cell.id === 'string' ? cell.id : `#${i + 1}`
    const checked = checkVariants(id, isRecord(cell) ? cell.acceptedForms : undefined)
    if ('problem' in checked) return void problems.push(checked.problem)
    if (checked.variants.some((variant) => variant.remarks !== undefined)) {
      problems.push(`cell ${id} has a variant with remarks, which this quiz type does not show`)
    }
  })
  return problems
}

/**
 * A governing verb: a non-empty `verb`, an optional non-empty `subject` and `preposition`, a `case` among
 * `GOVERNING_CASES` and `forms`, a non-empty text for each of `PERSONS`. Other properties are ignored.
 */
export function governingVerbProblems(value: Record<string, unknown>): string[] {
  const problems: string[] = []
  if (!isText(value.verb)) problems.push('missing verb')
  if (value.subject !== undefined && !isText(value.subject)) problems.push('subject must be text')
  if (value.preposition !== undefined && !isText(value.preposition)) problems.push('preposition must be text')
  if (!isGoverningCase(value.case)) {
    problems.push(`case must be one of ${GOVERNING_CASES.join(', ')}, found ${JSON.stringify(value.case)}`)
  }
  const forms = value.forms
  if (!isRecord(forms)) return [...problems, `forms must be an object with a form per person (${PERSONS.join(', ')})`]
  for (const person of PERSONS) if (!isText(forms[person])) problems.push(`forms has no text for ${person}`)
  return problems
}

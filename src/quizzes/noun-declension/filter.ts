import type { Cell, Item } from '../../core/cell'
import { isRecord } from '../../core/is-record'
import { nounCaseIds, nounCellId, nounDeclensionCellIds, nounNumbers, type CaseId, type GrammaticalNumber } from './cells'

/**
 * The forms the learner wants to be asked for: a set of cell ids, i.e. a case and a number each, so all 14 can be
 * switched on and off one by one. Nothing here knows which nouns have which forms: a noun without a plural is
 * simply not affected by the plural ticks.
 */
export type CellFilter = ReadonlySet<string>

export const allCells = (): Set<string> => new Set(nounDeclensionCellIds)

/** The two cells of one case (singular and plural). */
export const cellsOfCase = (caseId: CaseId): string[] => nounNumbers.map((number) => nounCellId(caseId, number))

/** The seven cells of one number. */
export const cellsOfNumber = (number: GrammaticalNumber): string[] => nounCaseIds.map((caseId) => nounCellId(caseId, number))

/**
 * Switches a group of cells (a row or a column of the filter) as a whole: off if all of it is on, otherwise on, so a
 * partly ticked group first becomes fully ticked. Returns a new set.
 */
export function toggleGroup(filter: CellFilter, ids: readonly string[]): Set<string> {
  const next = new Set(filter)
  const allOn = ids.every((id) => filter.has(id))
  for (const id of ids) {
    if (allOn) next.delete(id)
    else next.add(id)
  }
  return next
}

export const sameFilter = (a: CellFilter, b: CellFilter): boolean => a.size === b.size && [...a].every((id) => b.has(id))

/** What gets saved for a pool: `{ cells: [...ids in display order] }`. */
export const saveFilter = (filter: CellFilter): { cells: string[] } => ({ cells: nounDeclensionCellIds.filter((id) => filter.has(id)) })

/**
 * The filter a saved value stands for. Nothing saved, or a value that is not what `saveFilter` makes, means no
 * filtering at all (everything on). A saved empty list is a real choice, "ask for nothing", and stays that way.
 * Ids this build does not know are dropped.
 */
export function readFilter(saved: unknown): Set<string> {
  if (!isRecord(saved) || !Array.isArray(saved.cells)) return allCells()
  const known = new Set<string>(nounDeclensionCellIds)
  return new Set(saved.cells.filter((id): id is string => typeof id === 'string' && known.has(id)))
}

/** What a noun shows under a filter. */
export interface Practice {
  /** The cells to fill in, in item order. Only these are checked and scored. */
  asked: Cell[]
  /** The cells to put on the page, in item order: the given cell (if its own tick is on) and then the asked ones. */
  shown: Cell[]
}

/**
 * The first cell of an item is the form the learner is given (the nominative singular, or plural for a noun that
 * has no singular): it is shown locked when its own tick is on, and never asked. Everything else is asked when its
 * tick is on.
 */
export function practiceOf(item: Item, filter: CellFilter): Practice {
  const [given, ...rest] = item.cells
  const asked = rest.filter((cell) => filter.has(cell.id))
  return { asked, shown: given && filter.has(given.id) ? [given, ...asked] : asked }
}

import { nounCaseIds, nounDeclensionCellIds, partsOf, type CaseId, type GrammaticalNumber, type NounCellId } from '../noun-declension/cells'
import { cellsOfCase, cellsOfNumber, sameFilter, toggleGroup, type CellFilter } from '../noun-declension/filter'

/** The forms of `cases`, a case and a number each, in display order (the singular ones first): all 14 for every case. */
export const cellsOfCases = (cases: readonly CaseId[]): Set<string> =>
  new Set(nounDeclensionCellIds.filter((id) => cases.includes(partsOf(id)!.caseId)))

/** The forms of `filter` that are forms of `cases`: what a sentence quiz offering only those cases can ask. */
export const restrictedTo = (filter: CellFilter, cases: readonly CaseId[]): Set<string> => {
  const offered = cellsOfCases(cases)
  return new Set([...filter].filter((id) => offered.has(id)))
}

/**
 * The ticks of the filter dialog while it is open: the noun quiz's cell filter, a case and a number each, over the cases
 * the quiz offers (all seven unless it says otherwise), so each of their forms can be switched on and off one by one, a
 * case (a row) or a number (a column) at a time, or all at once. Nothing is applied until it closes; then `close` gives
 * the ticks left, in display order, if they differ from the filter it was opened on.
 */
export class FilterDraft {
  private readonly offered: Set<string>
  private before: CellFilter
  private working: Set<string>

  constructor(cases: readonly CaseId[] = nounCaseIds) {
    this.offered = cellsOfCases(cases)
    this.before = new Set(this.offered)
    this.working = new Set(this.offered)
  }

  open(current: CellFilter): void {
    this.before = new Set(current)
    this.working = new Set(current)
  }

  get ticked(): CellFilter {
    return this.working
  }

  set(cellId: NounCellId, ticked: boolean): void {
    if (ticked) this.working.add(cellId)
    else this.working.delete(cellId)
  }

  /** A row heading: switches the case's two cells as a whole (see toggleGroup). */
  toggleCase(caseId: CaseId): void {
    this.working = toggleGroup(this.working, cellsOfCase(caseId))
  }

  /** A column heading: switches the number's cells, one per case offered, as a whole (see toggleGroup). */
  toggleNumber(number: GrammaticalNumber): void {
    this.working = toggleGroup(
      this.working,
      cellsOfNumber(number).filter((id) => this.offered.has(id)),
    )
  }

  selectAll(): void {
    this.working = new Set(this.offered)
  }

  clearAll(): void {
    this.working = new Set()
  }

  close(): Set<string> | undefined {
    if (sameFilter(this.before, this.working)) return undefined
    return new Set(nounDeclensionCellIds.filter((id) => this.working.has(id)))
  }
}

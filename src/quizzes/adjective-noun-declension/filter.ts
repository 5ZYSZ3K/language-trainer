import { nounDeclensionCellIds, type CaseId, type GrammaticalNumber, type NounCellId } from '../noun-declension/cells'
import { allCells, cellsOfCase, cellsOfNumber, sameFilter, toggleGroup, type CellFilter } from '../noun-declension/filter'

/**
 * The ticks of the filter dialog while it is open: the noun quiz's cell filter, a case and a number each, so all 14
 * forms can be switched on and off one by one, a case (a row) or a number (a column) at a time, or all at once. Nothing
 * is applied until it closes; then `close` gives the ticks left, in display order, if they differ from the filter it was
 * opened on.
 */
export class FilterDraft {
  private before: CellFilter = allCells()
  private working: Set<string> = allCells()

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

  /** A column heading: switches the number's seven cells as a whole (see toggleGroup). */
  toggleNumber(number: GrammaticalNumber): void {
    this.working = toggleGroup(this.working, cellsOfNumber(number))
  }

  selectAll(): void {
    this.working = allCells()
  }

  clearAll(): void {
    this.working = new Set()
  }

  close(): Set<string> | undefined {
    if (sameFilter(this.before, this.working)) return undefined
    return new Set(nounDeclensionCellIds.filter((id) => this.working.has(id)))
  }
}

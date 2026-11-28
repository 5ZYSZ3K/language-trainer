import { isRecord } from '../../core/is-record'
import { nounCaseIds, type CaseId } from '../noun-declension/cells'

/** The cases a round may ask for. A new pool has all seven ticked. */
export type CaseFilter = ReadonlySet<CaseId>

export const allCases = (): Set<CaseId> => new Set(nounCaseIds)

/** What gets saved for a pool: `{ cases: [...ids in case order] }`. */
export const saveCaseFilter = (filter: CaseFilter): { cases: CaseId[] } => ({ cases: nounCaseIds.filter((id) => filter.has(id)) })

/**
 * The filter a saved value stands for, in case order. Nothing saved, or a value that is not what `saveCaseFilter`
 * makes (an older build's, say), ticks every case. A saved empty list is a real choice, "nothing", and stays that way.
 * Cases this build does not know are dropped.
 */
export function readCaseFilter(saved: unknown): Set<CaseId> {
  if (!isRecord(saved) || !Array.isArray(saved.cases)) return allCases()
  const cases: unknown[] = saved.cases
  return new Set(nounCaseIds.filter((id) => cases.includes(id)))
}

const sameCases = (a: CaseFilter, b: CaseFilter): boolean => a.size === b.size && [...a].every((id) => b.has(id))

/**
 * The ticks of the filter dialog while it is open. Nothing is applied until it closes; then `close` gives the ticks
 * left, in case order, if they differ from the filter it was opened on.
 */
export class FilterDraft {
  private before: CaseFilter = allCases()
  private working: Set<CaseId> = allCases()

  open(current: CaseFilter): void {
    this.before = new Set(current)
    this.working = new Set(current)
  }

  get ticked(): CaseFilter {
    return this.working
  }

  set(caseId: CaseId, ticked: boolean): void {
    if (ticked) this.working.add(caseId)
    else this.working.delete(caseId)
  }

  selectAll(): void {
    this.working = allCases()
  }

  clearAll(): void {
    this.working = new Set()
  }

  close(): Set<CaseId> | undefined {
    if (sameCases(this.before, this.working)) return undefined
    return new Set(nounCaseIds.filter((id) => this.working.has(id)))
  }
}

export interface ScoreSnapshot {
  cellsCorrect: number
  cellsChecked: number
  itemsCorrect: number
  itemsCompleted: number
}

export type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

export const SCORES_KEY = 'scores'

const FIELDS = ['cellsCorrect', 'cellsChecked', 'itemsCorrect', 'itemsCompleted'] as const

const empty = (): ScoreSnapshot => ({ cellsCorrect: 0, cellsChecked: 0, itemsCorrect: 0, itemsCompleted: 0 })

function isSnapshot(value: unknown): value is ScoreSnapshot {
  return (
    typeof value === 'object' &&
    value !== null &&
    FIELDS.every((f) => Number.isFinite((value as Record<string, unknown>)[f]))
  )
}

/**
 * Running totals per exercise type, so exercises added later never collide with existing scores.
 * Persists to the given storage; if storage is missing or broken it carries on in memory.
 */
export class Scores {
  private data: Record<string, ScoreSnapshot> = {}

  constructor(private readonly storage: StorageLike) {
    this.data = this.load()
  }

  get(type: string): ScoreSnapshot {
    return { ...(this.data[type] ?? empty()) }
  }

  recordCell(type: string, correct: boolean): void {
    const score = (this.data[type] ??= empty())
    score.cellsChecked++
    if (correct) score.cellsCorrect++
    this.save()
  }

  recordItem(type: string, fullyCorrect: boolean): void {
    const score = (this.data[type] ??= empty())
    score.itemsCompleted++
    if (fullyCorrect) score.itemsCorrect++
    this.save()
  }

  reset(): void {
    this.data = {}
    try {
      this.storage.removeItem(SCORES_KEY)
    } catch {
      // Nothing stored that we could remove.
    }
  }

  private load(): Record<string, ScoreSnapshot> {
    try {
      const parsed: unknown = JSON.parse(this.storage.getItem(SCORES_KEY) ?? 'null')
      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return {}
      const valid = Object.entries(parsed).filter(([, v]) => isSnapshot(v)) as [string, ScoreSnapshot][]
      return Object.fromEntries(valid)
    } catch {
      return {}
    }
  }

  private save(): void {
    try {
      this.storage.setItem(SCORES_KEY, JSON.stringify(this.data))
    } catch {
      // Private mode or full storage: scores still work for this page view.
    }
  }
}

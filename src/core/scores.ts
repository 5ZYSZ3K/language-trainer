import { isRecord } from './is-record'

/** One counter: how many of `total` tries were correct. */
export interface Tally {
  correct: number
  total: number
}

/** The counters of one pool, by meter id. A meter nothing has been recorded for yet is absent. */
export type PoolScores = Record<string, Tally>

export type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

export const SCORES_KEY = 'scores'

function isTally(value: unknown): value is Tally {
  return isRecord(value) && Number.isFinite(value.correct) && Number.isFinite(value.total)
}

function isPoolScores(value: unknown): value is PoolScores {
  return isRecord(value) && Object.values(value).every(isTally)
}

const copyOf = (scores: PoolScores): PoolScores =>
  Object.fromEntries(Object.entries(scores).map(([meterId, { correct, total }]) => [meterId, { correct, total }]))

/**
 * Running totals per pool (its key, e.g. `cs/prirucka/verb-present-tense`) and meter, so datasets and quiz types
 * added later never collide with existing scores. Knows nothing about what a meter means: the quiz type names them.
 * Persists to the given storage; if storage is missing or broken it carries on in memory.
 */
export class Scores {
  private data: Record<string, PoolScores> = {}

  constructor(private readonly storage: StorageLike) {
    this.data = this.load()
  }

  /** A copy of the pool's counters; changing it does not change the scores. */
  get(pool: string): PoolScores {
    return copyOf(this.data[pool] ?? {})
  }

  /** Counts one try on the pool's meter, and a correct one if `correct`. */
  record(pool: string, meterId: string, correct: boolean): void {
    const meters = (this.data[pool] ??= {})
    const tally = (meters[meterId] ??= { correct: 0, total: 0 })
    tally.total++
    if (correct) tally.correct++
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

  /** Pools in any other shape (such as the flat counters an older build saved per exercise type) are ignored. */
  private load(): Record<string, PoolScores> {
    try {
      const parsed: unknown = JSON.parse(this.storage.getItem(SCORES_KEY) ?? 'null')
      if (!isRecord(parsed)) return {}
      const valid = Object.entries(parsed).filter((entry): entry is [string, PoolScores] => isPoolScores(entry[1]))
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

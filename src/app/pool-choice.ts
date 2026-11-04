import { isRecord } from '../core/is-record'
import type { StorageLike } from '../core/scores'
import type { Pool } from '../datasets/pool'

/** The localStorage key of the pool the learner last chose. */
export const POOL_CHOICE_KEY = 'pool'

/**
 * The pool saved by `savePoolChoice`, as far as it can be read: each part that is not text is left out. The parts are
 * not checked against the registries (that is `choose`'s job, which falls back for what is no longer there).
 */
export function loadPoolChoice(storage: StorageLike): Partial<Pool> {
  try {
    const parsed: unknown = JSON.parse(storage.getItem(POOL_CHOICE_KEY) ?? 'null')
    if (!isRecord(parsed)) return {}
    const text = (value: unknown) => (typeof value === 'string' ? value : undefined)
    const { language, source, quizType } = parsed
    return Object.fromEntries(Object.entries({ language: text(language), source: text(source), quizType: text(quizType) }).filter(([, value]) => value !== undefined))
  } catch {
    return {}
  }
}

export function savePoolChoice(storage: StorageLike, pool: Pool): void {
  try {
    storage.setItem(POOL_CHOICE_KEY, JSON.stringify(pool))
  } catch {
    // Private mode or full storage: the choice still holds for this page view.
  }
}

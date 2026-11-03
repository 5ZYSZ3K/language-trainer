/** What the user practises: items come from one dataset only, and scores are kept per pool. */
export interface Pool {
  /** Language id. */
  readonly language: string
  /** Source id. */
  readonly source: string
  /** Quiz type id. */
  readonly quizType: string
}

/** The fields of a pool, in the order a dataset file writes them in its envelope. Everything that reads or writes an envelope goes through this list. */
export const POOL_FIELDS = ['language', 'source', 'quizType'] as const satisfies readonly (keyof Pool)[]

/** The pool's identity as text, e.g. `cs/prirucka/verb-present-tense`. */
export const poolKey = (pool: Pool): string => `${pool.language}/${pool.source}/${pool.quizType}`

/** Where the pool's dataset file lies under data/, e.g. `cs/prirucka/verb-present-tense.json`. */
export const datasetPath = (pool: Pool): string => `${poolKey(pool)}.json`

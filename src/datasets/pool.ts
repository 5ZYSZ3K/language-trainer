/** What the user practises: items come from one dataset only, and scores are kept per pool. */
export interface Pool {
  /** Language id. */
  readonly language: string
  /** Source id. */
  readonly source: string
  /** Quiz type id. */
  readonly quizType: string
}

/** The pool's identity as text, e.g. `cs/prirucka/verb-present-tense`. */
export const poolKey = (pool: Pool): string => `${pool.language}/${pool.source}/${pool.quizType}`

/** Where the pool's dataset file lies under data/, e.g. `cs/prirucka/verb-present-tense.json`. */
export const datasetPath = (pool: Pool): string => `${poolKey(pool)}.json`

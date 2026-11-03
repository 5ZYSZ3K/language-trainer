import type { Contract } from '../core/contract'
import type { TranslationKey } from '../i18n'

/** One score counter of a quiz type; the scores panel is drawn from these. */
export interface Meter {
  readonly id: string
  /** Shown next to the counter. Until a quiz type owns its texts (step 7) this is a shell text key. */
  readonly label: TranslationKey
}

/**
 * One kind of quiz. It owns its contract (the exact shape of data it needs), its score counters and, in the
 * steps that follow, its texts and its interaction (`mount`).
 */
export interface QuizType<Item> {
  /** Permanent: the data file name and part of the pool key. */
  readonly id: string
  readonly contract: Contract<Item>
  /** Score counters, in display order. */
  readonly meters: readonly Meter[]
}

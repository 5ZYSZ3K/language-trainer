import type { Contract } from '../core/contract'
import type { TranslationKey } from '../i18n'
import type { Language } from '../languages'

/** One score counter of a quiz type; the scores panel is drawn from these. */
export interface Meter {
  readonly id: string
  /** Shown next to the counter. Until a quiz type owns its texts (step 7) this is a shell text key. */
  readonly label: TranslationKey
}

/** What the shell hands a quiz when it mounts it. */
export interface QuizHost<Item> {
  /** The pool's items, already loaded (possibly none). The shell treats them as opaque. */
  readonly items: readonly Item[]
  /** The pool key (`<language>/<source>/<quiz type>`), the key the pool's scores are kept under. */
  readonly pool: string
  /** The language being learned: its characters, typing shortcuts and `lang` attribute. */
  readonly language: Language
  /** Counts one result for one of the quiz type's meters and redraws the scores panel. */
  record(meterId: string, correct: boolean): void
}

/** A mounted quiz, as the shell sees it. */
export interface QuizInstance {
  /** Called when the UI language changes: refill every text inside the quiz's area. */
  applyTexts(): void
}

/**
 * One kind of quiz. It owns its contract (the exact shape of data it needs), its score counters, its interaction
 * (`mount`) and, from step 7, its texts.
 */
export interface QuizType<Item> {
  /** Permanent: the data file name and part of the pool key. */
  readonly id: string
  readonly contract: Contract<Item>
  /** Score counters, in display order. */
  readonly meters: readonly Meter[]
  /**
   * Builds the quiz inside `container` (which it owns entirely) and starts it. With no items it shows no exercise;
   * the shell says why in its status line.
   */
  mount(container: HTMLElement, host: QuizHost<Item>): QuizInstance
}

import type { Contract } from '../core/contract'
import type { UiLanguage } from '../i18n'
import type { Language } from '../languages'

/**
 * The texts a quiz type owns, in one UI language: the keys the shell shows on the quiz's behalf, and any others the
 * quiz needs inside its own area.
 */
export interface QuizTexts {
  /** The heading of the page and its document title. */
  readonly title: string
  /** A short name for the quiz's tab in the selector. */
  readonly name: string
  /** The sentence under the heading that says what to do. */
  readonly intro: string
  /** The shell's status when the pool holds no items yet. */
  readonly empty: string
  readonly [key: string]: string
}

/** One score counter of a quiz type; the scores panel is drawn from these. */
export interface Meter<Key extends string = string> {
  readonly id: string
  /** The key of the counter's label in the quiz type's texts. */
  readonly label: Key
}

/** What a quiz remembers for itself between visits, for its pool; the shell keeps it in the browser's storage. */
export interface QuizSettings {
  /** The value last saved, or undefined. Its shape is the quiz's own business: check it, it may be from an older build. */
  get(): unknown
  /** Replaces the saved value; anything that is JSON will do. */
  set(value: unknown): void
}

/** What the shell hands a quiz when it mounts it. */
export interface QuizHost<Item> {
  /** The pool's items, already loaded (possibly none). The shell treats them as opaque. */
  readonly items: readonly Item[]
  /** The pool key (`<language>/<source>/<quiz type>`), the key the pool's scores are kept under. */
  readonly pool: string
  /** The language being learned: its characters, typing shortcuts and `lang` attribute. */
  readonly language: Language
  /** The quiz's saved settings for this pool. */
  readonly settings: QuizSettings
  /** Counts one result for one of the quiz type's meters and redraws the scores panel. */
  record(meterId: string, correct: boolean): void
}

/** A mounted quiz, as the shell sees it. */
export interface QuizInstance {
  /** Called when the UI language changes: refill every text inside the quiz's area. */
  applyTexts(): void
}

/**
 * One kind of quiz. It owns its contract (the exact shape of data it needs), its score counters, its texts and its
 * interaction (`mount`).
 */
export interface QuizType<Item> {
  /** Permanent: the data file name and part of the pool key. */
  readonly id: string
  readonly contract: Contract<Item>
  /** Score counters, in display order. */
  readonly meters: readonly Meter[]
  /** Every text of the quiz, per UI language. A quiz type writes them as typed dictionaries, so a missing key is a compile error. */
  readonly texts: Record<UiLanguage, QuizTexts>
  /**
   * Builds the quiz inside `container` (which it owns entirely) and starts it. With no items it shows no exercise;
   * the shell says why in its status line.
   */
  mount(container: HTMLElement, host: QuizHost<Item>): QuizInstance
}

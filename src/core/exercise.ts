import type { TranslationKey } from '../i18n/en'

/** The part of an exercise the shipped page needs. Scraping lives in scraper/ and is not bundled. */
export interface Exercise {
  /** Stable id. Keys the data file and the stored scores, so it must never change. */
  readonly type: string
  /** Cell labels in display order (rendered as a two-column grid, row by row). */
  readonly cellLabels: readonly TranslationKey[]
}

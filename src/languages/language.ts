import type { ShortcutTable } from '../core/shortcuts'
import type { UiLanguage } from '../i18n'

/** A language that can be learned (not the language of the page's own texts: that is a `UiLanguage`). */
export interface Language {
  /** ISO 639-1 code; also the folder name under data/ and lists/. */
  readonly id: string
  /** `lang` attribute for text and inputs in this language. */
  readonly htmlLang: string
  /** Buttons for characters the keyboard may lack, in display order. */
  readonly specialChars: readonly string[]
  /** Typed trigger -> preceding letter -> replacement (lower case). */
  readonly shortcuts: ShortcutTable
  readonly texts: Record<UiLanguage, { name: string; shortcutHelp: readonly string[] }>
}

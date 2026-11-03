import type { StorageLike } from '../core/scores'
import { cs } from './cs'
import { en, type TranslationKey } from './en'

export type { TranslationKey }

/**
 * The languages of the page's own texts (the EN / CZ switch). Not the language being learned: that is `Language` in
 * src/languages. To add one: list it here, then write the file it makes missing in every dictionary set (the shell's,
 * `src/ui`'s, each quiz type's and each learned language's texts); the compiler names each of them.
 */
export const UI_LANGUAGES = ['en', 'cs'] as const
export type UiLanguage = (typeof UI_LANGUAGES)[number]

/** One set of texts: the same keys in every UI language. Written as `{ en, cs }`, the cs file typed against the en keys. */
export type Dictionaries<Key extends string> = Record<UiLanguage, Record<Key, string>>

/** The localStorage key of the saved UI language. Still `language`, as the page has always saved it. */
export const UI_LANGUAGE_KEY = 'language'

let current: UiLanguage = 'en'

const isUiLanguage = (value: string | null | undefined): value is UiLanguage =>
  value != null && (UI_LANGUAGES as readonly string[]).includes(value)

/** A saved choice wins; otherwise Czech for any `cs*` browser language, English for the rest. */
export function detectUiLanguage(navigatorLanguage: string | undefined, saved: string | null): UiLanguage {
  if (isUiLanguage(saved)) return saved
  return navigatorLanguage?.toLowerCase().startsWith('cs') ? 'cs' : 'en'
}

/** Picks the starting UI language (saved choice, else browser language). Does not save anything. */
export function initUiLanguage(storage: StorageLike, navigatorLanguage: string | undefined): UiLanguage {
  let saved: string | null = null
  try {
    saved = storage.getItem(UI_LANGUAGE_KEY)
  } catch {
    // Storage unavailable: fall back to the browser language.
  }
  current = detectUiLanguage(navigatorLanguage, saved)
  return current
}

/** Switches the UI language and remembers the choice. */
export function setUiLanguage(uiLanguage: UiLanguage, storage: StorageLike): void {
  current = uiLanguage
  try {
    storage.setItem(UI_LANGUAGE_KEY, uiLanguage)
  } catch {
    // Not saved, but the switch still applies to this page view.
  }
}

/** The current UI language. */
export const getUiLanguage = (): UiLanguage => current

/**
 * A translator for one set of texts, following the current UI language. Every owner of texts (the shell, `src/ui`,
 * each quiz type) makes its own over its own set. An unknown key shows as itself, so gaps are visible.
 */
export function createT<Key extends string>(dictionaries: Dictionaries<Key>): (key: Key) => string {
  return (key) => dictionaries[current][key] ?? key
}

/**
 * Puts the sets of two owners side by side, for a page area that is filled in from both (the keys must differ: the
 * tests check that). Which UI languages there are is not repeated here; it comes from `UI_LANGUAGES`.
 */
export function joinTexts<A extends string, B extends string>(a: Dictionaries<A>, b: Dictionaries<B>): Dictionaries<A | B> {
  return Object.fromEntries(UI_LANGUAGES.map((language) => [language, { ...a[language], ...b[language] }])) as Dictionaries<A | B>
}

/** The shell's own texts: the language switch, the scores panel and the loading and error status. */
export const shellTexts: Dictionaries<TranslationKey> = { en, cs }

/** The short name a UI language goes by on the language switch ("CZ" for Czech), in that language's own dictionary. */
export const uiLanguageLabel = (uiLanguage: UiLanguage): string => shellTexts[uiLanguage]['language.switchLabel']

/** Text for a shell key in the current language. */
export const t = createT(shellTexts)

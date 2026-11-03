import type { StorageLike } from '../core/scores'
import { cs } from './cs'
import { en, type TranslationKey } from './en'

export type { TranslationKey }

/** To add a language: create its dictionary file typed like cs.ts and register it here. Nothing else. */
const dictionaries = { en, cs } satisfies Record<string, Record<TranslationKey, string>>

/** A language of the page's own texts (the EN / CZ switch). Not the language being learned: that is `Language` in src/languages. */
export type UiLanguage = keyof typeof dictionaries
export const UI_LANGUAGES = Object.keys(dictionaries) as UiLanguage[]
export const LANGUAGE_KEY = 'language'

let current: UiLanguage = 'en'

const isLanguage = (value: string | null | undefined): value is UiLanguage =>
  value != null && (UI_LANGUAGES as string[]).includes(value)

/** A saved choice wins; otherwise Czech for any `cs*` browser language, English for the rest. */
export function detectLanguage(navigatorLanguage: string | undefined, saved: string | null): UiLanguage {
  if (isLanguage(saved)) return saved
  return navigatorLanguage?.toLowerCase().startsWith('cs') ? 'cs' : 'en'
}

/** Picks the starting language (saved choice, else browser language). Does not save anything. */
export function initLanguage(storage: StorageLike, navigatorLanguage: string | undefined): UiLanguage {
  let saved: string | null = null
  try {
    saved = storage.getItem(LANGUAGE_KEY)
  } catch {
    // Storage unavailable: fall back to the browser language.
  }
  current = detectLanguage(navigatorLanguage, saved)
  return current
}

/** Switches language and remembers the choice. */
export function setLanguage(language: UiLanguage, storage: StorageLike): void {
  current = language
  try {
    storage.setItem(LANGUAGE_KEY, language)
  } catch {
    // Not saved, but the switch still applies to this page view.
  }
}

export const getLanguage = (): UiLanguage => current

/** The short name a language goes by on the language switch ("CZ" for Czech), in that language's own dictionary. */
export const languageLabel = (language: UiLanguage): string => dictionaries[language]['language.switchLabel']

/** Text for a key in the current language. An unknown key shows as itself, so gaps are visible. */
export function t(key: TranslationKey): string {
  return dictionaries[current][key] ?? key
}

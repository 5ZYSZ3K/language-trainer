import type { StorageLike } from '../core/scores'
import { cs } from './cs'
import { en, type TranslationKey } from './en'

export type { TranslationKey }

/** To add a language: create its dictionary file typed like cs.ts and register it here. Nothing else. */
const dictionaries = { en, cs } satisfies Record<string, Record<TranslationKey, string>>

export type Language = keyof typeof dictionaries
export const LANGUAGES = Object.keys(dictionaries) as Language[]
export const LANGUAGE_KEY = 'language'

let current: Language = 'en'

const isLanguage = (value: string | null | undefined): value is Language =>
  value != null && (LANGUAGES as string[]).includes(value)

/** A saved choice wins; otherwise Czech for any `cs*` browser language, English for the rest. */
export function detectLanguage(navigatorLanguage: string | undefined, saved: string | null): Language {
  if (isLanguage(saved)) return saved
  return navigatorLanguage?.toLowerCase().startsWith('cs') ? 'cs' : 'en'
}

/** Picks the starting language (saved choice, else browser language). Does not save anything. */
export function initLanguage(storage: StorageLike, navigatorLanguage: string | undefined): Language {
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
export function setLanguage(language: Language, storage: StorageLike): void {
  current = language
  try {
    storage.setItem(LANGUAGE_KEY, language)
  } catch {
    // Not saved, but the switch still applies to this page view.
  }
}

export const getLanguage = (): Language => current

/** The short name a language goes by on the language switch ("CZ" for Czech), in that language's own dictionary. */
export const languageLabel = (language: Language): string => dictionaries[language]['language.switchLabel']

/** Text for a key in the current language. An unknown key shows as itself, so gaps are visible. */
export function t(key: TranslationKey): string {
  return dictionaries[current][key] ?? key
}

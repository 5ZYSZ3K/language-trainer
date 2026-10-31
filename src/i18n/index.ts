import type { StorageLike } from '../core/scores'
import { cs } from './cs'
import { en, type TranslationKey } from './en'

export type { TranslationKey }
export type Language = 'en' | 'cs'

/** To add a language: create its dictionary file typed like cs.ts and register it here. */
const dictionaries: Record<Language, Record<TranslationKey, string>> = { en, cs }

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

/** Text for a key in the current language. An unknown key shows as itself, so gaps are visible. */
export function t(key: TranslationKey): string {
  return dictionaries[current][key] ?? key
}

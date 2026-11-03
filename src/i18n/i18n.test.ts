import { describe, expect, it } from 'vitest'
import type { TranslationKey } from './en'
import { detectLanguage, getLanguage, initLanguage, languageLabel, setLanguage, t, UI_LANGUAGES } from './index'

function memoryStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial))
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
    removeItem: (key: string) => void data.delete(key),
  }
}

describe('detectLanguage', () => {
  it('uses Czech when the browser language starts with cs, otherwise English', () => {
    expect(detectLanguage('cs', null)).toBe('cs')
    expect(detectLanguage('cs-CZ', null)).toBe('cs')
    expect(detectLanguage('CS', null)).toBe('cs')
    expect(detectLanguage('en-US', null)).toBe('en')
    expect(detectLanguage('sk', null)).toBe('en')
    expect(detectLanguage(undefined, null)).toBe('en')
  })

  it('prefers a saved choice over the browser language', () => {
    expect(detectLanguage('cs-CZ', 'en')).toBe('en')
    expect(detectLanguage('en-US', 'cs')).toBe('cs')
  })

  it('ignores a saved value that is not a known language', () => {
    expect(detectLanguage('cs-CZ', 'de')).toBe('cs')
    expect(detectLanguage('en-US', '')).toBe('en')
  })
})

describe('t and setLanguage', () => {
  it('translates into the current language and follows switches', () => {
    setLanguage('en', memoryStorage())
    const english = t('scores.reset')
    setLanguage('cs', memoryStorage())
    const czech = t('scores.reset')
    expect(getLanguage()).toBe('cs')
    expect(english).toBe('Reset scores')
    expect(czech).not.toBe(english)
    expect(czech).not.toBe('')
  })

  it('shows the key itself rather than nothing when a key is unknown', () => {
    expect(t('no.such.key' as TranslationKey)).toBe('no.such.key')
  })
})

describe('languageLabel', () => {
  it('gives each language its own short label for the switch, independent of the current language', () => {
    setLanguage('en', memoryStorage())
    expect(UI_LANGUAGES.map((l) => languageLabel(l))).toEqual(['EN', 'CZ'])
    setLanguage('cs', memoryStorage())
    expect(UI_LANGUAGES.map((l) => languageLabel(l))).toEqual(['EN', 'CZ'])
  })
})

describe('initLanguage', () => {
  it('starts from the browser language and does not save anything yet', () => {
    const storage = memoryStorage()
    expect(initLanguage(storage, 'cs-CZ')).toBe('cs')
    expect(getLanguage()).toBe('cs')
    expect(storage.getItem('language')).toBeNull()
  })

  it('remembers a manual switch for the next visit', () => {
    const storage = memoryStorage()
    initLanguage(storage, 'cs-CZ')
    setLanguage('en', storage)
    expect(initLanguage(storage, 'cs-CZ')).toBe('en')
  })

  it('still works when storage throws', () => {
    const broken = {
      getItem: () => {
        throw new Error('denied')
      },
      setItem: () => {
        throw new Error('denied')
      },
      removeItem: () => {
        throw new Error('denied')
      },
    }
    expect(initLanguage(broken, 'cs')).toBe('cs')
    expect(() => setLanguage('en', broken)).not.toThrow()
    expect(getLanguage()).toBe('en')
  })
})

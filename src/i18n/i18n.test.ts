import { describe, expect, it } from 'vitest'
import type { TranslationKey } from './en'
import { LANGUAGES } from '../languages'
import { QUIZ_TYPES } from '../quizzes'
import { uiTexts } from '../ui'
import {
  createT,
  detectUiLanguage,
  getUiLanguage,
  initUiLanguage,
  joinTexts,
  uiLanguageLabel,
  setUiLanguage,
  shellTexts,
  t,
  UI_LANGUAGES,
  type Dictionaries,
} from './index'

function memoryStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial))
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
    removeItem: (key: string) => void data.delete(key),
  }
}

describe('detectUiLanguage', () => {
  it('uses Czech when the browser language starts with cs, otherwise English', () => {
    expect(detectUiLanguage('cs', null)).toBe('cs')
    expect(detectUiLanguage('cs-CZ', null)).toBe('cs')
    expect(detectUiLanguage('CS', null)).toBe('cs')
    expect(detectUiLanguage('en-US', null)).toBe('en')
    expect(detectUiLanguage('sk', null)).toBe('en')
    expect(detectUiLanguage(undefined, null)).toBe('en')
  })

  it('prefers a saved choice over the browser language', () => {
    expect(detectUiLanguage('cs-CZ', 'en')).toBe('en')
    expect(detectUiLanguage('en-US', 'cs')).toBe('cs')
  })

  it('ignores a saved value that is not a known language', () => {
    expect(detectUiLanguage('cs-CZ', 'de')).toBe('cs')
    expect(detectUiLanguage('en-US', '')).toBe('en')
  })
})

describe('t and setUiLanguage', () => {
  it('translates into the current language and follows switches', () => {
    setUiLanguage('en', memoryStorage())
    const english = t('scores.reset')
    setUiLanguage('cs', memoryStorage())
    const czech = t('scores.reset')
    expect(getUiLanguage()).toBe('cs')
    expect(english).toBe('Reset scores')
    expect(czech).not.toBe(english)
    expect(czech).not.toBe('')
  })

  it('shows the key itself rather than nothing when a key is unknown', () => {
    expect(t('no.such.key' as TranslationKey)).toBe('no.such.key')
  })
})

describe('createT', () => {
  const greetings = { en: { hello: 'Hello' }, cs: { hello: 'Ahoj' } }
  const farewells = { en: { bye: 'Bye' }, cs: { bye: 'Nashledanou' } }

  it('translates a dictionary set into the current UI language and follows switches', () => {
    const tGreeting = createT(greetings)
    setUiLanguage('en', memoryStorage())
    expect(tGreeting('hello')).toBe('Hello')
    setUiLanguage('cs', memoryStorage())
    expect(tGreeting('hello')).toBe('Ahoj')
  })

  it('serves every dictionary set from the same current language', () => {
    const [tGreeting, tFarewell] = [createT(greetings), createT(farewells)]
    setUiLanguage('cs', memoryStorage())
    expect([tGreeting('hello'), tFarewell('bye')]).toEqual(['Ahoj', 'Nashledanou'])
    setUiLanguage('en', memoryStorage())
    expect([tGreeting('hello'), tFarewell('bye')]).toEqual(['Hello', 'Bye'])
  })

  it('shows the key itself rather than nothing when a key is unknown', () => {
    setUiLanguage('cs', memoryStorage())
    expect(createT(greetings)('no.such.key' as 'hello')).toBe('no.such.key')
  })
})

describe('joinTexts', () => {
  const greetings = { en: { hello: 'Hello' }, cs: { hello: 'Ahoj' } }
  const farewells = { en: { bye: 'Bye' }, cs: { bye: 'Nashledanou' } }

  it('puts two sets side by side, so one translator serves the keys of both in every UI language', () => {
    const tBoth = createT(joinTexts(greetings, farewells))
    setUiLanguage('cs', memoryStorage())
    expect([tBoth('hello'), tBoth('bye')]).toEqual(['Ahoj', 'Nashledanou'])
    setUiLanguage('en', memoryStorage())
    expect([tBoth('hello'), tBoth('bye')]).toEqual(['Hello', 'Bye'])
  })

  it('leaves the sets it joined as they were', () => {
    joinTexts(greetings, farewells)
    expect(greetings).toEqual({ en: { hello: 'Hello' }, cs: { hello: 'Ahoj' } })
    expect(farewells).toEqual({ en: { bye: 'Bye' }, cs: { bye: 'Nashledanou' } })
  })
})

describe('uiLanguageLabel', () => {
  it('gives each language its own short label for the switch, independent of the current language', () => {
    setUiLanguage('en', memoryStorage())
    expect(UI_LANGUAGES.map((l) => uiLanguageLabel(l))).toEqual(['EN', 'CZ'])
    setUiLanguage('cs', memoryStorage())
    expect(UI_LANGUAGES.map((l) => uiLanguageLabel(l))).toEqual(['EN', 'CZ'])
  })
})

describe('initUiLanguage', () => {
  it('starts from the browser language and does not save anything yet', () => {
    const storage = memoryStorage()
    expect(initUiLanguage(storage, 'cs-CZ')).toBe('cs')
    expect(getUiLanguage()).toBe('cs')
    expect(storage.getItem('language')).toBeNull()
  })

  it('keeps the choice in localStorage under the key "language", where the page has always put it', () => {
    const storage = memoryStorage()
    setUiLanguage('cs', storage)
    expect(storage.getItem('language')).toBe('cs')
    expect(initUiLanguage(memoryStorage({ language: 'en' }), 'cs-CZ')).toBe('en')
  })

  it('remembers a manual switch for the next visit', () => {
    const storage = memoryStorage()
    initUiLanguage(storage, 'cs-CZ')
    setUiLanguage('en', storage)
    expect(initUiLanguage(storage, 'cs-CZ')).toBe('en')
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
    expect(initUiLanguage(broken, 'cs')).toBe('cs')
    expect(() => setUiLanguage('en', broken)).not.toThrow()
    expect(getUiLanguage()).toBe('en')
  })
})

// Every owner of texts keeps its own dictionaries, one per UI language. The compiler already rejects a key one of them
// lacks; these tests check what the compiler cannot see (a cast, a registry entry written loosely) and that each key
// has exactly one owner.

/** What is wrong with a set of dictionaries: a key some UI language lacks, or a text that is empty. */
function problemsOf(set: Dictionaries<string>): string[] {
  const keys = new Set(UI_LANGUAGES.flatMap((language) => Object.keys(set[language])))
  return UI_LANGUAGES.flatMap((language) =>
    [...keys].flatMap((key) => {
      const text: unknown = (set[language] as Record<string, unknown>)[key]
      if (text === undefined) return [`${language} lacks ${key}`]
      return typeof text === 'string' && text.trim() !== '' ? [] : [`${language} has no text for ${key}`]
    }),
  )
}

interface Owner {
  name: string
  texts: Dictionaries<string>
}
const shell: Owner = { name: 'the shell', texts: shellTexts }
const typeIn: Owner = { name: 'the shared type-in blocks (src/ui)', texts: uiTexts }
/** A quiz type's texts are found through the registry, so a new quiz type is covered without touching this file. */
const quizzes: Owner[] = QUIZ_TYPES.map((quizType) => ({ name: `the quiz type ${quizType.id}`, texts: quizType.texts }))
const owners = [shell, typeIn, ...quizzes]

describe('problemsOf', () => {
  it('reports a key one UI language lacks, and a text that is empty', () => {
    const gap = { en: { a: 'A', b: 'B' }, cs: { a: 'Á' } }
    expect(problemsOf(gap as unknown as Dictionaries<string>)).toEqual(['cs lacks b'])
    expect(problemsOf({ en: { a: 'A' }, cs: { a: ' ' } })).toEqual(['cs has no text for a'])
    expect(problemsOf({ en: { a: 'A' }, cs: { a: 'Á' } })).toEqual([])
  })
})

describe.each(owners.map((owner) => [owner.name, owner.texts] as const))('the texts of %s', (_name, texts) => {
  it('have every key in every UI language, and no empty text', () => {
    expect(problemsOf(texts)).toEqual([])
  })
})

describe('the texts a quiz type owns', () => {
  it.each(QUIZ_TYPES.map((quizType) => [quizType.id, quizType] as const))('%s: name every meter in each UI language', (_id, quizType) => {
    for (const language of UI_LANGUAGES) {
      for (const meter of quizType.meters) expect(quizType.texts[language][meter.label], `${language} ${meter.id}`).toBeTruthy()
    }
  })
})

describe('the texts of the learned languages', () => {
  it.each(LANGUAGES.map((language) => [language.id, language] as const))('%s: names itself and lists the same shortcuts in each UI language', (_id, language) => {
    for (const uiLanguage of UI_LANGUAGES) {
      expect(language.texts[uiLanguage].name.trim(), uiLanguage).not.toBe('')
      expect(language.texts[uiLanguage].shortcutHelp.length, uiLanguage).toBe(language.texts.en.shortcutHelp.length)
      expect(language.texts[uiLanguage].shortcutHelp.every((line) => line.trim() !== ''), uiLanguage).toBe(true)
    }
  })
})

describe('the owners of texts', () => {
  const keysOf = (texts: Dictionaries<string>) => new Set(UI_LANGUAGES.flatMap((language) => Object.keys(texts[language])))

  it('keep their texts to themselves: the shell, the type-in blocks and each quiz type share no key', () => {
    // One page fills the shell's elements and a quiz's area from these sets, so a shared key would let one owner
    // silently override another's text. (Two quiz types are never on one page: they may use the same keys.)
    const onOnePage: [Owner, Owner][] = [[shell, typeIn], ...quizzes.flatMap((quiz): [Owner, Owner][] => [[shell, quiz], [typeIn, quiz]])]
    const clashes = onOnePage.flatMap(([a, b]) => [...keysOf(a.texts)].filter((key) => keysOf(b.texts).has(key)).map((key) => `${key}: ${a.name} and ${b.name}`))
    expect(clashes).toEqual([])
  })
})

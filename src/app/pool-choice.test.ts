import { describe, expect, it } from 'vitest'
import { loadPoolChoice, POOL_CHOICE_KEY, savePoolChoice } from './pool-choice'

function memoryStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial))
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
    removeItem: (key: string) => void data.delete(key),
  }
}

const POOL = { language: 'cs', source: 'prirucka', quizType: 'noun-declension' }

describe('the saved pool choice', () => {
  it('is empty until something was saved', () => {
    expect(loadPoolChoice(memoryStorage())).toEqual({})
  })

  it('comes back as it was saved', () => {
    const storage = memoryStorage()
    savePoolChoice(storage, POOL)
    expect(loadPoolChoice(storage)).toEqual(POOL)
  })

  it('leaves out each part that is not text, and keeps the rest', () => {
    const storage = memoryStorage({ [POOL_CHOICE_KEY]: JSON.stringify({ language: 'cs', source: 7, quizType: null }) })
    expect(loadPoolChoice(storage)).toEqual({ language: 'cs' })
  })

  it.each([
    ['not JSON', 'nope'],
    ['a list', '["cs"]'],
    ['null', 'null'],
  ])('is empty when the stored text is %s', (_what, stored) => {
    expect(loadPoolChoice(memoryStorage({ [POOL_CHOICE_KEY]: stored }))).toEqual({})
  })

  it('carries on when storage cannot be read or written', () => {
    const broken = {
      getItem: () => {
        throw new Error('blocked')
      },
      setItem: () => {
        throw new Error('full')
      },
      removeItem: () => {},
    }
    expect(loadPoolChoice(broken)).toEqual({})
    expect(() => savePoolChoice(broken, POOL)).not.toThrow()
  })
})

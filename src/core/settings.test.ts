import { describe, expect, it } from 'vitest'
import { Settings, SETTINGS_KEY } from './settings'

const POOL = 'cs/prirucka/noun-declension'

function memoryStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial))
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
    removeItem: (key: string) => void data.delete(key),
  }
}

describe('Settings', () => {
  it('has nothing saved for a pool at first', () => {
    expect(new Settings(memoryStorage()).get(POOL)).toBeUndefined()
  })

  it('gives back what was saved, whatever JSON it is', () => {
    const settings = new Settings(memoryStorage())
    settings.set(POOL, { cases: ['nom', 'gen'] })
    expect(settings.get(POOL)).toEqual({ cases: ['nom', 'gen'] })
  })

  it('survives a reload', () => {
    const storage = memoryStorage()
    new Settings(storage).set(POOL, ['a', 'b'])
    expect(new Settings(storage).get(POOL)).toEqual(['a', 'b'])
  })

  it('keeps each pool separate and replaces a pool\'s value as a whole', () => {
    const settings = new Settings(memoryStorage())
    settings.set(POOL, [1])
    settings.set('cs/prirucka/verb-present-tense', [2])
    settings.set(POOL, [3])
    expect(settings.get(POOL)).toEqual([3])
    expect(settings.get('cs/prirucka/verb-present-tense')).toEqual([2])
  })

  it.each([
    ['not JSON', 'nope'],
    ['JSON that is not an object', '[1, 2]'],
    ['null', 'null'],
  ])('starts empty when the stored text is %s', (_what, stored) => {
    expect(new Settings(memoryStorage({ [SETTINGS_KEY]: stored })).get(POOL)).toBeUndefined()
  })

  it('carries on in memory when storage cannot be read or written', () => {
    const broken = {
      getItem: () => {
        throw new Error('blocked')
      },
      setItem: () => {
        throw new Error('full')
      },
      removeItem: () => {},
    }
    const settings = new Settings(broken)
    settings.set(POOL, 'x')
    expect(settings.get(POOL)).toBe('x')
  })
})

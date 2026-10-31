import { describe, expect, it } from 'vitest'
import { Scores, SCORES_KEY } from './scores'

function memoryStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial))
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
    removeItem: (key: string) => void data.delete(key),
  }
}

describe('Scores', () => {
  it('starts at zero', () => {
    expect(new Scores(memoryStorage()).get('a')).toEqual({
      cellsCorrect: 0,
      cellsChecked: 0,
      itemsCorrect: 0,
      itemsCompleted: 0,
    })
  })

  it('survives a reload', () => {
    const storage = memoryStorage()
    const before = new Scores(storage)
    before.recordCell('a', true)
    before.recordCell('a', false)
    before.recordItem('a', false)

    expect(new Scores(storage).get('a')).toEqual({
      cellsCorrect: 1,
      cellsChecked: 2,
      itemsCorrect: 0,
      itemsCompleted: 1,
    })
  })

  it('keeps each exercise type separate', () => {
    const scores = new Scores(memoryStorage())
    scores.recordCell('verb-present-tense', true)
    scores.recordCell('some-future-exercise', false)
    expect(scores.get('verb-present-tense').cellsCorrect).toBe(1)
    expect(scores.get('some-future-exercise')).toMatchObject({ cellsCorrect: 0, cellsChecked: 1 })
  })

  it('reset clears every exercise, including what was stored', () => {
    const storage = memoryStorage()
    const scores = new Scores(storage)
    scores.recordCell('a', true)
    scores.recordCell('b', true)
    scores.reset()
    expect(scores.get('a').cellsChecked).toBe(0)
    expect(new Scores(storage).get('b').cellsChecked).toBe(0)
  })

  it('starts fresh when the stored value is not usable', () => {
    for (const junk of ['not json', '[]', '{"a": "x"}', '{"a": {"cellsChecked": "many"}}', 'null']) {
      expect(new Scores(memoryStorage({ [SCORES_KEY]: junk })).get('a').cellsChecked).toBe(0)
    }
  })

  it('keeps working in memory when storage is unavailable', () => {
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
    const scores = new Scores(broken)
    scores.recordCell('a', true)
    expect(scores.get('a').cellsChecked).toBe(1)
    expect(() => scores.reset()).not.toThrow()
  })
})

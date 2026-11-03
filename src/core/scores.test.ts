import { describe, expect, it } from 'vitest'
import { Scores, SCORES_KEY } from './scores'

const POOL = 'cs/prirucka/verb-present-tense'

function memoryStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial))
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
    removeItem: (key: string) => void data.delete(key),
  }
}

describe('Scores', () => {
  it('starts with nothing recorded for a pool', () => {
    expect(new Scores(memoryStorage()).get(POOL)).toEqual({})
  })

  it('counts every record as a try and every correct one also as correct, per meter', () => {
    const scores = new Scores(memoryStorage())
    scores.record(POOL, 'cells', true)
    scores.record(POOL, 'cells', false)
    scores.record(POOL, 'cells', true)
    scores.record(POOL, 'items', false)
    expect(scores.get(POOL)).toEqual({
      cells: { correct: 2, total: 3 },
      items: { correct: 0, total: 1 },
    })
  })

  it('survives a reload', () => {
    const storage = memoryStorage()
    const before = new Scores(storage)
    before.record('a', 'cells', true)
    before.record('a', 'cells', false)
    before.record('a', 'items', false)

    expect(new Scores(storage).get('a')).toEqual({
      cells: { correct: 1, total: 2 },
      items: { correct: 0, total: 1 },
    })
  })

  it('keeps each pool separate', () => {
    const scores = new Scores(memoryStorage())
    scores.record('cs/prirucka/verb-present-tense', 'cells', true)
    scores.record('cs/some-source/verb-present-tense', 'cells', false)
    scores.record('de/prirucka/some-future-quiz', 'words', true)
    expect(scores.get('cs/prirucka/verb-present-tense')).toEqual({ cells: { correct: 1, total: 1 } })
    expect(scores.get('cs/some-source/verb-present-tense')).toEqual({ cells: { correct: 0, total: 1 } })
    expect(scores.get('de/prirucka/some-future-quiz')).toEqual({ words: { correct: 1, total: 1 } })
  })

  it('hands out a copy, so a caller cannot change the scores by editing what it got', () => {
    const scores = new Scores(memoryStorage())
    scores.record(POOL, 'cells', true)
    const copy = scores.get(POOL)
    copy.cells!.correct = 99
    delete copy.cells
    expect(scores.get(POOL)).toEqual({ cells: { correct: 1, total: 1 } })
  })

  it('stores the pools under the single key "scores"', () => {
    const storage = memoryStorage()
    new Scores(storage).record(POOL, 'cells', true)
    expect(SCORES_KEY).toBe('scores')
    expect(JSON.parse(storage.getItem('scores')!)).toEqual({ [POOL]: { cells: { correct: 1, total: 1 } } })
  })

  it('reset clears every pool, including what was stored', () => {
    const storage = memoryStorage()
    const scores = new Scores(storage)
    scores.record('a', 'cells', true)
    scores.record('b', 'cells', true)
    scores.reset()
    expect(scores.get('a')).toEqual({})
    expect(new Scores(storage).get('b')).toEqual({})
    expect(storage.getItem(SCORES_KEY)).toBeNull()
  })

  it('starts fresh when the stored value is not usable', () => {
    for (const junk of [
      'not json',
      '[]',
      'null',
      '{"a": "x"}',
      '{"a": []}',
      '{"a": {"cells": "many"}}',
      '{"a": {"cells": {"correct": "1", "total": 2}}}',
      '{"a": {"cells": {"correct": 1}}}',
      '{"a": {"cells": null}}',
    ]) {
      expect(new Scores(memoryStorage({ [SCORES_KEY]: junk })).get('a'), junk).toEqual({})
    }
  })

  it('ignores an entry saved in the old shape (keyed by exercise type, with flat counters)', () => {
    const old = JSON.stringify({
      'verb-present-tense': { cellsCorrect: 5, cellsChecked: 8, itemsCorrect: 1, itemsCompleted: 2 },
    })
    const scores = new Scores(memoryStorage({ [SCORES_KEY]: old }))
    expect(scores.get('verb-present-tense')).toEqual({})
    expect(scores.get(POOL)).toEqual({})
  })

  it('keeps the pools that are usable and drops only the ones that are not', () => {
    const mixed = JSON.stringify({
      good: { cells: { correct: 2, total: 3 } },
      'verb-present-tense': { cellsCorrect: 5, cellsChecked: 8, itemsCorrect: 1, itemsCompleted: 2 },
    })
    const storage = memoryStorage({ [SCORES_KEY]: mixed })
    const scores = new Scores(storage)
    expect(scores.get('good')).toEqual({ cells: { correct: 2, total: 3 } })
    expect(scores.get('verb-present-tense')).toEqual({})

    scores.record('good', 'cells', true)
    expect(JSON.parse(storage.getItem(SCORES_KEY)!)).toEqual({ good: { cells: { correct: 3, total: 4 } } })
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
    scores.record('a', 'cells', true)
    expect(scores.get('a')).toEqual({ cells: { correct: 1, total: 1 } })
    expect(() => scores.reset()).not.toThrow()
  })
})

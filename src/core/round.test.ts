import { beforeEach, describe, expect, it } from 'vitest'
import type { Item } from './cell'
import { Round } from './round'
import { Scores } from './scores'

const TYPE = 'test-exercise'

const item: Item = {
  prompt: 'mít',
  cells: [
    { label: 'verbPresent.1sg', acceptedForms: ['mám'] },
    { label: 'verbPresent.1pl', acceptedForms: ['máme'] },
    { label: 'verbPresent.2sg', acceptedForms: ['máš'] },
    { label: 'verbPresent.2pl', acceptedForms: ['máte'] },
    { label: 'verbPresent.3sg', acceptedForms: ['má'] },
    { label: 'verbPresent.3pl', acceptedForms: ['mají', 'měj'] },
  ],
}
const ALL_RIGHT = ['mám', 'máme', 'máš', 'máte', 'má', 'mají']

function memoryStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial))
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
    removeItem: (key: string) => void data.delete(key),
  }
}

let scores: Scores
beforeEach(() => {
  scores = new Scores(memoryStorage())
})
const newRound = () => new Round(TYPE, item, scores)

describe('Round: checking one cell', () => {
  it('locks a correct cell as correct and counts it', () => {
    const round = newRound()
    round.checkCell(0, 'mám')
    expect(round.state(0)).toBe('correct')
    expect(scores.get(TYPE)).toMatchObject({ cellsCorrect: 1, cellsChecked: 1 })
  })

  it('locks a wrong cell as wrong and counts it as checked only', () => {
    const round = newRound()
    round.checkCell(0, 'mam')
    expect(round.state(0)).toBe('wrong')
    expect(scores.get(TYPE)).toMatchObject({ cellsCorrect: 0, cellsChecked: 1 })
  })

  it('ignores a check on a cell that is already locked', () => {
    const round = newRound()
    round.checkCell(0, 'mam')
    round.checkCell(0, 'mám')
    expect(round.state(0)).toBe('wrong')
    expect(scores.get(TYPE)).toMatchObject({ cellsCorrect: 0, cellsChecked: 1 })
  })

  it('ignores a check on an empty input: not counted, not locked', () => {
    const round = newRound()
    round.checkCell(0, '')
    round.checkCell(1, '   ')
    expect(round.state(0)).toBe('open')
    expect(round.state(1)).toBe('open')
    expect(scores.get(TYPE).cellsChecked).toBe(0)
    round.checkCell(0, 'mám')
    expect(round.state(0)).toBe('correct')
  })
})

describe('Round: Check all', () => {
  it('checks every cell and counts empty ones as wrong', () => {
    const round = newRound()
    round.checkAll(['mám', '', 'máš', 'x', '  ', 'mají'])
    expect([0, 1, 2, 3, 4, 5].map((i) => round.state(i))).toEqual([
      'correct', 'wrong', 'correct', 'wrong', 'wrong', 'correct',
    ])
    expect(scores.get(TYPE)).toEqual({ cellsCorrect: 3, cellsChecked: 6, itemsCorrect: 0, itemsCompleted: 1 })
  })

  it('leaves cells that are already locked alone', () => {
    const round = newRound()
    round.checkCell(0, 'wrong')
    round.checkCell(1, 'máme')
    round.checkAll(ALL_RIGHT)
    expect(round.state(0)).toBe('wrong')
    expect(scores.get(TYPE)).toEqual({ cellsCorrect: 5, cellsChecked: 6, itemsCorrect: 0, itemsCompleted: 1 })
  })

  it('does nothing when every cell is already locked', () => {
    const round = newRound()
    round.checkAll(ALL_RIGHT)
    round.checkAll(ALL_RIGHT)
    expect(scores.get(TYPE)).toEqual({ cellsCorrect: 6, cellsChecked: 6, itemsCorrect: 1, itemsCompleted: 1 })
  })
})

describe('Round: completing the item', () => {
  it('does not count the item until every cell is checked', () => {
    const round = newRound()
    ALL_RIGHT.slice(0, 5).forEach((answer, i) => round.checkCell(i, answer))
    expect(round.complete).toBe(false)
    expect(scores.get(TYPE)).toMatchObject({ cellsCorrect: 5, cellsChecked: 5, itemsCompleted: 0, itemsCorrect: 0 })
  })

  it('counts a fully correct item once the last cell is checked', () => {
    const round = newRound()
    ALL_RIGHT.forEach((answer, i) => round.checkCell(i, answer))
    expect(round.complete).toBe(true)
    expect(scores.get(TYPE)).toMatchObject({ cellsCorrect: 6, cellsChecked: 6, itemsCompleted: 1, itemsCorrect: 1 })
  })

  it('counts an item with one wrong cell as completed but not correct', () => {
    const round = newRound()
    ALL_RIGHT.forEach((answer, i) => round.checkCell(i, i === 3 ? 'mate' : answer))
    expect(scores.get(TYPE)).toMatchObject({ cellsCorrect: 5, cellsChecked: 6, itemsCompleted: 1, itemsCorrect: 0 })
  })

  it('accepts any variant listed for a cell', () => {
    const round = newRound()
    round.checkCell(5, 'měj')
    expect(round.state(5)).toBe('correct')
  })

  it('counts the item only once, however often cells are re-checked afterwards', () => {
    const round = newRound()
    ALL_RIGHT.forEach((answer, i) => round.checkCell(i, answer))
    ALL_RIGHT.forEach((answer, i) => round.checkCell(i, answer))
    expect(scores.get(TYPE)).toMatchObject({ cellsChecked: 6, itemsCompleted: 1 })
  })

  it('scores again each time the item comes up in a new round', () => {
    for (const answers of [ALL_RIGHT, ALL_RIGHT, ['x', 'x', 'x', 'x', 'x', 'x']]) {
      const round = newRound()
      answers.forEach((answer, i) => round.checkCell(i, answer))
    }
    expect(scores.get(TYPE)).toEqual({ cellsCorrect: 12, cellsChecked: 18, itemsCorrect: 2, itemsCompleted: 3 })
  })
})

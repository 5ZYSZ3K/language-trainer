import { beforeEach, describe, expect, it } from 'vitest'
import type { Item } from './cell'
import { Round } from './round'

const item: Item = {
  prompt: 'mít',
  cells: [
    { id: '1sg', acceptedForms: ['mám'] },
    { id: '1pl', acceptedForms: ['máme'] },
    { id: '2sg', acceptedForms: ['máš'] },
    { id: '2pl', acceptedForms: ['máte'] },
    { id: '3sg', acceptedForms: ['má'] },
    { id: '3pl', acceptedForms: ['mají', 'měj'] },
  ],
}
const ALL_RIGHT = ['mám', 'máme', 'máš', 'máte', 'má', 'mají']

/** What the round reported, in order: one entry per cell checked, one per item completed. */
let cells: boolean[]
let items: boolean[]
beforeEach(() => {
  cells = []
  items = []
})
const newRound = () =>
  new Round(item, {
    cellChecked: (correct) => cells.push(correct),
    itemCompleted: (fullyCorrect) => items.push(fullyCorrect),
  })

describe('Round: checking one cell', () => {
  it('locks a correct cell as correct and counts it', () => {
    const round = newRound()
    round.checkCell(0, 'mám')
    expect(round.state(0)).toBe('correct')
    expect(cells).toEqual([true])
  })

  it('locks a wrong cell as wrong and reports it as an incorrect check', () => {
    const round = newRound()
    round.checkCell(0, 'mam')
    expect(round.state(0)).toBe('wrong')
    expect(cells).toEqual([false])
  })

  it('ignores a check on a cell that is already locked', () => {
    const round = newRound()
    round.checkCell(0, 'mam')
    round.checkCell(0, 'mám')
    expect(round.state(0)).toBe('wrong')
    expect(cells).toEqual([false])
  })

  it('ignores a check on an empty input: not counted, not locked', () => {
    const round = newRound()
    round.checkCell(0, '')
    round.checkCell(1, '   ')
    expect(round.state(0)).toBe('open')
    expect(round.state(1)).toBe('open')
    expect(cells).toEqual([])
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
    expect(cells).toEqual([true, false, true, false, false, true])
    expect(items).toEqual([false])
  })

  it('leaves cells that are already locked alone', () => {
    const round = newRound()
    round.checkCell(0, 'wrong')
    round.checkCell(1, 'máme')
    round.checkAll(ALL_RIGHT)
    expect(round.state(0)).toBe('wrong')
    expect(cells).toEqual([false, true, true, true, true, true])
    expect(items).toEqual([false])
  })

  it('does nothing when every cell is already locked', () => {
    const round = newRound()
    round.checkAll(ALL_RIGHT)
    round.checkAll(ALL_RIGHT)
    expect(cells).toEqual([true, true, true, true, true, true])
    expect(items).toEqual([true])
  })
})

describe('Round: completing the item', () => {
  it('does not count the item until every cell is checked', () => {
    const round = newRound()
    ALL_RIGHT.slice(0, 5).forEach((answer, i) => round.checkCell(i, answer))
    expect(round.complete).toBe(false)
    expect(cells).toEqual([true, true, true, true, true])
    expect(items).toEqual([])
  })

  it('counts a fully correct item once the last cell is checked', () => {
    const round = newRound()
    ALL_RIGHT.forEach((answer, i) => round.checkCell(i, answer))
    expect(round.complete).toBe(true)
    expect(cells).toEqual([true, true, true, true, true, true])
    expect(items).toEqual([true])
  })

  it('counts an item with one wrong cell as completed but not correct', () => {
    const round = newRound()
    ALL_RIGHT.forEach((answer, i) => round.checkCell(i, i === 3 ? 'mate' : answer))
    expect(cells).toEqual([true, true, true, false, true, true])
    expect(items).toEqual([false])
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
    expect(cells).toHaveLength(6)
    expect(items).toHaveLength(1)
  })

  it('reports again each time the item comes up in a new round', () => {
    for (const answers of [ALL_RIGHT, ALL_RIGHT, ['x', 'x', 'x', 'x', 'x', 'x']]) {
      const round = newRound()
      answers.forEach((answer, i) => round.checkCell(i, answer))
    }
    expect(cells.filter(Boolean)).toHaveLength(12)
    expect(cells).toHaveLength(18)
    expect(items).toEqual([true, true, false])
  })
})

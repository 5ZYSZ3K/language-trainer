import { describe, expect, it } from 'vitest'
import type { Item } from '../../core/cell'
import { nounDeclensionCellIds } from './cells'
import { allCells, cellsOfCase, cellsOfNumber, practiceOf, readFilter, sameFilter, saveFilter, toggleGroup } from './filter'

const item = (ids: readonly string[]): Item => ({ prompt: 'x', cells: ids.map((id) => ({ id, acceptedForms: [id] })) })
const regular = item(nounDeclensionCellIds)
const pluralOnly = item(['nom-pl', 'gen-pl', 'dat-pl'])
const singularOnly = item(['nom-sg', 'gen-sg'])
const askedIds = (noun: Item, filter: ReadonlySet<string>) => practiceOf(noun, filter).asked.map((cell) => cell.id)
const shownIds = (noun: Item, filter: ReadonlySet<string>) => practiceOf(noun, filter).shown.map((cell) => cell.id)

describe('practiceOf', () => {
  it('with everything ticked asks for every cell but the first, which it shows as given', () => {
    expect(shownIds(regular, allCells())).toEqual(nounDeclensionCellIds)
    expect(askedIds(regular, allCells())).toEqual(nounDeclensionCellIds.slice(1))
  })

  it('takes the first cell of a noun without a singular as the given one', () => {
    expect(shownIds(pluralOnly, allCells())).toEqual(['nom-pl', 'gen-pl', 'dat-pl'])
    expect(askedIds(pluralOnly, allCells())).toEqual(['gen-pl', 'dat-pl'])
  })

  it('applies only the ticks of the cells a noun has: a plural-only noun ignores the singular ones', () => {
    const pluralTicks = new Set(cellsOfNumber('pl'))
    expect(askedIds(pluralOnly, pluralTicks)).toEqual(['gen-pl', 'dat-pl'])
    expect(askedIds(pluralOnly, new Set(cellsOfNumber('sg')))).toEqual([])
    expect(askedIds(singularOnly, pluralTicks)).toEqual([])
  })

  it('shows and asks exactly what is ticked', () => {
    const filter = new Set(['gen-sg', 'acc-pl', 'gen-pl'])
    expect(askedIds(regular, filter)).toEqual(['gen-sg', 'gen-pl', 'acc-pl'])
    expect(shownIds(regular, filter)).toEqual(['gen-sg', 'gen-pl', 'acc-pl'])
  })

  it('leaves the given cell off the page when its own tick is off, and still asks for the rest', () => {
    const filter = new Set(cellsOfNumber('pl'))
    expect(shownIds(regular, filter)).toEqual(cellsOfNumber('pl'))
    expect(askedIds(regular, filter)).toEqual(cellsOfNumber('pl'))
  })

  it('shows the given cell first when its tick is on', () => {
    expect(shownIds(regular, new Set(['nom-sg', 'dat-sg']))).toEqual(['nom-sg', 'dat-sg'])
    expect(askedIds(regular, new Set(['nom-sg', 'dat-sg']))).toEqual(['dat-sg'])
  })

  it('asks for nothing when nothing is ticked, or only the given cell is', () => {
    expect(practiceOf(regular, new Set())).toEqual({ asked: [], shown: [] })
    expect(practiceOf(regular, new Set(['nom-sg'])).asked).toEqual([])
    expect(shownIds(regular, new Set(['nom-sg']))).toEqual(['nom-sg'])
  })

  it('has nothing to ask for a noun with no cells at all', () => {
    expect(practiceOf(item([]), allCells())).toEqual({ asked: [], shown: [] })
  })

  it('hands out the cells of the item themselves, so that a cell can be told apart by identity', () => {
    const { asked, shown } = practiceOf(regular, allCells())
    expect(shown[0]).toBe(regular.cells[0])
    expect(asked[0]).toBe(regular.cells[1])
  })
})

describe('groups of cells', () => {
  it('a case is its singular and its plural cell, a number is its seven cases', () => {
    expect(cellsOfCase('acc')).toEqual(['acc-sg', 'acc-pl'])
    expect(cellsOfNumber('pl')).toEqual(['nom-pl', 'gen-pl', 'dat-pl', 'acc-pl', 'voc-pl', 'loc-pl', 'ins-pl'])
  })

  it('toggleGroup switches a fully ticked group off', () => {
    const next = toggleGroup(allCells(), cellsOfCase('gen'))
    expect(next.has('gen-sg')).toBe(false)
    expect(next.has('gen-pl')).toBe(false)
    expect(next.size).toBe(12)
  })

  it('toggleGroup switches a group that is not fully ticked on, whichever of its cells were', () => {
    const half = new Set(['gen-sg'])
    expect([...toggleGroup(half, cellsOfCase('gen'))].sort()).toEqual(['gen-pl', 'gen-sg'])
    expect([...toggleGroup(new Set(), cellsOfNumber('sg'))].sort()).toEqual([...cellsOfNumber('sg')].sort())
  })

  it('toggleGroup leaves the filter it was given alone', () => {
    const filter = allCells()
    toggleGroup(filter, cellsOfNumber('sg'))
    expect(filter.size).toBe(14)
  })
})

describe('the saved filter', () => {
  it('comes back as it was saved, in display order', () => {
    const filter = new Set(['ins-pl', 'nom-sg', 'gen-pl'])
    expect(saveFilter(filter)).toEqual({ cells: ['nom-sg', 'gen-pl', 'ins-pl'] })
    expect(sameFilter(readFilter(saveFilter(filter)), filter)).toBe(true)
  })

  it('keeps an empty choice empty: asking for nothing is a real choice', () => {
    expect(readFilter(saveFilter(new Set()))).toEqual(new Set())
  })

  it('means everything on when nothing, or something unreadable, was saved', () => {
    for (const saved of [undefined, null, 'cells', 7, [], {}, { cells: 'nom-sg' }, { cells: null }]) {
      expect(sameFilter(readFilter(saved), allCells()), JSON.stringify(saved)).toBe(true)
    }
  })

  it('drops ids it does not know and anything that is not text', () => {
    expect(readFilter({ cells: ['nom-sg', '1sg', 'xx-yy', 4, null, 'gen-pl'] })).toEqual(new Set(['nom-sg', 'gen-pl']))
  })

  it('compares filters by what is ticked, not by order', () => {
    expect(sameFilter(new Set(['a', 'b']), new Set(['b', 'a']))).toBe(true)
    expect(sameFilter(new Set(['a']), new Set(['a', 'b']))).toBe(false)
    expect(sameFilter(new Set(['a', 'c']), new Set(['a', 'b']))).toBe(false)
  })
})

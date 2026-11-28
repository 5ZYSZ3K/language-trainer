import { describe, expect, it } from 'vitest'
import { allCells } from '../noun-declension/filter'
import { FilterDraft } from './filter'

// The filter itself (its cells, its groups, how it is saved and read back) is the noun quiz's, tested there.

const draftOn = (current: Iterable<string>): FilterDraft => {
  const draft = new FilterDraft()
  draft.open(new Set(current))
  return draft
}
const sorted = (filter: ReadonlySet<string>) => [...filter].sort()

describe('FilterDraft, what the filter dialog holds while it is open', () => {
  it('starts from the filter it is opened on, and gives back the ticks it is left with, only if they changed', () => {
    const draft = draftOn(['gen-sg', 'dat-pl'])
    expect(sorted(draft.ticked)).toEqual(['dat-pl', 'gen-sg'])
    draft.set('ins-sg', true)
    draft.set('gen-sg', false)
    expect(draft.close()).toEqual(new Set(['dat-pl', 'ins-sg']))

    draft.open(new Set(['gen-sg']))
    draft.set('gen-pl', true)
    draft.set('gen-pl', false)
    expect(draft.close()).toBeUndefined()
  })

  it('gives back the ticks in display order, the singular ones first', () => {
    const draft = draftOn([])
    for (const id of ['ins-pl', 'gen-sg', 'nom-pl', 'dat-sg'] as const) draft.set(id, true)
    expect([...draft.close()!]).toEqual(['gen-sg', 'dat-sg', 'nom-pl', 'ins-pl'])
  })

  it('switches a whole case (a row) on, unless it is all on: then off', () => {
    const draft = draftOn(['gen-sg'])
    draft.toggleCase('gen')
    expect(sorted(draft.ticked)).toEqual(['gen-pl', 'gen-sg'])
    draft.toggleCase('gen')
    expect(draft.ticked.size).toBe(0)
    draft.toggleCase('voc')
    expect(sorted(draft.ticked)).toEqual(['voc-pl', 'voc-sg'])
  })

  it('switches a whole number (a column) on, unless it is all on: then off', () => {
    const draft = draftOn(['gen-pl', 'dat-sg'])
    draft.toggleNumber('pl')
    expect(sorted(draft.ticked)).toEqual(['acc-pl', 'dat-pl', 'dat-sg', 'gen-pl', 'ins-pl', 'loc-pl', 'nom-pl', 'voc-pl'])
    draft.toggleNumber('pl')
    expect(sorted(draft.ticked)).toEqual(['dat-sg'])
  })

  it('selects all and clears all', () => {
    const draft = draftOn(['gen-sg'])
    draft.selectAll()
    expect(draft.ticked).toEqual(allCells())
    draft.clearAll()
    expect(draft.ticked.size).toBe(0)
    expect(draft.close()).toEqual(new Set())
  })

  it('changes nothing it was opened on', () => {
    const current = new Set(['gen-sg'])
    const draft = new FilterDraft()
    draft.open(current)
    draft.set('dat-sg', true)
    draft.toggleNumber('pl')
    draft.clearAll()
    expect([...current]).toEqual(['gen-sg'])
  })
})

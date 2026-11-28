import { describe, expect, it } from 'vitest'
import { allCases, FilterDraft, readCaseFilter, saveCaseFilter } from './filter'

describe('the case filter as it is saved', () => {
  it('ticks all seven cases when nothing is saved', () => {
    expect([...readCaseFilter(undefined)]).toEqual(['nom', 'gen', 'dat', 'acc', 'voc', 'loc', 'ins'])
    expect(readCaseFilter(undefined)).toEqual(allCases())
  })

  it('saves the ticked cases in their order, and reads them back', () => {
    const saved = saveCaseFilter(new Set(['ins', 'gen']))
    expect(saved).toEqual({ cases: ['gen', 'ins'] })
    expect([...readCaseFilter(JSON.parse(JSON.stringify(saved)))]).toEqual(['gen', 'ins'])
  })

  it('keeps nothing ticked as a choice of its own', () => {
    expect(readCaseFilter(saveCaseFilter(new Set())).size).toBe(0)
  })

  it('checks what an older build may have saved: anything else ticks everything, and unknown cases are dropped', () => {
    for (const saved of [null, 'gen', [], { cells: ['gen-sg'] }, { cases: 'gen' }]) expect(readCaseFilter(saved), JSON.stringify(saved)).toEqual(allCases())
    expect([...readCaseFilter({ cases: ['gen', 'dual', 3, 'loc'] })]).toEqual(['gen', 'loc'])
  })
})

describe('FilterDraft, what the filter dialog holds while it is open', () => {
  it('starts from the filter it is opened on, and gives back the ticks it is left with, only if they changed', () => {
    const draft = new FilterDraft()
    draft.open(new Set(['gen', 'dat']))
    expect([...draft.ticked]).toEqual(['gen', 'dat'])
    draft.set('ins', true)
    draft.set('gen', false)
    expect(draft.close()).toEqual(new Set(['dat', 'ins']))

    draft.open(new Set(['gen']))
    draft.set('dat', true)
    draft.set('dat', false)
    expect(draft.close()).toBeUndefined()
  })

  it('selects all and clears all', () => {
    const draft = new FilterDraft()
    draft.open(new Set(['gen']))
    draft.selectAll()
    expect(draft.ticked).toEqual(allCases())
    draft.clearAll()
    expect(draft.ticked.size).toBe(0)
    expect(draft.close()).toEqual(new Set())
  })

  it('changes nothing it was opened on', () => {
    const current = new Set(['gen'] as const)
    const draft = new FilterDraft()
    draft.open(current)
    draft.clearAll()
    expect([...current]).toEqual(['gen'])
  })
})

import { describe, expect, it } from 'vitest'
import type { Item } from '../../core/cell'
import { verbPresentCellIds, verbPresentCellLabelKeys, verbPresentTense, verbPresentTenseContract } from './index'

describe('verbPresentTense', () => {
  it('has the permanent id verb-present-tense, which names its data file and its scores', () => {
    expect(verbPresentTense.id).toBe('verb-present-tense')
  })

  it('uses its own contract', () => {
    expect(verbPresentTense.contract).toBe(verbPresentTenseContract)
  })

  it('counts forms and verbs, in that order', () => {
    expect(verbPresentTense.meters).toEqual([
      { id: 'cells', label: 'scores.cells' },
      { id: 'items', label: 'scores.items' },
    ])
  })

  it('has six neutral cell ids, in display order', () => {
    expect(verbPresentCellIds).toEqual(['1sg', '1pl', '2sg', '2pl', '3sg', '3pl'])
  })
})

describe('verbPresentCellLabelKeys', () => {
  it('maps every cell id, and nothing else, to its text key verbPresent.<id>', () => {
    expect(Object.keys(verbPresentCellLabelKeys).sort()).toEqual([...verbPresentCellIds].sort())
    for (const id of verbPresentCellIds) expect(verbPresentCellLabelKeys[id]).toBe(`verbPresent.${id}`)
  })
})

describe('verbPresentTenseContract', () => {
  const ids = ['1sg', '1pl', '2sg', '2pl', '3sg', '3pl']
  const valid = (): Item => ({ prompt: 'bát se', cells: ids.map((id) => ({ id, acceptedForms: [`${id} se`] })) })
  const problems = (value: unknown) => verbPresentTenseContract.validateItem(value)

  it('accepts an item with the six ids in order, each with a form', () => {
    expect(problems(valid())).toEqual([])
  })

  it('accepts several forms per cell and ignores extra properties such as sourceUrl', () => {
    const item = { ...valid(), sourceUrl: 'https://example.test/' }
    item.cells[0]!.acceptedForms = ['mohu', 'můžu']
    expect(problems(item)).toEqual([])
  })

  it('reports a cell without any form as "no form found for <id>"', () => {
    const item = valid()
    item.cells[1]!.acceptedForms = []
    expect(problems(item)).toEqual(['no form found for 1pl'])
  })

  it('treats blank forms as no form', () => {
    const item = valid()
    item.cells[2]!.acceptedForms = ['', '  ']
    expect(problems(item)).toEqual(['no form found for 2sg'])
  })

  it('accepts a cell that has at least one non-empty form next to blank ones', () => {
    const item = valid()
    item.cells[2]!.acceptedForms = ['', 'bojíš se']
    expect(problems(item)).toEqual([])
  })

  it('reports every cell without a form, in cell order', () => {
    const item = valid()
    item.cells[3]!.acceptedForms = []
    item.cells[0]!.acceptedForms = []
    expect(problems(item)).toEqual(['no form found for 1sg', 'no form found for 2pl'])
  })

  it('reports a missing or non-list acceptedForms as no form', () => {
    const item = valid() as unknown as { cells: { id: string; acceptedForms?: unknown }[] }
    delete item.cells[0]!.acceptedForms
    item.cells[1]!.acceptedForms = 'bojím se'
    expect(problems(item)).toEqual(['no form found for 1sg', 'no form found for 1pl'])
  })

  it('reports a form that is not text', () => {
    const item = valid() as unknown as { cells: { id: string; acceptedForms: unknown[] }[] }
    item.cells[0]!.acceptedForms = ['bojím se', 42]
    expect(problems(item)).toEqual(['cell 1sg has a form that is not text'])
  })

  it('requires a non-empty prompt', () => {
    expect(problems({ ...valid(), prompt: '' })).toEqual(['missing prompt'])
    expect(problems({ ...valid(), prompt: '   ' })).toEqual(['missing prompt'])
    expect(problems({ ...valid(), prompt: undefined })).toEqual(['missing prompt'])
    expect(problems({ ...valid(), prompt: 7 })).toEqual(['missing prompt'])
  })

  it('requires exactly the six ids, in order', () => {
    const missing = valid()
    missing.cells.pop()
    expect(problems(missing)).toEqual(['cell ids must be 1sg, 1pl, 2sg, 2pl, 3sg, 3pl in that order, found 1sg, 1pl, 2sg, 2pl, 3sg'])

    const swapped = valid()
    swapped.cells.reverse()
    expect(problems(swapped)).toEqual(['cell ids must be 1sg, 1pl, 2sg, 2pl, 3sg, 3pl in that order, found 3pl, 3sg, 2pl, 2sg, 1pl, 1sg'])

    const extra = valid()
    extra.cells.push({ id: '4sg', acceptedForms: ['x'] })
    expect(problems(extra)).toHaveLength(1)
  })

  it('reports a missing cell list', () => {
    expect(problems({ prompt: 'bát se' })).toEqual(['cells must be a list'])
  })

  it('rejects values that are not objects', () => {
    expect(problems(null)).toEqual(['item must be an object'])
    expect(problems('bát se')).toEqual(['item must be an object'])
    expect(problems([])).toEqual(['item must be an object'])
  })

  it('reports the prompt problem together with the cell problems', () => {
    const item = valid()
    item.prompt = ''
    item.cells[0]!.acceptedForms = []
    expect(problems(item)).toEqual(['missing prompt', 'no form found for 1sg'])
  })

  it('keys an item by its prompt', () => {
    expect(verbPresentTenseContract.keyOf(valid())).toBe('bát se')
  })
})

import { describe, expect, it } from 'vitest'
import { verbPresentCellLabelKeys, verbPresentTense } from './verb-present-tense'

describe('verbPresentTense', () => {
  it('has six neutral cell ids, in display order', () => {
    expect(verbPresentTense.cellIds).toEqual(['1sg', '1pl', '2sg', '2pl', '3sg', '3pl'])
  })
})

describe('verbPresentCellLabelKeys', () => {
  it('maps every cell id, and nothing else, to its text key verbPresent.<id>', () => {
    expect(Object.keys(verbPresentCellLabelKeys).sort()).toEqual([...verbPresentTense.cellIds].sort())
    for (const id of verbPresentTense.cellIds) expect(verbPresentCellLabelKeys[id]).toBe(`verbPresent.${id}`)
  })
})

import { describe, expect, it } from 'vitest'
import type { Cell } from '../../core/cell'
import { nounDeclensionContract, type NounItem } from './index'

const carryOver = nounDeclensionContract.carryOver!

/** "manžel" as a scrape makes it: forms only. */
const scraped = (overrides: Partial<Record<string, string[]>> = {}, gender = 'm. živ.'): NounItem => {
  const forms: Record<string, string[]> = {
    'nom-sg': ['manžel'],
    'dat-sg': ['manželovi', 'manželu'],
    'nom-pl': ['manželé', 'manželové'],
    ...overrides,
  }
  const cells = Object.entries(forms).flatMap(([id, values]): Cell[] =>
    values === undefined ? [] : [{ id, acceptedForms: values.map((value) => ({ value })) }],
  )
  return { prompt: 'manžel', gender, cells }
}

const explanation = { en: '<p>Manželové are husbands one after another.</p>', cs: '<p>Manželové jsou postupní manželé.</p>' }

/** "manžel" as the owner left it: remarks on two variants, and the noun's explanation. */
const written: NounItem = {
  prompt: 'manžel',
  gender: 'm. živ.',
  explanation,
  cells: [
    { id: 'nom-sg', acceptedForms: [{ value: 'manžel' }] },
    { id: 'dat-sg', acceptedForms: [{ value: 'manželovi' }, { value: 'manželu', remarks: ['non-final'] }] },
    { id: 'nom-pl', acceptedForms: [{ value: 'manželé' }, { value: 'manželové', remarks: ['meaning'] }] },
  ],
}

describe('the noun-declension carry-over hook', () => {
  it('copies the remarks of each variant onto the variant of the same value in the same cell, and the noun\'s explanation', () => {
    const { item, warnings } = carryOver(written, scraped())
    expect(item).toEqual(written)
    expect(nounDeclensionContract.validateItem(item)).toEqual([])
    expect(warnings).toEqual([])
  })

  it('keeps what the fresh item says otherwise: its forms, their order and its gender', () => {
    const fresh = scraped({ 'dat-sg': ['manželu', 'manželovi'], 'gen-sg': ['manžela'] }, 'm. živ. (new)')
    const { item } = carryOver(written, fresh)
    expect(item.gender).toBe('m. živ. (new)')
    expect(item.cells.map((cell) => cell.id)).toEqual(['nom-sg', 'dat-sg', 'nom-pl', 'gen-sg'])
    expect(item.cells[1]!.acceptedForms).toEqual([{ value: 'manželu', remarks: ['non-final'] }, { value: 'manželovi' }])
    expect(item.cells[3]!.acceptedForms).toEqual([{ value: 'manžela' }])
  })

  it('matches a variant by its exact value only', () => {
    const { item, warnings } = carryOver(written, scraped({ 'dat-sg': ['manželovi', 'Manželu'] }))
    expect(item.cells[1]!.acceptedForms).toEqual([{ value: 'manželovi' }, { value: 'Manželu' }])
    expect(warnings).toHaveLength(1)
  })

  it('drops a remark whose variant is no longer on the page, and warns naming the cell and the value', () => {
    const { item, warnings } = carryOver(written, scraped({ 'dat-sg': ['manželovi'] }))
    expect(item.cells[1]!.acceptedForms).toEqual([{ value: 'manželovi' }])
    expect(item.cells[2]!.acceptedForms[1]).toEqual({ value: 'manželové', remarks: ['meaning'] })
    expect(warnings).toEqual(['cell dat-sg no longer has the variant "manželu", so its remarks (non-final) were dropped'])
  })

  it('also when the whole cell is gone', () => {
    const { item, warnings } = carryOver(written, scraped({ 'nom-pl': undefined }))
    expect(item.cells.map((cell) => cell.id)).toEqual(['nom-sg', 'dat-sg'])
    expect(warnings).toEqual(['cell nom-pl no longer has the variant "manželové", so its remarks (meaning) were dropped'])
  })

  it('keeps the explanation even when every remark is gone, and leaves it to the contract to refuse the item', () => {
    const { item } = carryOver(written, scraped({ 'dat-sg': ['manželovi'], 'nom-pl': ['manželé'] }))
    expect(item.explanation).toEqual(explanation)
    expect(nounDeclensionContract.validateItem(item)).toContain('the noun has an explanation, but no variant has a remark to open it')
  })

  it('gives back the fresh item unchanged when nothing was written by hand', () => {
    const fresh = scraped()
    const { item, warnings } = carryOver(scraped(), fresh)
    expect(item).toStrictEqual(fresh)
    expect(item).not.toHaveProperty('explanation')
    expect(warnings).toEqual([])
  })

  it('changes neither of the items it is given', () => {
    const fresh = scraped({ 'dat-sg': ['manželovi'] })
    const before = { previous: structuredClone(written), fresh: structuredClone(fresh) }
    carryOver(written, fresh)
    expect({ previous: written, fresh }).toEqual(before)
  })
})

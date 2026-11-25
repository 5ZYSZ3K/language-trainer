import { describe, expect, it } from 'vitest'
import type { Item } from '../../core/cell'
import { UI_LANGUAGES } from '../../i18n'
import { uiTexts } from '../../ui'
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
      { id: 'cells', label: 'meter.cells' },
      { id: 'items', label: 'meter.items' },
    ])
  })

  it('has six neutral cell ids, in display order: singular, then plural', () => {
    expect(verbPresentCellIds).toEqual(['1sg', '2sg', '3sg', '1pl', '2pl', '3pl'])
  })
})

describe('the texts of verbPresentTense', () => {
  const texts = verbPresentTense.texts

  it('names the page, as heading and document title, in both UI languages', () => {
    expect(texts.en.title).toBe('Czech verb trainer')
    expect(texts.cs.title).toBe('Trénink časování českých sloves')
  })

  it('labels every cell id and every meter in each UI language', () => {
    for (const language of UI_LANGUAGES) {
      for (const id of verbPresentCellIds) expect(texts[language][verbPresentCellLabelKeys[id]!], `${language} ${id}`).toBeTruthy()
      for (const meter of verbPresentTense.meters) expect(texts[language][meter.label], `${language} ${meter.id}`).toBeTruthy()
    }
  })

  it('does not reuse a key of the shared type-in texts, which its area is filled in together with', () => {
    for (const language of UI_LANGUAGES) {
      const shared = Object.keys(uiTexts[language])
      expect(Object.keys(texts[language]).filter((key) => shared.includes(key)), language).toEqual([])
    }
  })
})

describe('verbPresentTenseContract', () => {
  const ids = ['1sg', '2sg', '3sg', '1pl', '2pl', '3pl']
  const valid = (): Item => ({ prompt: 'bát se', cells: ids.map((id) => ({ id, acceptedForms: [{ value: `${id} se` }] })) })
  const problems = (value: unknown) => verbPresentTenseContract.validateItem(value)

  it('accepts an item with the six ids in order, each with a variant', () => {
    expect(problems(valid())).toEqual([])
  })

  it('accepts several variants per cell', () => {
    const item = valid()
    item.cells[0]!.acceptedForms = [{ value: 'mohu' }, { value: 'můžu' }]
    expect(problems(item)).toEqual([])
  })

  it('accepts an optional sourceUrl that is text, and an item without one', () => {
    expect(problems({ ...valid(), sourceUrl: 'https://example.test/' })).toEqual([])
    expect('sourceUrl' in valid()).toBe(false)
    expect(problems(valid())).toEqual([])
  })

  it('reports a sourceUrl that is not text', () => {
    expect(problems({ ...valid(), sourceUrl: 42 })).toEqual(['sourceUrl must be text'])
    expect(problems({ ...valid(), sourceUrl: null })).toEqual(['sourceUrl must be text'])
  })

  it('ignores other extra properties', () => {
    expect(problems({ ...valid(), note: 'x' })).toEqual([])
  })

  it('reports a cell without any form as "no form found for <id>"', () => {
    const item = valid()
    item.cells[3]!.acceptedForms = []
    expect(problems(item)).toEqual(['no form found for 1pl'])
  })

  it('reports a variant whose value is blank, even next to one that has a value', () => {
    const item = valid()
    item.cells[1]!.acceptedForms = [{ value: '' }, { value: '  ' }]
    item.cells[2]!.acceptedForms = [{ value: '' }, { value: 'bojí se' }]
    expect(problems(item)).toEqual(['cell 2sg has a variant without a text value', 'cell 3sg has a variant without a text value'])
  })

  it('reports every cell without a form, in cell order', () => {
    const item = valid()
    item.cells[4]!.acceptedForms = []
    item.cells[0]!.acceptedForms = []
    expect(problems(item)).toEqual(['no form found for 1sg', 'no form found for 2pl'])
  })

  it('reports a missing or non-list acceptedForms as no form', () => {
    const item = valid() as unknown as { cells: { id: string; acceptedForms?: unknown }[] }
    delete item.cells[0]!.acceptedForms
    item.cells[3]!.acceptedForms = 'bojíme se'
    expect(problems(item)).toEqual(['no form found for 1sg', 'no form found for 1pl'])
  })

  it('reports a variant that is not an object, such as a bare form (the shape before variants)', () => {
    const item = valid() as unknown as { cells: { id: string; acceptedForms: unknown[] }[] }
    item.cells[0]!.acceptedForms = ['bojím se']
    item.cells[1]!.acceptedForms = [{ value: 'bojíš se' }, null]
    expect(problems(item)).toEqual(['cell 1sg has a variant that is not an object', 'cell 2sg has a variant that is not an object'])
  })

  it('reports a variant whose value is missing or not text', () => {
    const item = valid() as unknown as { cells: { id: string; acceptedForms: unknown[] }[] }
    item.cells[0]!.acceptedForms = [{ value: 42 }]
    item.cells[1]!.acceptedForms = [{ text: 'bojíš se' }]
    expect(problems(item)).toEqual(['cell 1sg has a variant without a text value', 'cell 2sg has a variant without a text value'])
  })

  it('refuses remarks on a variant, even an empty list of them: this quiz type takes none', () => {
    const item = valid()
    item.cells[0]!.acceptedForms = [{ value: 'bojím se', remarks: ['less-commonly-used'] }]
    item.cells[1]!.acceptedForms = [{ value: 'bojíš se', remarks: [] }]
    expect(problems(item)).toEqual([
      'cell 1sg has a variant with remarks, which this quiz type does not take',
      'cell 2sg has a variant with remarks, which this quiz type does not take',
    ])
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
    expect(problems(missing)).toEqual(['cell ids must be 1sg, 2sg, 3sg, 1pl, 2pl, 3pl in that order, found 1sg, 2sg, 3sg, 1pl, 2pl'])

    const swapped = valid()
    swapped.cells.reverse()
    expect(problems(swapped)).toEqual(['cell ids must be 1sg, 2sg, 3sg, 1pl, 2pl, 3pl in that order, found 3pl, 2pl, 1pl, 3sg, 2sg, 1sg'])

    const extra = valid()
    extra.cells.push({ id: '4sg', acceptedForms: [{ value: 'x' }] })
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

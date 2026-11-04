import { describe, expect, it } from 'vitest'
import type { Item } from '../../core/cell'
import { UI_LANGUAGES } from '../../i18n'
import { uiTexts } from '../../ui'
import { nounCaseLabelKey, nounCaseIds, nounDeclensionCellIds, nounNumberLabelKey, nounNumbers, partsOf } from './cells'
import { nounDeclension, nounDeclensionContract } from './index'

describe('nounDeclension', () => {
  it('has the permanent id noun-declension, which names its data file and its scores', () => {
    expect(nounDeclension.id).toBe('noun-declension')
  })

  it('uses its own contract', () => {
    expect(nounDeclension.contract).toBe(nounDeclensionContract)
  })

  it('counts forms and nouns, in that order', () => {
    expect(nounDeclension.meters).toEqual([
      { id: 'cells', label: 'meter.cells' },
      { id: 'items', label: 'meter.items' },
    ])
  })

  it('has fourteen cell ids named after case and number, in display order: the singular cases, then the plural ones', () => {
    expect(nounDeclensionCellIds).toEqual([
      'nom-sg', 'gen-sg', 'dat-sg', 'acc-sg', 'voc-sg', 'loc-sg', 'ins-sg',
      'nom-pl', 'gen-pl', 'dat-pl', 'acc-pl', 'voc-pl', 'loc-pl', 'ins-pl',
    ])
  })

  it('reads the case and the number back out of a cell id, and nothing out of anything else', () => {
    expect(partsOf('gen-pl')).toEqual({ caseId: 'gen', number: 'pl' })
    expect(partsOf('ins-sg')).toEqual({ caseId: 'ins', number: 'sg' })
    for (const id of ['', 'gen', 'gen-', 'gen-dual', 'xxx-sg', 'gen-sg-x', '1sg']) expect(partsOf(id), id).toBeUndefined()
  })
})

describe('the texts of nounDeclension', () => {
  const texts = nounDeclension.texts

  it('names the page, as heading and document title, and its tab, in both UI languages', () => {
    expect(texts.en.title).toBe('Czech noun trainer')
    expect(texts.cs.title).toBe('Trénink skloňování českých podstatných jmen')
    for (const language of UI_LANGUAGES) expect(texts[language].name, language).toBeTruthy()
  })

  it('labels every case, every number and every meter in each UI language', () => {
    for (const language of UI_LANGUAGES) {
      for (const id of nounCaseIds) expect(texts[language][nounCaseLabelKey(id)], `${language} ${id}`).toBeTruthy()
      for (const number of nounNumbers) expect(texts[language][nounNumberLabelKey(number)], `${language} ${number}`).toBeTruthy()
      for (const meter of nounDeclension.meters) expect(texts[language][meter.label], `${language} ${meter.id}`).toBeTruthy()
    }
  })

  it('numbers the Czech cases the way Czech does, with the vocative fifth', () => {
    expect(texts.cs['case.nom']).toMatch(/^1\. /)
    expect(texts.cs['case.voc']).toMatch(/^5\. /)
    expect(texts.cs['case.ins']).toMatch(/^7\. /)
    expect(texts.en['case.voc']).toMatch(/^5\. /)
  })

  it('does not reuse a key of the shared type-in texts, which its area is filled in together with', () => {
    for (const language of UI_LANGUAGES) {
      const shared = Object.keys(uiTexts[language])
      expect(Object.keys(texts[language]).filter((key) => shared.includes(key)), language).toEqual([])
    }
  })
})

describe('nounDeclensionContract', () => {
  const cellsFor = (ids: readonly string[]) => ids.map((id) => ({ id, acceptedForms: [`${id} form`] }))
  const valid = (): Item => ({ prompt: 'pán', cells: cellsFor(nounDeclensionCellIds) })
  const problems = (value: unknown) => nounDeclensionContract.validateItem(value)

  it('accepts an item with all fourteen cells, in order, each with a form', () => {
    expect(problems(valid())).toEqual([])
  })

  it('accepts a noun with only some cells: no plural, or no singular', () => {
    expect(problems({ prompt: 'zdraví', cells: cellsFor(['nom-sg', 'gen-sg', 'dat-sg']) })).toEqual([])
    expect(problems({ prompt: 'dveře', cells: cellsFor(['nom-pl', 'gen-pl']) })).toEqual([])
  })

  it('accepts several forms per cell', () => {
    const item = valid()
    item.cells[2]!.acceptedForms = ['pánovi', 'pánu']
    expect(problems(item)).toEqual([])
  })

  it('accepts an optional sourceUrl that is text, and reports one that is not', () => {
    expect(problems({ ...valid(), sourceUrl: 'https://example.test/' })).toEqual([])
    expect(problems({ ...valid(), sourceUrl: 42 })).toEqual(['sourceUrl must be text'])
  })

  it('ignores other extra properties', () => {
    expect(problems({ ...valid(), note: 'x' })).toEqual([])
  })

  it('reports a value that is not an object, a missing or blank prompt, and cells that are not a list', () => {
    expect(problems(null)).toEqual(['item must be an object'])
    expect(problems('pán')).toEqual(['item must be an object'])
    expect(problems({ ...valid(), prompt: '  ' })).toEqual(['missing prompt'])
    expect(problems({ ...valid(), prompt: undefined })).toEqual(['missing prompt'])
    expect(problems({ prompt: 'pán', cells: 'x' })).toEqual(['cells must be a list'])
    expect(problems({ prompt: 'pán', cells: [] })).toEqual(['no cells'])
  })

  it('reports a cell id it does not know, such as a verb cell', () => {
    const [problem] = problems({ prompt: 'pán', cells: cellsFor(['nom-sg', '2sg']) })
    expect(problem).toContain('cell ids must be among')
    expect(problem).toContain('found nom-sg, 2sg')
  })

  it('reports cells out of order or repeated', () => {
    expect(problems({ prompt: 'pán', cells: cellsFor(['nom-sg', 'dat-sg', 'gen-sg']) })[0]).toContain('without repeats')
    expect(problems({ prompt: 'pán', cells: cellsFor(['nom-sg', 'gen-sg', 'gen-sg']) })[0]).toContain('without repeats')
    expect(problems({ prompt: 'pán', cells: cellsFor(['nom-pl', 'nom-sg']) })[0]).toContain('without repeats')
  })

  it('wants the first cell to be the nominative singular, or the nominative plural when there is no singular', () => {
    expect(problems({ prompt: 'pán', cells: cellsFor(['gen-sg', 'dat-sg']) })).toEqual([
      'the first cell must be nom-sg, the form the learner is given, found gen-sg',
    ])
    expect(problems({ prompt: 'dveře', cells: cellsFor(['gen-pl', 'dat-pl']) })).toEqual([
      'the first cell must be nom-pl, the form the learner is given, found gen-pl',
    ])
    expect(problems({ prompt: 'pán', cells: cellsFor(['nom-pl', 'gen-pl']) })).toEqual([])
    // A noun with some singular cells but no nominative singular is a broken page, not a noun without a singular.
    expect(problems({ prompt: 'pán', cells: cellsFor(['gen-sg', 'nom-pl']) })[0]).toContain('found gen-sg')
  })

  it('wants at least one cell besides the given one, or there is nothing to ask', () => {
    expect(problems({ prompt: 'pán', cells: cellsFor(['nom-sg']) })).toEqual(['needs at least one form besides the given one'])
  })

  it('reports a cell without a form, or with a form that is not text', () => {
    const empty = valid()
    empty.cells[3]!.acceptedForms = ['  ']
    expect(problems(empty)).toEqual(['no form found for acc-sg'])
    const missing = valid() as unknown as { cells: Record<string, unknown>[] }
    delete missing.cells[1]!.acceptedForms
    expect(problems(missing)).toEqual(['no form found for gen-sg'])
    const notText = valid() as unknown as { cells: Record<string, unknown>[] }
    notText.cells[1]!.acceptedForms = ['pána', 7]
    expect(problems(notText)).toEqual(['cell gen-sg has a form that is not text'])
  })

  it('identifies an item by its prompt', () => {
    expect(nounDeclensionContract.keyOf(valid())).toBe('pán')
  })
})

import { describe, expect, it } from 'vitest'
import type { Item } from '../../core/cell'
import { UI_LANGUAGES } from '../../i18n'
import { uiTexts } from '../../ui'
import { nounCaseLabelKey, nounCaseIds, nounDeclensionCellIds, nounNumberLabelKey, nounNumbers, partsOf } from './cells'
import { NOUN_REMARK_CODES, nounDeclension, nounDeclensionContract } from './index'

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

  it('names the page, as heading and document title, and in the selector, in both UI languages', () => {
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

  it('labels every remark code in each UI language, and explains dual and non-final but not meaning', () => {
    for (const language of UI_LANGUAGES) {
      const own: Record<string, string | undefined> = texts[language]
      for (const code of NOUN_REMARK_CODES) expect(own[`remark.${code}`], `${language} ${code}`).toBeTruthy()
      expect(own['remark-explanation.dual'], language).toBeTruthy()
      expect(own['remark-explanation.non-final'], language).toBeTruthy()
      expect(own['remark-explanation.meaning'], language).toBeUndefined()
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
  const cellsFor = (ids: readonly string[]) => ids.map((id) => ({ id, acceptedForms: [{ value: `${id} form` }] }))
  const valid = (): Item => ({ prompt: 'pán', cells: cellsFor(nounDeclensionCellIds) })
  const problems = (value: unknown) => nounDeclensionContract.validateItem(value)

  it('accepts an item with all fourteen cells, in order, each with a variant', () => {
    expect(problems(valid())).toEqual([])
  })

  it('accepts a noun with only some cells: no plural, or no singular', () => {
    expect(problems({ prompt: 'zdraví', cells: cellsFor(['nom-sg', 'gen-sg', 'dat-sg']) })).toEqual([])
    expect(problems({ prompt: 'dveře', cells: cellsFor(['nom-pl', 'gen-pl']) })).toEqual([])
  })

  it('accepts several variants per cell', () => {
    const item = valid()
    item.cells[2]!.acceptedForms = [{ value: 'pánovi' }, { value: 'pánu' }]
    expect(problems(item)).toEqual([])
  })

  it('accepts an optional sourceUrl that is text, and reports one that is not', () => {
    expect(problems({ ...valid(), sourceUrl: 'https://example.test/' })).toEqual([])
    expect(problems({ ...valid(), sourceUrl: 42 })).toEqual(['sourceUrl must be text'])
  })

  it('accepts an optional gender that is text, and also an item without one (nouns scraped before it was kept)', () => {
    expect(problems({ ...valid(), gender: 'm. živ.' })).toEqual([])
    expect(problems(valid())).toEqual([])
    expect(problems({ ...valid(), gender: 42 })).toEqual(['gender must be text'])
    expect(problems({ ...valid(), gender: ' ' })).toEqual(['gender must be text'])
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

  it('reports a cell without a variant', () => {
    const empty = valid()
    empty.cells[3]!.acceptedForms = []
    expect(problems(empty)).toEqual(['no form found for acc-sg'])
    const missing = valid() as unknown as { cells: Record<string, unknown>[] }
    delete missing.cells[1]!.acceptedForms
    expect(problems(missing)).toEqual(['no form found for gen-sg'])
  })

  it('reports a variant that is not an object, such as a bare form (the shape before variants)', () => {
    const item = valid() as unknown as { cells: Record<string, unknown>[] }
    item.cells[1]!.acceptedForms = ['pána']
    expect(problems(item)).toEqual(['cell gen-sg has a variant that is not an object'])
  })

  it('reports a variant whose value is missing, not text or blank, even next to one that has a value', () => {
    const item = valid() as unknown as { cells: Record<string, unknown>[] }
    item.cells[1]!.acceptedForms = [{ value: 'pána' }, { value: 7 }]
    item.cells[2]!.acceptedForms = [{}]
    item.cells[3]!.acceptedForms = [{ value: '  ' }, { value: 'pána' }]
    expect(problems(item)).toEqual([
      'cell gen-sg has a variant without a text value',
      'cell dat-sg has a variant without a text value',
      'cell acc-sg has a variant without a text value',
    ])
  })

  describe('remarks and the explanation', () => {
    // Test data only: the real dataset is tagged by hand, by the owner.
    const explanation = { en: '<em>manželové</em> are married men, <em>manželé</em> couples.', cs: '<em>manželové</em> jsou ženatí muži, <em>manželé</em> páry.' }
    const withVariants = (cellIndex: number, acceptedForms: { value: string; remarks?: string[] }[]) => {
      const item = valid()
      item.cells[cellIndex]!.acceptedForms = acceptedForms
      return item
    }
    const nomPl = 7
    const insPl = 13
    const givenRefused = (id: string) =>
      `cell ${id} is the given cell: the page shows only its first value and never an answer line there, so a remark on it could never be shown`

    it('accepts remarks from NOUN_REMARK_CODES, on a noun with or without its own explanation', () => {
      expect(NOUN_REMARK_CODES).toEqual(['dual', 'non-final', 'meaning'])
      const dual = withVariants(insPl, [{ value: 'nohami' }, { value: 'nohama', remarks: ['dual'] }])
      expect(problems(dual)).toEqual([])
      expect(problems({ ...dual, explanation })).toEqual([])
      const nonFinal = withVariants(2, [{ value: 'advokátovi' }, { value: 'advokátu', remarks: ['non-final'] }])
      expect(problems(nonFinal)).toEqual([])
      const meaning = withVariants(nomPl, [{ value: 'manželé' }, { value: 'manželové', remarks: ['meaning'] }])
      expect(problems({ ...meaning, explanation })).toEqual([])
      const both = withVariants(nomPl, [{ value: 'manželé' }, { value: 'manželové', remarks: ['meaning', 'dual'] }])
      expect(problems({ ...both, explanation })).toEqual([])
    })

    it('reports a code that is not in NOUN_REMARK_CODES, such as a numerals one, with or without a part', () => {
      const known = '(known: dual, non-final, meaning)'
      const numerals = withVariants(2, [{ value: 'pánovi' }, { value: 'pánu', remarks: ['less-commonly-used'] }])
      expect(problems(numerals)).toEqual([`cell dat-sg has a variant with the unknown remark less-commonly-used ${known}`])
      const withPart = withVariants(insPl, [{ value: 'nohama', remarks: ['noha:dual'] }])
      expect(problems(withPart)).toEqual([`cell ins-pl has a variant with the unknown remark noha:dual ${known}`])
    })

    it.each([
      ['a bare code', 'dual'],
      ['a list holding something other than text', ['dual', 7]],
      ['null', null],
    ])('reports remarks that are not a list of codes: %s', (_case, remarks) => {
      expect(problems(withVariants(insPl, [{ value: 'nohama', remarks: remarks as string[] }]))).toEqual([
        'cell ins-pl has a variant whose remarks are not a list of codes',
      ])
    })

    it('reports remarks that are not a non-empty list of codes, each once', () => {
      expect(problems(withVariants(insPl, [{ value: 'nohama', remarks: [] }]))).toEqual([
        'cell ins-pl has a variant with an empty list of remarks',
      ])
      expect(problems(withVariants(insPl, [{ value: 'nohama', remarks: ['dual', 'dual'] }]))).toEqual([
        'cell ins-pl has a variant with the remark dual twice',
      ])
    })

    it('reports every variant whose remarks have a problem, in order, at most once each', () => {
      const item = withVariants(insPl, [{ value: 'a', remarks: [] }, { value: 'b' }, { value: 'c', remarks: ['x', 'x'] }])
      expect(problems(item)).toEqual([
        'cell ins-pl has a variant with an empty list of remarks',
        'cell ins-pl has a variant with the unknown remark x (known: dual, non-final, meaning)',
      ])
    })

    it('reports a meaning remark on a noun without an explanation: only the noun can say which meaning is which', () => {
      const meaning = withVariants(nomPl, [{ value: 'manželé' }, { value: 'manželové', remarks: ['meaning'] }])
      expect(problems(meaning)).toEqual([
        "cell nom-pl has the remark meaning, which only the noun's own explanation explains, but the noun has no explanation",
      ])
    })

    it('reports an explanation on a noun with no remark on any variant, because nothing could open it', () => {
      expect(problems({ ...valid(), explanation })).toEqual(['the noun has an explanation, but no variant has a remark to open it'])
    })

    it('refuses a remark on the given cell, which the page shows only by its first value and without an answer line', () => {
      const given = withVariants(0, [{ value: 'pán' }, { value: 'pan', remarks: ['non-final'] }])
      expect(problems(given)).toEqual([givenRefused('nom-sg')])
      const first = withVariants(0, [{ value: 'pán', remarks: ['dual'] }])
      expect(problems(first)).toEqual([givenRefused('nom-sg')])
      const pluralOnly = { prompt: 'dveře', cells: [{ id: 'nom-pl', acceptedForms: [{ value: 'dveře', remarks: ['dual'] }] }, ...cellsFor(['gen-pl'])] }
      expect(problems(pluralOnly)).toEqual([givenRefused('nom-pl')])
    })

    it("does not count a remark on the given cell as one that opens the noun's explanation, nor as one that needs it", () => {
      const refused = givenRefused('nom-sg')
      const opener = withVariants(0, [{ value: 'manžel' }, { value: 'manžel', remarks: ['meaning'] }])
      expect(problems({ ...opener, explanation })).toEqual([refused, 'the noun has an explanation, but no variant has a remark to open it'])
      expect(problems(opener)).toEqual([refused])
      // Nothing in the given cell could open it, read or not.
      const unreadGiven = withVariants(0, [{ value: 7 as unknown as string, remarks: ['meaning'] }])
      expect(problems({ ...unreadGiven, explanation })).toEqual([
        'cell nom-sg has a variant without a text value',
        'the noun has an explanation, but no variant has a remark to open it',
      ])
    })

    it.each([
      ['remarks that are not a list of codes', [{ value: 'nohama', remarks: 'dual' }], 'cell ins-pl has a variant whose remarks are not a list of codes'],
      ['an empty list of remarks', [{ value: 'nohama', remarks: [] }], 'cell ins-pl has a variant with an empty list of remarks'],
      ['an unknown code', [{ value: 'nohama', remarks: ['duál'] }], 'cell ins-pl has a variant with the unknown remark duál (known: dual, non-final, meaning)'],
      ['a variant without a text value', [{ value: 7, remarks: ['dual'] }], 'cell ins-pl has a variant without a text value'],
    ])('reports only the real problem when the remarks of an explained noun cannot be read: %s', (_case, acceptedForms, problem) => {
      const item = withVariants(insPl, acceptedForms as { value: string; remarks?: string[] }[])
      expect(problems({ ...item, explanation })).toEqual([problem])
    })

    it('reports an explanation that is not an object of texts', () => {
      const dual = withVariants(insPl, [{ value: 'nohami' }, { value: 'nohama', remarks: ['dual'] }])
      for (const bad of ['text', null, ['en', 'cs']]) {
        expect(problems({ ...dual, explanation: bad }), String(bad)).toEqual(['explanation must be an object with a text per UI language (en, cs)'])
      }
    })

    it('reports an explanation without both en and cs, or with an empty one', () => {
      const dual = withVariants(insPl, [{ value: 'nohami' }, { value: 'nohama', remarks: ['dual'] }])
      expect(problems({ ...dual, explanation: { en: explanation.en } })).toEqual(['explanation has no cs text'])
      expect(problems({ ...dual, explanation: { cs: explanation.cs } })).toEqual(['explanation has no en text'])
      expect(problems({ ...dual, explanation: { en: ' ', cs: explanation.cs } })).toEqual(['explanation has no en text'])
      expect(problems({ ...dual, explanation: { en: explanation.en, cs: 7 } })).toEqual(['explanation has no cs text'])
      expect(problems({ ...dual, explanation: {} })).toEqual(['explanation has no en text', 'explanation has no cs text'])
    })
  })

  it('identifies an item by its prompt', () => {
    expect(nounDeclensionContract.keyOf(valid())).toBe('pán')
  })
})

import { describe, expect, it } from 'vitest'
import { dítě } from '../demonstrative-noun-declension/test-support'
import { GOVERNING_CASE_CELL_IDS, nounCell } from './sentence-items'

describe('the noun of a sentence quiz', () => {
  it('may have, in a quiz without the vocative, the cells of every case but the vocative, in the noun quiz’s order', () => {
    expect(GOVERNING_CASE_CELL_IDS).toEqual([
      'nom-sg',
      'gen-sg',
      'dat-sg',
      'acc-sg',
      'loc-sg',
      'ins-sg',
      'nom-pl',
      'gen-pl',
      'dat-pl',
      'acc-pl',
      'loc-pl',
      'ins-pl',
    ])
  })

  it('gives its cell of a case and a number', () => {
    expect(nounCell(dítě, 'dat', 'pl')).toEqual({ id: 'dat-pl', acceptedForms: [{ value: 'dětem' }] })
    expect(nounCell(dítě, 'nom', 'sg')).toEqual({ id: 'nom-sg', acceptedForms: [{ value: 'dítě' }] })
  })
})

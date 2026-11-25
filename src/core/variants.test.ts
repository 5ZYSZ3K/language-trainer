import { describe, expect, it } from 'vitest'
import { checkVariants } from './variants'

describe('checkVariants', () => {
  it('gives back the variants when each is an object with a non-empty text value, other properties untouched', () => {
    const variants = [{ value: 'pánovi' }, { value: 'pánu', remarks: ['non-final'], note: 'x' }]
    expect(checkVariants('dat-sg', variants)).toEqual({ variants })
  })

  it.each([
    ['an empty list', []],
    ['no list at all', undefined],
    ['a bare form instead of a list', 'pánu'],
  ])('finds no form in %s', (_case, acceptedForms) => {
    expect(checkVariants('dat-sg', acceptedForms)).toEqual({ problem: 'no form found for dat-sg' })
  })

  it.each([
    ['a bare form (the shape before variants)', ['pánu']],
    ['null next to a good variant', [{ value: 'pánovi' }, null]],
    ['a list', [[{ value: 'pánu' }]]],
  ])('refuses a variant that is not an object: %s', (_case, acceptedForms) => {
    const problem = 'cell dat-sg has a variant that is not an object'
    expect(checkVariants('dat-sg', acceptedForms)).toEqual({ problem })
  })

  it.each([
    ['missing', [{ text: 'pánu' }]],
    ['not text', [{ value: 42 }]],
    ['blank, next to a good variant', [{ value: 'pánovi' }, { value: '  ' }]],
  ])('refuses a variant whose value is %s', (_case, acceptedForms) => {
    const problem = 'cell dat-sg has a variant without a text value'
    expect(checkVariants('dat-sg', acceptedForms)).toEqual({ problem })
  })
})

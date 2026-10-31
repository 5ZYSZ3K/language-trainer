import { describe, expect, it } from 'vitest'
import { isCorrect } from './matching'

describe('isCorrect', () => {
  it('accepts an exact form and rejects a different word', () => {
    expect(isCorrect('bavím', ['bavím'])).toBe(true)
    expect(isCorrect('bavíš', ['bavím'])).toBe(false)
  })

  it('ignores case, surrounding whitespace and repeated inner whitespace', () => {
    expect(isCorrect('  Bojím   SE ', ['bojím se'])).toBe(true)
  })

  it('treats a missing or extra space as a mistake', () => {
    expect(isCorrect('bojímse', ['bojím se'])).toBe(false)
  })

  it('is strict about diacritics', () => {
    expect(isCorrect('bavim', ['bavím'])).toBe(false)
    expect(isCorrect('muzu', ['můžu'])).toBe(false)
  })

  it('accepts any listed variant', () => {
    expect(isCorrect('můžu', ['mohu', 'můžu'])).toBe(true)
    expect(isCorrect('mohu', ['mohu', 'můžu'])).toBe(true)
  })

  it('does not tell a precomposed letter from the same letter typed as base + combining mark', () => {
    expect(isCorrect('bavím', ['bavím'])).toBe(true)
  })
})

import { describe, expect, it } from 'vitest'
import type { Item } from './cell'
import { findByPrompt, isCorrect, matchesSomeVariant } from './matching'

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

  it('accepts any of the forms it is given', () => {
    expect(isCorrect('můžu', ['mohu', 'můžu'])).toBe(true)
    expect(isCorrect('mohu', ['mohu', 'můžu'])).toBe(true)
  })

  it('does not tell a precomposed letter from the same letter typed as base + combining mark', () => {
    expect(isCorrect('bavím', ['bavím'])).toBe(true)
  })
})

describe('matchesSomeVariant', () => {
  const variants = [{ value: 'mohu' }, { value: 'můžu' }]

  it('accepts the value of any variant of a cell, and nothing else', () => {
    expect(matchesSomeVariant('můžu', variants)).toBe(true)
    expect(matchesSomeVariant('mohu', variants)).toBe(true)
    expect(matchesSomeVariant('může', variants)).toBe(false)
  })

  it('applies the matching rules to each value: case and whitespace forgiven, diacritics not', () => {
    expect(matchesSomeVariant('  MŮŽU ', variants)).toBe(true)
    expect(matchesSomeVariant('muzu', variants)).toBe(false)
  })

  it('goes by the value alone, whatever remarks a variant has', () => {
    expect(matchesSomeVariant('pánu', [{ value: 'pánovi' }, { value: 'pánu', remarks: ['less-commonly-used'] }])).toBe(true)
  })

  it('accepts nothing for a cell without variants', () => {
    expect(matchesSomeVariant('', [])).toBe(false)
  })
})

describe('findByPrompt', () => {
  const item = (prompt: string): Item => ({ prompt, cells: [] })
  const items = [item('mýt'), item('mýt se'), item('Čech'), item('dveře')]

  it('finds the item whose prompt is typed', () => {
    expect(findByPrompt(items, 'mýt')).toBe(items[0])
    expect(findByPrompt(items, 'dveře')).toBe(items[3])
  })

  it('takes the reflexive particle as part of the prompt', () => {
    expect(findByPrompt(items, 'mýt se')).toBe(items[1])
    expect(findByPrompt([item('bát se')], 'bát')).toBeUndefined()
  })

  it('forgives case and whitespace, as answers are', () => {
    expect(findByPrompt(items, 'čech')).toBe(items[2])
    expect(findByPrompt(items, '  mýt   SE ')).toBe(items[1])
  })

  it('is strict about diacritics and finds nothing for an empty or unknown word', () => {
    expect(findByPrompt(items, 'myt')).toBeUndefined()
    expect(findByPrompt(items, 'dvere')).toBeUndefined()
    expect(findByPrompt(items, '   ')).toBeUndefined()
    expect(findByPrompt(items, 'pán')).toBeUndefined()
  })
})

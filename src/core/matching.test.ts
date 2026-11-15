import { describe, expect, it } from 'vitest'
import type { Item } from './cell'
import { findByPrompt, isCorrect } from './matching'

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

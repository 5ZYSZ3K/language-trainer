import { describe, expect, it } from 'vitest'
import { applyShortcut } from './shortcuts'

describe('applyShortcut', () => {
  it("turns ' after a vowel into an acute", () => {
    expect(applyShortcut("ba'", 3)).toEqual({ value: 'bá', caret: 2 })
    expect(
      ['a', 'e', 'i', 'o', 'u', 'y'].map((v) => applyShortcut(`${v}'`, 2).value),
    ).toEqual(['á', 'é', 'í', 'ó', 'ú', 'ý'])
  })

  it('turns ^ after c d e n r s t z into a háček', () => {
    expect(applyShortcut('c^', 2)).toEqual({ value: 'č', caret: 1 })
    expect(
      ['c', 'd', 'e', 'n', 'r', 's', 't', 'z'].map((v) => applyShortcut(`${v}^`, 2).value),
    ).toEqual(['č', 'ď', 'ě', 'ň', 'ř', 'š', 'ť', 'ž'])
  })

  it('turns @ after u into ů', () => {
    expect(applyShortcut('u@', 2)).toEqual({ value: 'ů', caret: 1 })
  })

  it('keeps the case of the letter', () => {
    expect(applyShortcut("A'", 2).value).toBe('Á')
    expect(applyShortcut('R^', 2).value).toBe('Ř')
    expect(applyShortcut('U@', 2).value).toBe('Ů')
  })

  it('leaves the typed character alone when no shortcut applies', () => {
    expect(applyShortcut("b'", 2)).toEqual({ value: "b'", caret: 2 })
    expect(applyShortcut('a^', 2)).toEqual({ value: 'a^', caret: 2 })
    expect(applyShortcut('a@', 2)).toEqual({ value: 'a@', caret: 2 })
    expect(applyShortcut("'", 1)).toEqual({ value: "'", caret: 1 })
    expect(applyShortcut('á\'', 2)).toEqual({ value: "á'", caret: 2 })
  })

  it('works in the middle of the text and puts the caret after the new letter', () => {
    expect(applyShortcut("ba'vim", 3)).toEqual({ value: 'bávim', caret: 2 })
  })
})

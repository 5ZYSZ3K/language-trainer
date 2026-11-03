import { describe, expect, it } from 'vitest'
import { applyShortcut } from '../core/shortcuts'
import { cs } from './cs'

describe('Czech', () => {
  it('is the language cs, written with the html lang cs', () => {
    expect(cs.id).toBe('cs')
    expect(cs.htmlLang).toBe('cs')
  })

  it('offers the special characters of the on-screen buttons, in display order', () => {
    expect(cs.specialChars.join('')).toBe('áéíóúýčďěňřšťžů')
  })

  it("turns ' after a vowel into an acute, ^ after a letter into a háček and @ after u into ů", () => {
    const typed = (text: string) => applyShortcut(text, text.length, cs.shortcuts).value
    expect(['a', 'e', 'i', 'o', 'u', 'y'].map((v) => typed(`${v}'`))).toEqual(['á', 'é', 'í', 'ó', 'ú', 'ý'])
    expect(['c', 'd', 'e', 'n', 'r', 's', 't', 'z'].map((v) => typed(`${v}^`))).toEqual(['č', 'ď', 'ě', 'ň', 'ř', 'š', 'ť', 'ž'])
    expect(typed('u@')).toBe('ů')
    expect(typed("A'")).toBe('Á')
    expect(typed('R^')).toBe('Ř')
    expect(typed('U@')).toBe('Ů')
  })

  it('does not turn other pairs into letters', () => {
    const typed = (text: string) => applyShortcut(text, text.length, cs.shortcuts).value
    expect([typed("b'"), typed('a^'), typed('a@')]).toEqual(["b'", 'a^', 'a@'])
  })

  it('names itself in both UI languages and lists the three shortcuts in each', () => {
    expect(cs.texts.en.name).toBe('Czech')
    expect(cs.texts.cs.name).toBe('čeština')
    expect(cs.texts.en.shortcutHelp).toEqual([
      "' after a vowel gives an acute: á é í ó ú ý",
      '^ after a letter gives a háček: č ď ě ň ř š ť ž',
      'u@ gives ů',
    ])
    expect(cs.texts.cs.shortcutHelp).toEqual([
      "' po samohlásce dá čárku: á é í ó ú ý",
      '^ po písmenu dá háček: č ď ě ň ř š ť ž',
      'u@ dá ů',
    ])
  })
})

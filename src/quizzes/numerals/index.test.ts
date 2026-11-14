import { describe, expect, it } from 'vitest'
import { UI_LANGUAGES } from '../../i18n'
import { SOURCES } from '../../sources'
import { uiTexts } from '../../ui'
import { NUMERAL_GENERATORS, numberRangeContract, numerals } from './index'
import { REMARK_CODES } from './versions'

describe('numerals', () => {
  it('has the permanent id numerals, which names its data file and its scores', () => {
    expect(numerals.id).toBe('numerals')
  })

  it('uses the range contract', () => {
    expect(numerals.contract).toBe(numberRangeContract)
  })

  it('counts numbers', () => {
    expect(numerals.meters).toEqual([{ id: 'numbers', label: 'meter.numbers' }])
  })

  it('has a numeral generator for the language of every pool a source provides', () => {
    for (const source of SOURCES) {
      for (const { language, quizType } of source.provides) {
        if (quizType === numerals.id) expect(NUMERAL_GENERATORS[language], `${source.id} ${language}`).toBeTypeOf('function')
      }
    }
  })
})

describe('the texts of numerals', () => {
  const texts = numerals.texts

  it('names the page, as heading and document title, in both UI languages', () => {
    expect(texts.en.title).toBe('Czech numeral trainer')
    expect(texts.cs.title).toBe('Trénink českých číslovek')
  })

  it('labels and explains every remark code in each UI language', () => {
    for (const language of UI_LANGUAGES) {
      for (const code of REMARK_CODES) {
        expect(texts[language][`remark.${code}`], `${language} remark.${code}`).toBeTruthy()
        expect(texts[language][`legend.${code}`], `${language} legend.${code}`).toBeTruthy()
      }
    }
  })

  it('does not reuse a key of the shared type-in texts, which its area is filled in together with', () => {
    for (const language of UI_LANGUAGES) {
      const shared = Object.keys(uiTexts[language])
      expect(Object.keys(texts[language]).filter((key) => shared.includes(key)), language).toEqual([])
    }
  })
})

import { describe, expect, it } from 'vitest'
import { UI_LANGUAGES } from '../../i18n'
import { SOURCES } from '../../sources'
import { uiTexts } from '../../ui'
import { nounCaseIds, nounCaseLabelKey, nounNumbers } from '../noun-declension/cells'
import { nounDeclension } from '../noun-declension/index'
import { ADJECTIVE_DECLENSION_GENERATORS, adjectiveNounContract, adjectiveNounDeclension, caseLabelKey, formText, numberLabelKey } from './index'

describe('adjectiveNounDeclension', () => {
  it('has the permanent id adjective-noun-declension, which names its data file and its scores', () => {
    expect(adjectiveNounDeclension.id).toBe('adjective-noun-declension')
  })

  it('uses its own contract', () => {
    expect(adjectiveNounDeclension.contract).toBe(adjectiveNounContract)
  })

  it('counts adjective forms, noun forms and sentences, in that order', () => {
    expect(adjectiveNounDeclension.meters).toEqual([
      { id: 'adjectives', label: 'meter.adjectives' },
      { id: 'nouns', label: 'meter.nouns' },
      { id: 'sentences', label: 'meter.sentences' },
    ])
  })

  it('has an adjective declension generator for the language of every pool a source provides', () => {
    const provided = SOURCES.flatMap((source) => source.provides.filter(({ quizType }) => quizType === adjectiveNounDeclension.id))
    expect(provided.length).toBeGreaterThan(0)
    for (const { language } of provided) expect(ADJECTIVE_DECLENSION_GENERATORS[language], language).toBeDefined()
  })

  it('is provided for Czech by the site’s own rules, which are unverified, by hand: no adapter makes it', () => {
    const [source, ...others] = SOURCES.filter((candidate) => candidate.provides.some(({ quizType }) => quizType === adjectiveNounDeclension.id))
    expect(others).toEqual([])
    expect(source).toMatchObject({ id: 'language-trainer', trust: 'unverified' })
    expect(source!.provides.find(({ quizType }) => quizType === adjectiveNounDeclension.id)).toEqual({
      language: 'cs',
      quizType: 'adjective-noun-declension',
      delivery: { kind: 'bundled' },
      manual: true,
    })
  })
})

describe('the texts of adjectiveNounDeclension', () => {
  const texts = adjectiveNounDeclension.texts

  it('names the quiz in the selector in both UI languages', () => {
    expect(texts.en.name).toBe('Adjectives with nouns')
    expect(texts.cs.name).toBe('Přídavná jména s podstatnými jmény')
  })

  it('labels every case and every number in each UI language', () => {
    for (const language of UI_LANGUAGES) {
      for (const id of nounCaseIds) expect(texts[language][caseLabelKey(id)], `${language} ${id}`).toBeTruthy()
      for (const number of nounNumbers) expect(texts[language][numberLabelKey(number)], `${language} ${number}`).toBeTruthy()
    }
  })

  it('names every case as the noun quiz does, numbered the way Czech does, in each UI language', () => {
    for (const language of UI_LANGUAGES) {
      for (const id of nounCaseIds) {
        expect(texts[language][caseLabelKey(id)], `${language} ${id}`).toBe(nounDeclension.texts[language][nounCaseLabelKey(id)])
      }
    }
  })

  it('words the case and number of a sentence, e.g. 3. dative, singular, from the two labels', () => {
    for (const language of UI_LANGUAGES) {
      expect(texts[language].form, language).toContain('{case}')
      expect(texts[language].form, language).toContain('{number}')
    }
    expect(formText((key) => texts.en[key]!, 'dat', 'sg')).toBe('3. dative, singular')
    expect(formText((key) => texts.cs[key]!, 'ins', 'pl')).toBe('7. pád – instrumentál, množné číslo')
  })

  it('does not reuse a key of the shared type-in texts, which its area is filled in together with', () => {
    for (const language of UI_LANGUAGES) {
      const shared = Object.keys(uiTexts[language])
      expect(Object.keys(texts[language]).filter((key) => shared.includes(key)), language).toEqual([])
    }
  })
})

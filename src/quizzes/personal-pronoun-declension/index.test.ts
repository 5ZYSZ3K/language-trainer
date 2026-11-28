import { describe, expect, it } from 'vitest'
import { UI_LANGUAGES } from '../../i18n'
import { SOURCES } from '../../sources'
import { uiTexts } from '../../ui'
import { caseLabelKey, formText } from '../adjective-noun-declension/sentence-texts'
import { nounCaseLabelKey } from '../noun-declension/cells'
import { nounDeclension } from '../noun-declension/index'
import { QUIZ_TYPES } from '../index'
import { PERSONAL_PRONOUN_TABLES, PRONOUN_REMARKS, personalPronounContract, personalPronounDeclension } from './index'
import { remarkLabelKey } from './texts'

describe('personalPronounDeclension', () => {
  it('has the permanent id personal-pronoun-declension, which names its data file and its scores', () => {
    expect(personalPronounDeclension.id).toBe('personal-pronoun-declension')
  })

  it('is a registered quiz type, with its own contract', () => {
    expect(QUIZ_TYPES).toContain(personalPronounDeclension)
    expect(personalPronounDeclension.contract).toBe(personalPronounContract)
  })

  it('has one meter, the pronouns correct', () => {
    expect(personalPronounDeclension.meters).toEqual([{ id: 'pronouns', label: 'meter.pronouns' }])
  })

  it('has a personal pronoun table for the language of every pool a source provides', () => {
    const provided = SOURCES.flatMap((source) => source.provides.filter(({ quizType }) => quizType === personalPronounDeclension.id))
    expect(provided.length).toBeGreaterThan(0)
    for (const { language } of provided) expect(PERSONAL_PRONOUN_TABLES[language], language).toBeDefined()
  })

  it('is provided for Czech by the site’s own rules, which are unverified, by hand: no adapter makes it', () => {
    const [source, ...others] = SOURCES.filter((candidate) => candidate.provides.some(({ quizType }) => quizType === personalPronounDeclension.id))
    expect(others).toEqual([])
    expect(source).toMatchObject({ id: 'language-trainer', trust: 'unverified' })
    expect(source!.provides.find(({ quizType }) => quizType === personalPronounDeclension.id)).toEqual({
      language: 'cs',
      quizType: 'personal-pronoun-declension',
      delivery: { kind: 'bundled' },
      manual: true,
    })
  })
})

describe('the texts of personalPronounDeclension', () => {
  const texts = personalPronounDeclension.texts

  it('names the quiz in the selector in both UI languages', () => {
    expect(texts.en.name).toBe('Personal pronouns')
    expect(texts.cs.name).toBe('Osobní zájmena')
  })

  it('labels the chip of each remark', () => {
    expect(PRONOUN_REMARKS.map((code) => texts.en[remarkLabelKey(code)])).toEqual(['less common', 'unstressed', 'IJP: animate only'])
    expect(PRONOUN_REMARKS.map((code) => texts.cs[remarkLabelKey(code)])).toEqual(['méně časté', 'nepřízvučné', 'IJP: jen životné'])
  })

  it('names every case it offers as the noun quiz does, numbered the way Czech does, and has no vocative', () => {
    for (const language of UI_LANGUAGES) {
      for (const id of ['nom', 'gen', 'dat', 'acc', 'loc', 'ins'] as const) {
        expect(texts[language][caseLabelKey(id)], `${language} ${id}`).toBe(nounDeclension.texts[language][nounCaseLabelKey(id)])
      }
      expect(texts[language]['case.voc'], language).toBeUndefined()
    }
  })

  it('words the case and number of a sentence, e.g. 3. dative, singular, from the two labels', () => {
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

import { describe, expect, it } from 'vitest'
import { PERSONAL_PRONOUN_TABLES } from './tables'

const LESS_COMMON = 'less-commonly-used'
const UNSTRESSED = 'unstressed-not-sentence-initial'
const IJP = 'ijp-animate-only'

describe('the Czech personal pronoun table, as the quiz looks it up', () => {
  const czech = PERSONAL_PRONOUN_TABLES.cs!

  it('gives the variants without a preposition, or after one, by the neutral case and number ids, in the table’s order', () => {
    expect(czech.forms({ caseId: 'dat', number: 'sg', gender: 'm. živ.' }, false)).toEqual([{ value: 'jemu' }, { value: 'mu', remarks: [UNSTRESSED] }])
    expect(czech.forms({ caseId: 'dat', number: 'sg', gender: 'm. živ.' }, true)).toEqual([{ value: 'němu' }])
    expect(czech.forms({ caseId: 'ins', number: 'pl', gender: 'ž.' }, false)).toEqual([{ value: 'jimi' }])
    expect(czech.forms({ caseId: 'ins', number: 'pl', gender: 'ž.' }, true)).toEqual([{ value: 'nimi' }])
  })

  it('keeps every remark of a variant, as the table has it', () => {
    expect(czech.forms({ caseId: 'gen', number: 'sg', gender: 's.' }, false)).toEqual([
      { value: 'jeho', remarks: [LESS_COMMON] },
      { value: 'jej' },
      { value: 'ho', remarks: [UNSTRESSED] },
    ])
    expect(czech.forms({ caseId: 'acc', number: 'sg', gender: 'm. neživ.' }, true)).toEqual([{ value: 'něho', remarks: [LESS_COMMON, IJP] }, { value: 'něj' }])
  })

  it('gives the nominative and the locative, which have one list each, whether or not after a preposition', () => {
    for (const afterPreposition of [false, true]) {
      expect(czech.forms({ caseId: 'nom', number: 'sg', gender: 'ž.' }, afterPreposition)).toEqual([{ value: 'ona' }])
      expect(czech.forms({ caseId: 'loc', number: 'sg', gender: 'm. živ.' }, afterPreposition)).toEqual([{ value: 'něm' }])
    }
  })

  it('agrees in the plural with the plural gender, when the noun has one, and in the singular with its own gender: ono, ony', () => {
    expect(czech.forms({ caseId: 'nom', number: 'pl', gender: 's.', pluralGender: 'ž.' }, false)).toEqual([{ value: 'ony' }])
    expect(czech.forms({ caseId: 'nom', number: 'pl', gender: 's.' }, false)).toEqual([{ value: 'ona' }])
    expect(czech.forms({ caseId: 'nom', number: 'sg', gender: 's.', pluralGender: 'ž.' }, false)).toEqual([{ value: 'ono' }])
  })

  it('knows the four genders the noun dataset words, and throws for any other', () => {
    expect(czech.genders).toEqual(['m. živ.', 'm. neživ.', 'ž.', 's.'])
    expect(() => czech.forms({ caseId: 'nom', number: 'sg', gender: 'm.' }, false)).toThrow(/gender/)
    expect(() => czech.forms({ caseId: 'nom', number: 'pl', gender: 's.', pluralGender: 'x' }, false)).toThrow(/gender/)
  })
})

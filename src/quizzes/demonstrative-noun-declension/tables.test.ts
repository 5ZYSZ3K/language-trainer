import { describe, expect, it } from 'vitest'
import { DEMONSTRATIVE_TABLES } from './tables'

describe('the Czech demonstrative pronoun table, as the quiz looks it up', () => {
  const czech = DEMONSTRATIVE_TABLES.cs!

  it('shows ten as the base form, whatever the noun: the gender is not given away', () => {
    expect(czech.baseForm).toBe('ten')
  })

  it('gives the form by the neutral case and number ids, agreeing with the gender', () => {
    expect(czech.form({ caseId: 'dat', number: 'sg', gender: 'm. živ.' })).toBe('tomu')
    expect(czech.form({ caseId: 'acc', number: 'sg', gender: 'm. živ.' })).toBe('toho')
    expect(czech.form({ caseId: 'acc', number: 'sg', gender: 'm. neživ.' })).toBe('ten')
    expect(czech.form({ caseId: 'loc', number: 'sg', gender: 'ž.' })).toBe('té')
    expect(czech.form({ caseId: 'ins', number: 'pl', gender: 's.' })).toBe('těmi')
  })

  it('names every case but the vocative by its own id', () => {
    const forms = (['nom', 'gen', 'dat', 'acc', 'loc', 'ins'] as const).map((caseId) => czech.form({ caseId, number: 'sg', gender: 'ž.' }))
    expect(forms).toEqual(['ta', 'té', 'té', 'tu', 'té', 'tou'])
  })

  it('agrees in the plural with the plural gender, when the noun has one, and in the singular with its own gender: to dítě, ty děti', () => {
    expect(czech.form({ caseId: 'nom', number: 'pl', gender: 's.', pluralGender: 'ž.' })).toBe('ty')
    expect(czech.form({ caseId: 'nom', number: 'pl', gender: 's.' })).toBe('ta')
    expect(czech.form({ caseId: 'nom', number: 'sg', gender: 's.', pluralGender: 'ž.' })).toBe('to')
  })

  it('knows the four genders the noun dataset words, and throws for any other', () => {
    expect(czech.genders).toEqual(['m. živ.', 'm. neživ.', 'ž.', 's.'])
    expect(() => czech.form({ caseId: 'nom', number: 'sg', gender: 'm.' })).toThrow(/gender/)
    expect(() => czech.form({ caseId: 'nom', number: 'pl', gender: 's.', pluralGender: 'x' })).toThrow(/gender/)
  })
})

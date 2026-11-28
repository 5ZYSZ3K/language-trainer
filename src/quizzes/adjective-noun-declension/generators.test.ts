import { describe, expect, it } from 'vitest'
import { ADJECTIVE_DECLENSION_GENERATORS } from './generators'

describe('the Czech adjective declension generator, as the quiz looks it up', () => {
  const czech = ADJECTIVE_DECLENSION_GENERATORS.cs!

  it('declines by the neutral case and number ids: gen + pl is the genitive plural', () => {
    expect(czech.decline('dobrý', { caseId: 'gen', number: 'pl', gender: 'm. živ.' })).toEqual(['dobrých'])
    expect(czech.decline('dobrý', { caseId: 'nom', number: 'pl', gender: 'm. živ.' })).toEqual(['dobří'])
    expect(czech.decline('cizí', { caseId: 'ins', number: 'sg', gender: 'ž.' })).toEqual(['cizí'])
  })

  it('names every case by its own id', () => {
    const forms = (['nom', 'gen', 'dat', 'acc', 'voc', 'loc', 'ins'] as const).map((caseId) =>
      czech.decline('mladý', { caseId, number: 'sg', gender: 'm. živ.' }),
    )
    expect(forms).toEqual([['mladý'], ['mladého'], ['mladému'], ['mladého'], ['mladý'], ['mladém'], ['mladým']])
  })

  it('agrees in the plural with the plural gender, when the noun has one, and in the singular with its own gender', () => {
    // dítě is neuter, děti feminine: malé dítě, malé děti (not malá děti).
    expect(czech.decline('malý', { caseId: 'nom', number: 'pl', gender: 's.', pluralGender: 'ž.' })).toEqual(['malé'])
    expect(czech.decline('malý', { caseId: 'nom', number: 'pl', gender: 's.' })).toEqual(['malá'])
    expect(czech.decline('malý', { caseId: 'nom', number: 'sg', gender: 's.', pluralGender: 'ž.' })).toEqual(['malé'])
  })

  it('knows the four genders the noun dataset words, and throws for any other', () => {
    expect(czech.genders).toEqual(['m. živ.', 'm. neživ.', 'ž.', 's.'])
    expect(() => czech.decline('malý', { caseId: 'nom', number: 'sg', gender: 'm.' })).toThrow(/gender/)
    expect(() => czech.decline('malý', { caseId: 'nom', number: 'pl', gender: 's.', pluralGender: 'x' })).toThrow(/gender/)
  })

  it('throws for a word it cannot decline', () => {
    expect(() => czech.decline('rychle', { caseId: 'nom', number: 'sg', gender: 'ž.' })).toThrow()
  })
})

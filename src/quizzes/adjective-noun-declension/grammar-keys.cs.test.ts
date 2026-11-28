import { describe, expect, it } from 'vitest'
import { CZECH_GENDERS, czechKeysOf } from './grammar-keys.cs'

describe('the keys the owner’s Czech tables look a form up by', () => {
  it('name the case, the number and the gender as the tables do, from the neutral ids', () => {
    expect(czechKeysOf({ caseId: 'loc', number: 'sg', gender: 'm. živ.' })).toEqual({ grammarCase: 'lokál', grammarNumber: 'singular', grammarGender: 'm. živ.' })
    expect(czechKeysOf({ caseId: 'voc', number: 'pl', gender: 'ž.' })).toEqual({ grammarCase: 'vokativ', grammarNumber: 'plural', grammarGender: 'ž.' })
  })

  it('agree in the plural with the noun’s plural gender, if it has one, and in the singular with its own: dítě, děti', () => {
    expect(czechKeysOf({ caseId: 'nom', number: 'pl', gender: 's.', pluralGender: 'ž.' }).grammarGender).toBe('ž.')
    expect(czechKeysOf({ caseId: 'nom', number: 'sg', gender: 's.', pluralGender: 'ž.' }).grammarGender).toBe('s.')
    expect(czechKeysOf({ caseId: 'nom', number: 'pl', gender: 's.' }).grammarGender).toBe('s.')
  })

  it('know the four genders the noun dataset words, and throw for any other', () => {
    expect(CZECH_GENDERS).toEqual(['m. živ.', 'm. neživ.', 'ž.', 's.'])
    expect(() => czechKeysOf({ caseId: 'nom', number: 'sg', gender: 'm.' })).toThrow('unknown gender "m."')
    expect(() => czechKeysOf({ caseId: 'nom', number: 'pl', gender: 's.', pluralGender: 'x' })).toThrow('unknown gender "x"')
  })
})

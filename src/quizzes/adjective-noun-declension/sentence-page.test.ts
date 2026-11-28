import { describe, expect, it } from 'vitest'
import { advokát, dítě } from '../demonstrative-noun-declension/test-support'
import { agreementOf } from './sentence-page'

describe('the form of the word that agrees with a noun', () => {
  it('is the case and the number, with the noun’s gender and plural gender: dítě, děti', () => {
    expect(agreementOf(dítě, 'dat', 'pl')).toEqual({ caseId: 'dat', number: 'pl', gender: 's.', pluralGender: 'ž.' })
  })

  it('has no plural gender for a noun without one', () => {
    const form = agreementOf(advokát, 'loc', 'sg')
    expect(form).toEqual({ caseId: 'loc', number: 'sg', gender: 'm. živ.' })
    expect(form.pluralGender).toBeUndefined()
  })
})

import { describe, expect, it } from 'vitest'
import { advokát, dítě } from '../demonstrative-noun-declension/test-support'
import type { QuizHost } from '../quiz-type'
import { agreementOf, sentencePageHost } from './sentence-page'

describe('what a sentence quiz’s page takes from the shell', () => {
  it('is the pool’s saved settings and the meters’ recorder from the host, and Math.random', () => {
    const host = { settings: { get: () => undefined, set: () => {} }, record: () => {} } as unknown as QuizHost<unknown>
    const taken = sentencePageHost(host)
    expect(taken.settings).toBe(host.settings)
    expect(taken.record).toBe(host.record)
    expect(taken.random).toBe(Math.random)
  })
})

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

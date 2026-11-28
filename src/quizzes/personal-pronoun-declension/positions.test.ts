import { describe, expect, it } from 'vitest'
import { GOVERNING_CASES, type GoverningCase } from '../adjective-noun-declension/sentence-items'
import { nounNumbers, type GrammaticalNumber } from '../noun-declension/cells'
import { pronoun, type GrammarCase, type GrammarGender, type GrammarNumber } from './base-pronouns'
import { acceptedPronouns } from './positions'
import { PERSONAL_PRONOUN_TABLES } from './tables'

const czech = PERSONAL_PRONOUN_TABLES.cs!
const UNSTRESSED = 'unstressed-not-sentence-initial'
const valuesOf = (variants: readonly { value: string }[]) => variants.map((variant) => variant.value)

/** Every form the quiz asks the pronoun in: each case but the vocative, each number, each gender. */
const everyForm = GOVERNING_CASES.flatMap((caseId) => nounNumbers.flatMap((number) => czech.genders.map((gender) => ({ caseId, number, gender }))))

// The owner's keys for the neutral ids, written out here rather than taken from the quiz's adapter, so that a test of
// what the quiz accepts does not trust the adapter it goes through. The owner words the genders as the quiz does.
const OWNER_CASES: Readonly<Record<GoverningCase, GrammarCase>> = {
  nom: 'nominativ',
  gen: 'genitiv',
  dat: 'dativ',
  acc: 'akuzativ',
  loc: 'lokál',
  ins: 'instrumentál',
}
const OWNER_NUMBERS: Readonly<Record<GrammaticalNumber, GrammarNumber>> = { sg: 'singular', pl: 'plural' }

/** The owner's table's variants of a form after a preposition (base-pronouns.ts), each as a value with its remarks, if any. */
function ownerFormsAfterPreposition({ caseId, number, gender }: (typeof everyForm)[number]) {
  const variants: readonly (string | { readonly value: string; readonly remarks: readonly string[] })[] = pronoun(
    OWNER_CASES[caseId],
    OWNER_NUMBERS[number],
    gender as GrammarGender,
    true,
  )
  return variants.map((variant) => (typeof variant === 'string' ? { value: variant } : { value: variant.value, remarks: [...variant.remarks] }))
}

describe('the accepted forms of the personal pronoun, by the position of the noun it stands for', () => {
  const advokátovi = { caseId: 'dat', number: 'sg', gender: 'm. živ.' } as const

  it('after the verb, are the forms without a preposition, the unstressed ones included: Pomáhám jemu / mu', () => {
    expect(valuesOf(acceptedPronouns(czech, advokátovi, 'after-verb'))).toEqual(['jemu', 'mu'])
  })

  it('after a preposition, are the n- forms the table gives after one: Mluvím o něm, Jdu k němu', () => {
    expect(valuesOf(acceptedPronouns(czech, advokátovi, 'after-preposition'))).toEqual(['němu'])
    expect(valuesOf(acceptedPronouns(czech, { caseId: 'loc', number: 'sg', gender: 'm. živ.' }, 'after-preposition'))).toEqual(['něm'])
    expect(valuesOf(acceptedPronouns(czech, { caseId: 'acc', number: 'sg', gender: 's.' }, 'after-preposition'))).toEqual(['ně', 'něj'])
  })

  it('at the start, are the forms without a preposition but the unstressed ones: Jemu pomáhám, never Mu pomáhám', () => {
    expect(valuesOf(acceptedPronouns(czech, advokátovi, 'start'))).toEqual(['jemu'])
    expect(valuesOf(acceptedPronouns(czech, { caseId: 'gen', number: 'sg', gender: 'm. neživ.' }, 'start'))).toEqual(['jeho', 'jej'])
    expect(valuesOf(acceptedPronouns(czech, { caseId: 'acc', number: 'sg', gender: 's.' }, 'start'))).toEqual(['je', 'jej'])
  })

  it('keep their remarks, but for the one that the start leaves out', () => {
    expect(acceptedPronouns(czech, { caseId: 'gen', number: 'sg', gender: 's.' }, 'after-verb')).toEqual([
      { value: 'jeho', remarks: ['less-commonly-used'] },
      { value: 'jej' },
      { value: 'ho', remarks: [UNSTRESSED] },
    ])
    expect(acceptedPronouns(czech, { caseId: 'acc', number: 'sg', gender: 'm. neživ.' }, 'start')).toEqual([
      { value: 'jeho', remarks: ['ijp-animate-only'] },
      { value: 'jej' },
    ])
  })

  it('at the start, in every case, number and gender, leave at least one form and none marked unstressed', () => {
    for (const form of everyForm) {
      const accepted = acceptedPronouns(czech, form, 'start')
      const where = JSON.stringify(form)
      expect(accepted.length, where).toBeGreaterThan(0)
      expect(accepted.filter((variant) => variant.remarks?.includes(UNSTRESSED)), where).toEqual([])
    }
  })

  it('after a preposition, in every case, number and gender, are the owner’s table’s forms after a preposition and only those', () => {
    for (const form of everyForm) {
      expect(acceptedPronouns(czech, form, 'after-preposition'), JSON.stringify(form)).toEqual(ownerFormsAfterPreposition(form))
    }
    // Where the table pairs the forms, none of those without a preposition is accepted after one.
    expect(valuesOf(acceptedPronouns(czech, { caseId: 'ins', number: 'pl', gender: 'ž.' }, 'after-preposition'))).toEqual(['nimi'])
  })

  it('agree in the plural with the noun’s plural gender: To jsou ony, for děti', () => {
    expect(valuesOf(acceptedPronouns(czech, { caseId: 'nom', number: 'pl', gender: 's.', pluralGender: 'ž.' }, 'after-verb'))).toEqual(['ony'])
  })
})

import { describe, expect, it } from 'vitest'
import type { Person } from '../adjective-noun-declension/sentence-items'
import type { PronounDraw } from './draw'
import type { PronounVerbItem } from './items'
import type { Position } from './positions'
import { advokát, bátSe, být, dítě, dívatSeNa, mluvitO, pomáhat } from './test-support'
import { sentenceOf } from './word-order'

/** A round on `advokát` in `caseId` and the singular, unless the draw says otherwise. */
const draw = (
  item: PronounVerbItem,
  position: Position,
  { prepositionFirst = false, person = '1sg', ...rest }: Partial<PronounDraw> & { person?: Person } = {},
): PronounDraw => ({ noun: advokát, caseId: item.case, number: 'sg', position, prepositionFirst, verb: { item, person }, ...rest })

describe('the sentence of a round, with the noun and with a field in its place', () => {
  it('after the verb: the verb form, then the noun, capitalised, with a full stop: Pomáhám advokátovi. / Pomáhám ___.', () => {
    expect(sentenceOf(draw(pomáhat, 'after-verb'))).toEqual({
      noun: 'advokát',
      caseId: 'dat',
      number: 'sg',
      withNoun: 'Pomáhám advokátovi.',
      lead: 'Pomáhám',
      tail: '',
    })
  })

  it('after the verb, puts the subject first: To je advokát. / To jsou ___.', () => {
    expect(sentenceOf(draw(být, 'after-verb', { person: '3sg' }))).toMatchObject({ withNoun: 'To je advokát.', lead: 'To je', tail: '' })
    expect(sentenceOf(draw(být, 'after-verb', { number: 'pl', person: '3pl' }))).toMatchObject({ withNoun: 'To jsou advokáti.', lead: 'To jsou' })
  })

  it('after the verb, puts the reflexive particle right after the verb form, then the preposition: Bojím se advokáta., Dívám se na advokáta.', () => {
    expect(sentenceOf(draw(bátSe, 'after-verb'))).toMatchObject({ withNoun: 'Bojím se advokáta.', lead: 'Bojím se', tail: '' })
    expect(sentenceOf(draw(dívatSeNa, 'after-preposition'))).toMatchObject({ withNoun: 'Dívám se na advokáta.', lead: 'Dívám se na', tail: '' })
    expect(sentenceOf(draw(mluvitO, 'after-preposition', { person: '3pl' }))).toMatchObject({ withNoun: 'Mluví o advokátovi.', lead: 'Mluví o' })
  })

  it('at the start: the noun, capitalised, then the reflexive particle second, then the verb form: Advokáta se bojím. / ___ se bojím.', () => {
    expect(sentenceOf(draw(bátSe, 'start'))).toMatchObject({ withNoun: 'Advokáta se bojím.', lead: '', tail: 'se bojím' })
    expect(sentenceOf(draw(pomáhat, 'start', { person: '2pl' }))).toMatchObject({ withNoun: 'Advokátovi pomáháte.', lead: '', tail: 'pomáháte' })
  })

  it('with the preposition first: the preposition, capitalised, the noun, the reflexive particle second, the verb form: Na advokáta se dívám.', () => {
    expect(sentenceOf(draw(dívatSeNa, 'after-preposition', { prepositionFirst: true }))).toMatchObject({
      withNoun: 'Na advokáta se dívám.',
      lead: 'Na',
      tail: 'se dívám',
    })
    expect(sentenceOf(draw(mluvitO, 'after-preposition', { prepositionFirst: true }))).toMatchObject({
      withNoun: 'O advokátovi mluvím.',
      lead: 'O',
      tail: 'mluvím',
    })
  })

  it('shows the noun in the first variant of its cell, in the round’s case and number: děti, not another form', () => {
    expect(sentenceOf(draw(být, 'after-verb', { noun: dítě, number: 'pl', person: '3pl' }))).toMatchObject({ noun: 'dítě', withNoun: 'To jsou děti.' })
    const pán = { ...advokát, prompt: 'pán', cells: [{ id: 'dat-sg', acceptedForms: [{ value: 'pánovi' }, { value: 'pánu' }] }] }
    expect(sentenceOf(draw(pomáhat, 'start', { noun: pán }))).toMatchObject({ noun: 'pán', withNoun: 'Pánovi pomáhám.' })
  })
})

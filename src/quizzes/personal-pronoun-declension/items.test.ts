import { describe, expect, it } from 'vitest'
import { personalPronounContract } from './items'

const noun = {
  kind: 'noun',
  prompt: 'dítě',
  gender: 's.',
  pluralGender: 'ž.',
  cells: [
    { id: 'nom-sg', acceptedForms: [{ value: 'dítě' }] },
    { id: 'dat-sg', acceptedForms: [{ value: 'dítěti' }] },
    { id: 'nom-pl', acceptedForms: [{ value: 'děti' }] },
  ],
}
const forms = { '1sg': 'mluvím', '2sg': 'mluvíš', '3sg': 'mluví', '1pl': 'mluvíme', '2pl': 'mluvíte', '3pl': 'mluví' }
const verb = { kind: 'verb', verb: 'mluvit', preposition: 'o', case: 'loc', forms }
const bojím = { '1sg': 'bojím', '2sg': 'bojíš', '3sg': 'bojí', '1pl': 'bojíme', '2pl': 'bojíte', '3pl': 'bojí' }
const bátSe = { kind: 'verb', verb: 'bát se', reflexive: 'se', case: 'gen', forms: bojím }
const check = (value: unknown) => personalPronounContract.validateItem(value)

describe('personalPronounContract', () => {
  it('accepts a noun with its gender and cells, and a governing verb with its forms, with or without the optional parts', () => {
    expect(check(noun)).toEqual([])
    expect(check(verb)).toEqual([])
    const { pluralGender: _pluralGender, ...plainNoun } = noun
    const { preposition: _preposition, ...plainVerb } = verb
    expect(check(plainNoun)).toEqual([])
    expect(check(plainVerb)).toEqual([])
    expect(check({ ...verb, subject: 'to' })).toEqual([])
  })

  it('accepts a reflexive verb with its particle apart from its forms', () => {
    expect(check(bátSe)).toEqual([])
    expect(check({ ...bátSe, verb: 'všimnout si', reflexive: 'si' })).toEqual([])
  })

  it('refuses a reflexive particle that is not the last word of the verb, and a reflexive verb without one', () => {
    expect(check({ ...bátSe, reflexive: 'si' })).toEqual(['reflexive must be "se", the last word of the verb, found "si"'])
    expect(check({ ...verb, reflexive: 'se' })).toEqual(['the verb "mluvit" is not reflexive, but has the reflexive particle "se"'])
    const { reflexive: _reflexive, ...withoutParticle } = bátSe
    expect(check(withoutParticle)).toEqual(['the reflexive verb "bát se" has no reflexive particle apart from its forms'])
  })

  it('refuses anything that is neither a noun nor a verb', () => {
    expect(check(null)).toEqual(['item must be an object'])
    expect(check({ ...noun, kind: 'pronoun' })).toEqual(['kind must be noun or verb, found "pronoun"'])
  })

  it('refuses a vocative cell, which this quiz never asks', () => {
    const vocative = { id: 'voc-sg', acceptedForms: [{ value: 'dítě' }] }
    expect(check({ ...noun, cells: [noun.cells[0], vocative] })).toEqual([
      'cell ids must be among nom-sg, gen-sg, dat-sg, acc-sg, loc-sg, ins-sg, nom-pl, gen-pl, dat-pl, acc-pl, loc-pl, ins-pl, found nom-sg, voc-sg',
    ])
  })

  it('refuses a noun as demonstratives with nouns does: no prompt or gender, cells out of order or with remarks', () => {
    expect(check({ ...noun, prompt: ' ' })).toEqual(['missing prompt'])
    expect(check({ ...noun, gender: undefined })).toEqual(['gender must be text'])
    expect(check({ ...noun, cells: [] })).toEqual(['no cells'])
    expect(check({ ...noun, cells: [{ id: 'dat-sg', acceptedForms: [{ value: 'dítěti', remarks: ['non-final'] }] }] })).toEqual([
      'cell dat-sg has a variant with remarks, which this quiz type does not show',
    ])
  })

  it('refuses a verb as the other sentence quizzes do: no verb, or the vocative', () => {
    expect(check({ ...verb, verb: '' })).toEqual(['missing verb'])
    expect(check({ ...verb, case: 'voc' })).toEqual(['case must be one of nom, gen, dat, acc, loc, ins, found "voc"'])
  })

  it("keeps a noun's key apart from a verb's, and a verb's with and without a preposition", () => {
    const keyOf = personalPronounContract.keyOf
    const keys = [
      keyOf({ ...noun, kind: 'noun', prompt: 'jít' } as never),
      keyOf({ ...verb, kind: 'verb', verb: 'jít', preposition: undefined } as never),
      keyOf({ ...verb, kind: 'verb', verb: 'jít', preposition: 'do' } as never),
    ]
    expect(new Set(keys).size).toBe(3)
  })
})

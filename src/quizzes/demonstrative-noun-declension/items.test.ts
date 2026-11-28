import { describe, expect, it } from 'vitest'
import { demonstrativeNounContract } from './items'

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
const check = (value: unknown) => demonstrativeNounContract.validateItem(value)

describe('demonstrativeNounContract', () => {
  it('accepts a noun with its gender and cells, and a governing verb with its forms, with or without the optional parts', () => {
    expect(check(noun)).toEqual([])
    expect(check(verb)).toEqual([])
    const { pluralGender: _pluralGender, ...plainNoun } = noun
    const { preposition: _preposition, ...plainVerb } = verb
    expect(check(plainNoun)).toEqual([])
    expect(check(plainVerb)).toEqual([])
    expect(check({ ...verb, subject: 'to' })).toEqual([])
  })

  it('refuses anything that is neither a noun nor a verb', () => {
    expect(check(null)).toEqual(['item must be an object'])
    expect(check({ ...noun, kind: 'adjective' })).toEqual(['kind must be noun or verb, found "adjective"'])
  })

  it('refuses a noun without a prompt or a gender, or with a plural gender that is not text', () => {
    expect(check({ ...noun, prompt: ' ' })).toEqual(['missing prompt'])
    expect(check({ ...noun, gender: undefined })).toEqual(['gender must be text'])
    expect(check({ ...noun, pluralGender: 3 })).toEqual(['pluralGender must be text'])
  })

  it('refuses a vocative cell, which this quiz never asks', () => {
    const vocative = { id: 'voc-sg', acceptedForms: [{ value: 'dítě' }] }
    expect(check({ ...noun, cells: [noun.cells[0], vocative] })).toEqual([
      'cell ids must be among nom-sg, gen-sg, dat-sg, acc-sg, loc-sg, ins-sg, nom-pl, gen-pl, dat-pl, acc-pl, loc-pl, ins-pl, found nom-sg, voc-sg',
    ])
  })

  it('refuses a noun whose cells are out of order, are missing a form, or have remarks', () => {
    expect(check({ ...noun, cells: [] })).toEqual(['no cells'])
    expect(check({ ...noun, cells: [noun.cells[1], noun.cells[0]] })[0]).toMatch(/^cell ids must come in the order nom-sg, gen-sg/)
    expect(check({ ...noun, cells: [{ id: 'nom-sg', acceptedForms: [] }] })).toEqual(['no form found for nom-sg'])
    expect(check({ ...noun, cells: [{ id: 'dat-sg', acceptedForms: [{ value: 'dítěti', remarks: ['non-final'] }] }] })).toEqual([
      'cell dat-sg has a variant with remarks, which this quiz type does not show',
    ])
  })

  it('refuses a verb as adjectives with nouns does: no verb, or the vocative', () => {
    expect(check({ ...verb, verb: '' })).toEqual(['missing verb'])
    expect(check({ ...verb, case: 'voc' })).toEqual(['case must be one of nom, gen, dat, acc, loc, ins, found "voc"'])
  })

  it("keeps a noun's key apart from a verb's, and a verb's with and without a preposition", () => {
    const keyOf = demonstrativeNounContract.keyOf
    const keys = [
      keyOf({ ...noun, kind: 'noun', prompt: 'jít' } as never),
      keyOf({ ...verb, kind: 'verb', verb: 'jít', preposition: undefined } as never),
      keyOf({ ...verb, kind: 'verb', verb: 'jít', preposition: 'do' } as never),
    ]
    expect(new Set(keys).size).toBe(3)
  })
})

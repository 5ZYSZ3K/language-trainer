import { describe, expect, it } from 'vitest'
import { nounCaseIds } from '../noun-declension/cells'
import { verbPresentCellIds } from '../verb-present-tense'
import { adjectiveNounContract, GOVERNING_CASES, isGoverningCase, PERSONS } from './items'

const noun = {
  kind: 'noun',
  prompt: 'dítě',
  gender: 's.',
  pluralGender: 'ž.',
  adjectives: ['malý', 'hladový'],
  cells: [
    { id: 'nom-sg', acceptedForms: [{ value: 'dítě' }] },
    { id: 'dat-sg', acceptedForms: [{ value: 'dítěti' }] },
    { id: 'nom-pl', acceptedForms: [{ value: 'děti' }] },
  ],
}
const forms = { '1sg': 'mluvím', '2sg': 'mluvíš', '3sg': 'mluví', '1pl': 'mluvíme', '2pl': 'mluvíte', '3pl': 'mluví' }
const verb = { kind: 'verb', verb: 'mluvit', preposition: 'o', case: 'loc', forms }
const check = (value: unknown) => adjectiveNounContract.validateItem(value)

describe('the persons and cases of a governing verb', () => {
  it('are the verb dataset cell ids, and every case but the vocative', () => {
    expect(PERSONS).toEqual(verbPresentCellIds)
    expect(GOVERNING_CASES).toEqual(['nom', 'gen', 'dat', 'acc', 'loc', 'ins'])
  })

  it('leave only the vocative without a governing verb', () => {
    expect(nounCaseIds.filter((caseId) => !isGoverningCase(caseId))).toEqual(['voc'])
    expect(isGoverningCase('dat')).toBe(true)
    expect(isGoverningCase('dat-sg')).toBe(false)
  })
})

describe('adjectiveNounContract', () => {
  it('accepts a noun with its adjectives and cells, and a verb with its forms, with or without the optional parts', () => {
    expect(check(noun)).toEqual([])
    expect(check(verb)).toEqual([])
    const { pluralGender: _pluralGender, ...plainNoun } = noun
    const { preposition: _preposition, ...plainVerb } = verb
    expect(check(plainNoun)).toEqual([])
    expect(check(plainVerb)).toEqual([])
  })

  it('refuses anything that is neither a noun nor a verb', () => {
    expect(check(null)).toEqual(['item must be an object'])
    expect(check({ ...noun, kind: 'adjective' })).toEqual(['kind must be noun or verb, found "adjective"'])
    expect(check({ ...verb, kind: undefined })).toEqual(['kind must be noun or verb, found undefined'])
  })

  it('refuses a noun without a prompt or a gender, or with a plural gender that is not text', () => {
    expect(check({ ...noun, prompt: ' ' })).toEqual(['missing prompt'])
    expect(check({ ...noun, gender: undefined })).toEqual(['gender must be text'])
    expect(check({ ...noun, pluralGender: 3 })).toEqual(['pluralGender must be text'])
  })

  it('refuses a noun without adjectives, with an adjective that is not text, or with one twice', () => {
    expect(check({ ...noun, adjectives: [] })).toEqual(['adjectives must be a non-empty list of text'])
    expect(check({ ...noun, adjectives: ['malý', ''] })).toEqual(['adjectives must be a non-empty list of text'])
    expect(check({ ...noun, adjectives: ['malý', 'hladový', 'malý'] })).toEqual(['the adjective "malý" is there twice'])
  })

  it('refuses a noun whose cells are not noun cells in order, are missing a form, or have remarks', () => {
    expect(check({ ...noun, cells: [] })).toEqual(['no cells'])
    expect(check({ ...noun, cells: 'x' })).toEqual(['cells must be a list'])
    expect(check({ ...noun, cells: [noun.cells[1], noun.cells[0]] })[0]).toMatch(/^cell ids must come in the order nom-sg, gen-sg/)
    expect(check({ ...noun, cells: [{ id: '1sg', acceptedForms: [{ value: 'x' }] }] })[0]).toMatch(/^cell ids must be among nom-sg/)
    expect(check({ ...noun, cells: [{ id: 'nom-sg', acceptedForms: [] }] })).toEqual(['no form found for nom-sg'])
    expect(check({ ...noun, cells: [{ id: 'dat-sg', acceptedForms: [{ value: 'advokátu', remarks: ['non-final'] }] }] })).toEqual([
      'cell dat-sg has a variant with remarks, which this quiz type does not show',
    ])
  })

  it('refuses a verb without a verb, with a preposition that is not text, or with the vocative or no case', () => {
    expect(check({ ...verb, verb: '' })).toEqual(['missing verb'])
    expect(check({ ...verb, preposition: '' })).toEqual(['preposition must be text'])
    expect(check({ ...verb, case: 'voc' })).toEqual(['case must be one of nom, gen, dat, acc, loc, ins, found "voc"'])
    expect(check({ ...verb, case: undefined })).toEqual(['case must be one of nom, gen, dat, acc, loc, ins, found undefined'])
  })

  it('refuses a verb whose forms lack a person or are not text', () => {
    const { '2pl': _missing, ...five } = forms
    expect(check({ ...verb, forms: five })).toEqual(['forms has no text for 2pl'])
    expect(check({ ...verb, forms: { ...forms, '1sg': ' ' } })).toEqual(['forms has no text for 1sg'])
    expect(check({ ...verb, forms: [] })).toEqual(['forms must be an object with a form per person (1sg, 2sg, 3sg, 1pl, 2pl, 3pl)'])
  })

  it('keeps a noun, a verb and a verb with a preposition apart by key', () => {
    const keyOf = adjectiveNounContract.keyOf
    const keys = [
      keyOf({ ...noun, kind: 'noun', prompt: 'jít' } as never),
      keyOf({ ...verb, kind: 'verb', verb: 'jít', preposition: undefined } as never),
      keyOf({ ...verb, kind: 'verb', verb: 'jít', preposition: 'do' } as never),
      keyOf({ ...verb, kind: 'verb', verb: 'jít', preposition: 'za' } as never),
    ]
    expect(new Set(keys).size).toBe(4)
    expect(keyOf({ ...verb, kind: 'verb', verb: 'jít', preposition: 'do' } as never)).toBe(keyOf({ ...verb, kind: 'verb', verb: 'jít', preposition: 'do', case: 'dat' } as never))
  })
})

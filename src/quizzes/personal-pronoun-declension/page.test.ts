import { describe, expect, it } from 'vitest'
import type { CaseId } from '../noun-declension/cells'
import { cellsOfCase } from '../noun-declension/filter'
import type { PersonalPronounItem } from './items'
import { PersonalPronounPage } from './page'
import { PERSONAL_PRONOUN_TABLES } from './tables'
import { advokát, bátSe, bojovatProti, dítě, pomáhat, být, zdraví } from './test-support'

// The page without its DOM: the shared sentence mount draws what this model says and hands it every key press and click.

/** The 12 forms the quiz offers: every case but the vocative, singular and plural. */
const TWELVE = ['nom-sg', 'gen-sg', 'dat-sg', 'acc-sg', 'loc-sg', 'ins-sg', 'nom-pl', 'gen-pl', 'dat-pl', 'acc-pl', 'loc-pl', 'ins-pl']

/**
 * A page over `items` with `saved` settings. `random` is 0 unless given, so every draw takes the first choice there is:
 * the first noun (other than the one before), the first case with a ticked form, singular if it is ticked and the noun
 * has it, the first position (after the verb, then after a preposition), the first verb that fits it, the preposition
 * first, the 1st person. A `random` of 0.99 takes the last choice of each instead, and never the preposition first.
 */
function pageOf(items: readonly PersonalPronounItem[], saved?: unknown, random = () => 0) {
  const records: [string, boolean][] = []
  let settings = saved
  const page = new PersonalPronounPage({
    items,
    table: PERSONAL_PRONOUN_TABLES.cs!,
    settings: { get: () => settings, set: (value) => (settings = value) },
    record: (meterId, correct) => void records.push([meterId, correct]),
    random,
  })
  page.start()
  return { page, records, saved: () => settings }
}

/** What the page saves for a filter with both forms of each of `caseIds` ticked, and nothing else. */
const saved = (...caseIds: CaseId[]) => ({ cells: caseIds.flatMap(cellsOfCase) })
const dativeSingular = { cells: ['dat-sg'] }

describe('a sentence', () => {
  it('shows the noun with the case and number, the sentence with the noun, and the words around the one field', () => {
    const { page } = pageOf([advokát, pomáhat], dativeSingular)
    expect(page.sentence).toEqual({ noun: 'advokát', caseId: 'dat', number: 'sg', withNoun: 'Pomáhám advokátovi.', lead: 'Pomáhám', tail: '' })
    expect(page.fields).toEqual([{ state: 'open', acceptedForms: ['jemu', 'mu'] }])
  })

  it('after the verb, accepts the forms without a preposition, the unstressed one included: Pomáhám jemu / mu', () => {
    const { page } = pageOf([advokát, pomáhat], dativeSingular)
    page.enter(0, 'mu')
    expect(page.fields).toEqual([{ state: 'correct', acceptedForms: ['jemu', 'mu'] }])
  })

  it('at the start, accepts them but the unstressed one: Jemu pomáhají, never Mu pomáhají', () => {
    const { page } = pageOf([advokát, pomáhat], dativeSingular, () => 0.99)
    expect(page.sentence).toMatchObject({ withNoun: 'Advokátovi pomáhají.', lead: '', tail: 'pomáhají' })
    page.enter(0, 'mu')
    expect(page.fields).toEqual([{ state: 'wrong', acceptedForms: ['jemu'] }])
  })

  it('after a preposition, accepts only the n- forms, wherever the preposition stands: Proti němu bojuji', () => {
    const { page } = pageOf([advokát, bojovatProti], dativeSingular)
    expect(page.sentence).toMatchObject({ withNoun: 'Proti advokátovi bojuji.', lead: 'Proti', tail: 'bojuji' })
    page.enter(0, 'jemu')
    expect(page.fields).toEqual([{ state: 'wrong', acceptedForms: ['němu'] }])
    const last = pageOf([advokát, bojovatProti], dativeSingular, () => 0.99).page
    expect(last.sentence).toMatchObject({ withNoun: 'Bojují proti advokátovi.', lead: 'Bojují proti', tail: '' })
    expect(last.fields[0]?.acceptedForms).toEqual(['němu'])
  })

  it('declines the pronoun in the plural by the noun’s plural gender: To jsou ony, for děti', () => {
    const { page } = pageOf([dítě, být], { cells: ['nom-pl'] })
    expect(page.sentence).toMatchObject({ noun: 'dítě', caseId: 'nom', number: 'pl', withNoun: 'To jsou děti.', lead: 'To jsou' })
    expect(page.fields[0]?.acceptedForms).toEqual(['ony'])
  })
})

describe('Enter and Check', () => {
  it('Enter in the empty field does nothing: nothing is checked or scored, and the focus stays', () => {
    const { page, records } = pageOf([advokát, pomáhat], dativeSingular)
    expect(page.enter(0, '  ')).toBe(0)
    expect(page.fields[0]?.state).toBe('open')
    expect(page.complete).toBe(false)
    expect(records).toEqual([])
  })

  it('Enter in the filled field checks it, by the matching rules; once it is checked, Enter starts the next sentence', () => {
    const { page } = pageOf([advokát, zdraví, pomáhat], saved('dat'))
    expect(page.enter(0, ' Jemu ')).toBeUndefined()
    expect(page.fields[0]?.state).toBe('correct')
    expect(page.complete).toBe(true)
    expect(page.enter(0, 'jemu')).toBe(0)
    expect(page.sentence?.noun).toBe('zdraví')
    expect(page.fields[0]?.state).toBe('open')
  })

  it('Check counts the empty field as wrong, and shows every accepted form', () => {
    const { page, records } = pageOf([advokát, pomáhat], dativeSingular)
    page.checkAll([''])
    expect(page.fields).toEqual([{ state: 'wrong', acceptedForms: ['jemu', 'mu'] }])
    expect(page.complete).toBe(true)
    expect(records).toEqual([['pronouns', false]])
  })
})

describe('the meter', () => {
  it('counts each checked pronoun, right or wrong, and nothing else: there is no meter of sentences', () => {
    const { page, records } = pageOf([advokát, zdraví, pomáhat], saved('dat'))
    page.enter(0, 'jemu')
    page.checkAll(['jemu'])
    page.enter(0, 'jemu')
    expect(records).toEqual([['pronouns', true]])
    page.checkAll(['jí'])
    expect(records).toEqual([
      ['pronouns', true],
      ['pronouns', false],
    ])
  })

  it('counts nothing for a skipped sentence', () => {
    const { page, records } = pageOf([advokát, zdraví, pomáhat], saved('dat'))
    page.start()
    expect(records).toEqual([])
    expect(page.sentence?.noun).toBe('zdraví')
    expect(page.fields[0]?.state).toBe('open')
  })
})

describe('the answer line', () => {
  /** Bojím se advokáta: the genitive after the verb, jeho (less common), jej, ho (unstressed). */
  const genitive = () => pageOf([advokát, bátSe], { cells: ['gen-sg'] }).page

  it('is empty while the field is open, and once it is right', () => {
    const page = genitive()
    expect(page.answer).toEqual([])
    page.enter(0, 'jej')
    expect(page.answer).toEqual([])
  })

  it('once it is wrong, has every accepted form in the table’s order, each with remarks followed by a chip per remark', () => {
    const page = genitive()
    page.enter(0, 'jemu')
    expect(page.answer).toEqual([
      { kind: 'form', value: 'jeho' },
      { kind: 'remark', code: 'less-commonly-used' },
      { kind: 'form', value: 'jej' },
      { kind: 'form', value: 'ho' },
      { kind: 'remark', code: 'unstressed-not-sentence-initial' },
    ])
  })

  it('never has the unstressed chip at the start, where the unstressed forms are not accepted', () => {
    const page = pageOf([advokát, bátSe], { cells: ['gen-sg'] }, () => 0.99).page
    expect(page.sentence).toMatchObject({ withNoun: 'Advokáta se bojí.' })
    page.checkAll([''])
    expect(page.answer).toEqual([{ kind: 'form', value: 'jeho' }, { kind: 'remark', code: 'less-commonly-used' }, { kind: 'form', value: 'jej' }])
  })
})

describe('the filter dialog', () => {
  it('ticks the 12 forms at first, every case but the vocative, singular and plural', () => {
    const { page } = pageOf([advokát, pomáhat])
    expect(page.filter).toEqual(new Set(TWELVE))
    page.openFilter()
    expect(page.filterDraft.ticked).toEqual(new Set(TWELVE))
  })

  it('applies the choice when it closes, saves it for the pool and starts a new sentence, if anything changed', () => {
    const { page, saved: savedNow } = pageOf([advokát, zdraví, pomáhat, bátSe], saved('dat'))
    page.openFilter()
    page.filterDraft.toggleCase('dat')
    page.filterDraft.set('gen-sg', true)
    expect(page.closeFilter()).toBe(true)
    expect(savedNow()).toEqual({ cells: ['gen-sg'] })
    expect(page.sentence).toMatchObject({ noun: 'zdraví', caseId: 'gen', number: 'sg' })
    page.openFilter()
    expect(page.closeFilter()).toBe(false)
  })

  it('reads back only the 12 forms of what was saved', () => {
    expect(pageOf([advokát, pomáhat], { cells: ['voc-sg', 'dat-pl'] }).page.filter).toEqual(new Set(['dat-pl']))
  })

  it('with nothing ticked, leaves nothing to ask for: no sentence, Check disabled, Next sentence highlighted, nothing scored', () => {
    const { page, records, saved: savedNow } = pageOf([advokát, pomáhat], saved('dat'))
    page.openFilter()
    page.filterDraft.clearAll()
    expect(page.closeFilter()).toBe(true)
    expect(savedNow()).toEqual({ cells: [] })
    expect(page.sentence).toBeUndefined()
    expect(page.fields).toEqual([])
    expect(page.answer).toEqual([])
    expect(page.complete).toBe(true)
    page.checkAll([])
    expect(page.enter(0, 'jemu')).toBeUndefined()
    expect(page.sentence).toBeUndefined()
    expect(records).toEqual([])
  })
})

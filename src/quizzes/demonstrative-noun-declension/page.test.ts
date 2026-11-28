import { describe, expect, it } from 'vitest'
import type { CaseId } from '../noun-declension/cells'
import { cellsOfCase } from '../noun-declension/filter'
import type { DemonstrativeNounItem } from './items'
import { DemonstrativePage } from './page'
import { DEMONSTRATIVE_TABLES } from './tables'
import { advokát, být, dítě, otherVerbs, pomáhat, zdraví } from './test-support'

// The page without its DOM: the shared sentence mount draws what this model says and hands it every key press and click.

/** The 12 forms the quiz offers: every case but the vocative, singular and plural. */
const TWELVE = ['nom-sg', 'gen-sg', 'dat-sg', 'acc-sg', 'loc-sg', 'ins-sg', 'nom-pl', 'gen-pl', 'dat-pl', 'acc-pl', 'loc-pl', 'ins-pl']

/**
 * A page over `items` with `saved` settings. `random` is 0, so every draw takes the first choice there is: the first noun
 * (other than the one before), the first case with a ticked form, singular if it is ticked and the noun has it, the first
 * verb of the case, the 1st person.
 */
function pageOf(items: readonly DemonstrativeNounItem[], saved?: unknown) {
  const records: [string, boolean][] = []
  let settings = saved
  const page = new DemonstrativePage({
    items,
    table: DEMONSTRATIVE_TABLES.cs!,
    settings: { get: () => settings, set: (value) => (settings = value) },
    record: (meterId, correct) => void records.push([meterId, correct]),
    random: () => 0,
  })
  page.start()
  return { page, records, saved: () => settings }
}
/** What the page saves for a filter with both forms of each of `caseIds` ticked, and nothing else. */
const saved = (...caseIds: CaseId[]) => ({ cells: caseIds.flatMap(cellsOfCase) })
const dative = saved('dat')

describe('a sentence', () => {
  it('shows ten and the noun in their base forms, the case and the number, and the verb form, capitalised', () => {
    const { page } = pageOf([advokát, pomáhat], dative)
    expect(page.sentence).toEqual({ pronoun: 'ten', noun: 'advokát', caseId: 'dat', number: 'sg', lead: 'Pomáhám', end: '.' })
  })

  it('has two open fields, the pronoun and the noun, whose accepted forms come from the table and the noun’s cell', () => {
    const { page } = pageOf([advokát, pomáhat], dative)
    expect(page.fields.map((field) => field.state)).toEqual(['open', 'open'])
    page.checkAll(['', ''])
    expect(page.fields).toEqual([
      { state: 'wrong', acceptedForms: ['tomu'] },
      { state: 'wrong', acceptedForms: ['advokátovi'] },
    ])
  })

  it('declines the pronoun in the plural by the noun’s plural gender: To jsou ty děti, not ta děti', () => {
    const { page } = pageOf([dítě, být], { cells: ['nom-pl'] })
    expect(page.sentence).toEqual({ pronoun: 'ten', noun: 'dítě', caseId: 'nom', number: 'pl', lead: 'To jsou', end: '.' })
    page.enter(0, 'ta')
    expect(page.fields[0]).toEqual({ state: 'wrong', acceptedForms: ['ty'] })
  })
})

describe('Enter', () => {
  it('checks the field it is in and moves to the next open one; once both are checked, it starts the next sentence', () => {
    const { page } = pageOf([advokát, zdraví, pomáhat], dative)
    expect(page.enter(0, 'Tomu ')).toBe(1)
    expect(page.fields[0]?.state).toBe('correct')
    expect(page.complete).toBe(false)

    expect(page.enter(1, 'advokátu')).toBeUndefined()
    expect(page.fields[1]).toEqual({ state: 'wrong', acceptedForms: ['advokátovi'] })
    expect(page.complete).toBe(true)

    expect(page.enter(1, 'advokátu')).toBe(0)
    expect(page.sentence?.noun).toBe('zdraví')
    expect(page.fields.map((field) => field.state)).toEqual(['open', 'open'])
  })

  it('in an empty field checks nothing and moves on; in the noun field first, checks it and goes back to the pronoun', () => {
    const { page, records } = pageOf([advokát, pomáhat], dative)
    expect(page.enter(0, '')).toBe(1)
    expect(page.fields[0]?.state).toBe('open')
    expect(page.enter(1, 'advokátovi')).toBe(0)
    expect(page.fields.map((field) => field.state)).toEqual(['open', 'correct'])
    expect(records).toEqual([['nouns', true]])
  })
})

describe('the meters', () => {
  it('count each checked pronoun and noun field, and each completed sentence, fully correct or not', () => {
    const { page, records } = pageOf([advokát, zdraví, pomáhat], dative)
    page.enter(0, 'tomu')
    page.enter(1, 'advokátu')
    expect(records).toEqual([
      ['pronouns', true],
      ['nouns', false],
      ['sentences', false],
    ])
    page.start()
    page.checkAll(['tomu', 'zdraví'])
    expect(records.slice(3)).toEqual([
      ['pronouns', true],
      ['nouns', true],
      ['sentences', true],
    ])
  })

  it('count only what a skipped sentence checked, and never complete it', () => {
    const { page, records } = pageOf([advokát, zdraví, pomáhat], dative)
    page.enter(0, 'toho')
    page.start()
    expect(records).toEqual([['pronouns', false]])
    expect(page.sentence?.noun).toBe('zdraví')
    expect(page.fields.map((field) => field.state)).toEqual(['open', 'open'])
  })
})

describe('the filter dialog', () => {
  it('ticks the 12 forms at first, every case but the vocative, singular and plural', () => {
    const { page } = pageOf([advokát, pomáhat])
    expect(page.filter).toEqual(new Set(TWELVE))
    page.openFilter()
    expect(page.filterDraft.ticked).toEqual(new Set(TWELVE))
  })

  it('offers the 12 forms: Select all ticks them, a column heading switches its 6, the vocative is not one of them', () => {
    const { page, saved } = pageOf([advokát, pomáhat, ...otherVerbs], dative)
    page.openFilter()
    page.filterDraft.selectAll()
    expect(page.filterDraft.ticked).toEqual(new Set(TWELVE))
    page.filterDraft.clearAll()
    page.filterDraft.toggleNumber('pl')
    expect(page.closeFilter()).toBe(true)
    expect(saved()).toEqual({ cells: ['nom-pl', 'gen-pl', 'dat-pl', 'acc-pl', 'loc-pl', 'ins-pl'] })
    expect(page.sentence).toMatchObject({ noun: 'advokát', caseId: 'gen', number: 'pl' })
  })

  it('applies the choice when it closes, saves it for the pool and starts a new sentence, if anything changed', () => {
    const { page, saved } = pageOf([advokát, zdraví, pomáhat, ...otherVerbs], dative)
    page.openFilter()
    page.filterDraft.toggleCase('dat')
    page.filterDraft.set('ins-sg', true)
    expect(page.closeFilter()).toBe(true)
    expect(saved()).toEqual({ cells: ['ins-sg'] })
    expect(page.sentence).toMatchObject({ noun: 'zdraví', caseId: 'ins', number: 'sg' })
  })

  it('reads back only the 12 forms of what was saved', () => {
    expect(pageOf([advokát, pomáhat], { cells: ['voc-sg', 'dat-pl'] }).page.filter).toEqual(new Set(['dat-pl']))
  })

  it('with nothing ticked, leaves nothing to ask for: no sentence, Check all disabled, Next sentence highlighted, nothing scored', () => {
    const { page, records, saved } = pageOf([advokát, pomáhat], dative)
    page.openFilter()
    page.filterDraft.clearAll()
    expect(page.closeFilter()).toBe(true)
    expect(saved()).toEqual({ cells: [] })
    expect(page.sentence).toBeUndefined()
    expect(page.fields).toEqual([])
    expect(page.complete).toBe(true)

    page.checkAll([])
    expect(page.enter(0, 'tomu')).toBeUndefined()
    expect(page.sentence).toBeUndefined()
    expect(records).toEqual([])
  })
})

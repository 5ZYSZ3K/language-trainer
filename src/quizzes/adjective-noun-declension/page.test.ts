import { afterEach, describe, expect, it, vi } from 'vitest'
import { cs as czechLanguage } from '../../languages/cs'
import type { CaseId } from '../noun-declension/cells'
import { allCells, cellsOfCase, cellsOfNumber } from '../noun-declension/filter'
import { ADJECTIVE_DECLENSION_GENERATORS } from './generators'
import type { AdjectiveNounItem, PairedNounItem } from './items'
import { createGoToNoun } from './mount'
import { SentencePage } from './page'
import { advokát, být, dívatSeNa, dveře, otherVerbs, pomáhat, seeded, zdraví } from './test-support'

// The page without its DOM: mount.ts draws what this model says and hands it every key press and click. Go to noun is
// driven through the go-to line mount.ts builds, on stand-ins for its elements.

const czech = ADJECTIVE_DECLENSION_GENERATORS.cs!
const dobrýAdvokát: PairedNounItem = { ...advokát, adjectives: ['dobrý'] }
const dítě: PairedNounItem = {
  kind: 'noun',
  prompt: 'dítě',
  gender: 's.',
  pluralGender: 'ž.',
  adjectives: ['malý'],
  cells: [{ id: 'nom-pl', acceptedForms: [{ value: 'děti' }] }],
}

/**
 * A page over `items` with `saved` settings. `random` is 0 unless given, so every draw takes the first choice there is:
 * the first noun (other than the one before), its first adjective, the first case with a ticked form, singular if it is
 * ticked and the noun has it, the first verb of the case, the 1st person.
 */
function pageOf(items: readonly AdjectiveNounItem[], saved?: unknown, random = () => 0) {
  const records: [string, boolean][] = []
  let settings = saved
  const page = new SentencePage({
    items,
    generator: czech,
    settings: { get: () => settings, set: (value) => (settings = value) },
    record: (meterId, correct) => void records.push([meterId, correct]),
    random,
  })
  page.start()
  return { page, records, saved: () => settings }
}
/** What the page saves for a filter with both forms of each of `caseIds` ticked, and nothing else. */
const saved = (...caseIds: CaseId[]) => ({ cells: caseIds.flatMap(cellsOfCase) })
const dative = saved('dat')

describe('a sentence', () => {
  it('shows the adjective and the noun in their base forms, the case and the number, and the verb form, capitalised', () => {
    const { page } = pageOf([dobrýAdvokát, pomáhat], dative)
    expect(page.sentence).toEqual({ adjective: 'dobrý', noun: 'advokát', caseId: 'dat', number: 'sg', lead: 'Pomáhám', end: '.' })
  })

  it('puts the preposition after the verb form, reflexive particle included', () => {
    const { page } = pageOf([dobrýAdvokát, dívatSeNa], saved('acc'))
    expect(page.sentence?.lead).toBe('Dívám se na')
  })

  it('in the nominative, puts to before být, which agrees with the noun: To je dobrý advokát, To jsou malé děti', () => {
    expect(pageOf([dobrýAdvokát, být], saved('nom')).page.sentence?.lead).toBe('To je')
    const { page } = pageOf([dítě, být], saved('nom'))
    expect(page.sentence).toMatchObject({ number: 'pl', lead: 'To jsou' })
    // děti agree in the feminine plural: malé, not malá.
    page.enter(0, 'malá')
    expect(page.fields[0]).toEqual({ state: 'wrong', acceptedForms: ['malé'] })
  })

  it('in the vocative, has no verb and ends with an exclamation mark', () => {
    const { page } = pageOf([dobrýAdvokát, pomáhat], saved('voc'))
    expect(page.sentence).toMatchObject({ caseId: 'voc', lead: '', end: '!' })
  })

  it('has two open fields, the adjective and the noun, whose accepted forms come from the generator and the noun’s cell', () => {
    const { page } = pageOf([dobrýAdvokát, pomáhat], dative)
    expect(page.fields.map((field) => field.state)).toEqual(['open', 'open'])
    page.checkAll(['', ''])
    expect(page.fields).toEqual([
      { state: 'wrong', acceptedForms: ['dobrému'] },
      { state: 'wrong', acceptedForms: ['advokátovi'] },
    ])
  })
})

describe('Enter', () => {
  it('checks the field it is in and moves to the next open one; once both are checked, it starts the next sentence', () => {
    const { page } = pageOf([dobrýAdvokát, zdraví, pomáhat], dative)
    expect(page.sentence?.noun).toBe('advokát')
    expect(page.enter(0, 'dobrému')).toBe(1)
    expect(page.fields[0]?.state).toBe('correct')
    expect(page.complete).toBe(false)

    expect(page.enter(1, 'advokátu')).toBeUndefined()
    expect(page.fields[1]).toEqual({ state: 'wrong', acceptedForms: ['advokátovi'] })
    expect(page.complete).toBe(true)

    expect(page.enter(1, 'advokátu')).toBe(0)
    expect(page.sentence?.noun).toBe('zdraví')
    expect(page.fields.map((field) => field.state)).toEqual(['open', 'open'])
  })

  it('in an empty field checks nothing and moves on to the next open field, or stays when there is none', () => {
    const { page, records } = pageOf([dobrýAdvokát, pomáhat], dative)
    expect(page.enter(0, '  ')).toBe(1)
    expect(page.fields[0]?.state).toBe('open')
    page.enter(0, 'dobrému')
    expect(page.enter(1, '')).toBe(1)
    expect(page.fields[1]?.state).toBe('open')
    expect(records).toEqual([['adjectives', true]])
  })

  it('in the noun field first, checks it and goes back to the adjective', () => {
    const { page } = pageOf([dobrýAdvokát, pomáhat], dative)
    expect(page.enter(1, 'advokátovi')).toBe(0)
    expect(page.fields.map((field) => field.state)).toEqual(['open', 'correct'])
  })
})

describe('the meters', () => {
  it('count each checked adjective and noun field, and each completed sentence, fully correct or not', () => {
    const { page, records } = pageOf([dobrýAdvokát, zdraví, pomáhat], dative)
    page.enter(0, 'Dobrému ')
    page.enter(1, 'advokátu')
    expect(records).toEqual([
      ['adjectives', true],
      ['nouns', false],
      ['sentences', false],
    ])
    page.start()
    page.enter(0, 'dobrému')
    page.enter(1, 'zdraví')
    expect(records.slice(3)).toEqual([
      ['adjectives', true],
      ['nouns', true],
      ['sentences', true],
    ])
  })

  it('count both fields with Check all, which counts an empty one as wrong, and complete the sentence', () => {
    const { page, records } = pageOf([dobrýAdvokát, pomáhat], dative)
    page.checkAll(['dobrému', ''])
    expect(records).toEqual([
      ['adjectives', true],
      ['nouns', false],
      ['sentences', false],
    ])
    expect(page.complete).toBe(true)
    page.checkAll(['dobrému', 'advokátovi'])
    expect(records).toHaveLength(3)
  })

  it('count only what a skipped sentence checked, and never complete it', () => {
    const { page, records } = pageOf([dobrýAdvokát, zdraví, pomáhat], dative)
    page.enter(0, 'dobrého')
    page.start()
    expect(records).toEqual([['adjectives', false]])
    expect(page.sentence?.noun).toBe('zdraví')
    expect(page.fields.map((field) => field.state)).toEqual(['open', 'open'])
  })
})

describe('Go to noun', () => {
  afterEach(() => vi.unstubAllGlobals())

  /**
   * The go-to line mount.ts puts on `page` (createGoToNoun), on stand-ins for its form, field and miss line: these tests
   * run without a DOM. `go` types a word into the field and presses Go.
   */
  function goToLineOf(page: SentencePage) {
    const field = { value: '', lang: '', focus: () => {}, addEventListener: () => {} }
    const missLine = {
      hidden: true,
      text: '',
      replaceChildren: (...parts: (string | { textContent: string })[]) => {
        missLine.text = parts.map((part) => (typeof part === 'string' ? part : part.textContent)).join('')
      },
    }
    const elements: Record<string, object> = { input: field, '.go-to-miss': missLine }
    let submit: ((event: { preventDefault(): void }) => void) | undefined
    const form = {
      innerHTML: '',
      querySelector: (selector: string) => elements[selector] ?? null,
      addEventListener: (type: string, listener: typeof submit) => void (type === 'submit' && (submit = listener)),
    }
    // The miss line puts the typed word in a <strong>.
    vi.stubGlobal('document', { createElement: () => ({ lang: '', textContent: '' }) })
    let opened = 0
    createGoToNoun(form as unknown as HTMLFormElement, page, czechLanguage, () => opened++)
    return {
      go(typed: string): void {
        field.value = typed
        submit!({ preventDefault: () => {} })
      },
      /** What is left in the field. */
      get field() {
        return field.value
      },
      /** The miss line, if it is shown. */
      get miss() {
        return missLine.hidden ? undefined : missLine.text
      },
      /** How many times a noun was opened and the page asked to draw it. */
      get opened() {
        return opened
      },
    }
  }

  it('opens a listed noun by its prompt, forgiving case and spaces, and draws the rest as a random round would', () => {
    // A random sentence after advokát would be on zdraví.
    const { page } = pageOf([dobrýAdvokát, zdraví, dveře, pomáhat], dative)
    const line = goToLineOf(page)
    expect(page.sentence?.noun).toBe('advokát')
    line.go(' Dveře ')
    expect(page.sentence).toEqual({ adjective: 'dřevěný', noun: 'dveře', caseId: 'dat', number: 'pl', lead: 'Pomáhám', end: '.' })
    expect(page.fields.map((field) => field.state)).toEqual(['open', 'open'])
    expect(line).toMatchObject({ field: '', miss: undefined, opened: 1 })
  })

  it('refuses a word that is not a noun of the pool (another word, a missing diacritic, a governing verb), says so and keeps it in the field', () => {
    const { page, records } = pageOf([dobrýAdvokát, dveře, pomáhat], dative)
    const line = goToLineOf(page)
    page.enter(0, 'dobrému')
    for (const typed of ['stůl', 'dvere', 'advokáti', 'pomáhat']) {
      line.go(typed)
      expect(line).toMatchObject({ field: typed, miss: `No noun “${typed}” in this list.` })
    }
    // An empty field is not looked up at all.
    line.go('  ')
    expect(line).toMatchObject({ field: '  ', miss: 'No noun “pomáhat” in this list.', opened: 0 })
    // The sentence on the page stays as it was, its checked field included.
    expect(page.sentence?.noun).toBe('advokát')
    expect(page.fields.map((field) => field.state)).toEqual(['correct', 'open'])
    expect(records).toEqual([['adjectives', true]])
    // A word it then finds clears the miss line.
    line.go('dveře')
    expect(line).toMatchObject({ field: '', miss: undefined, opened: 1 })
  })

  it('asks only for a form the filter has ticked and the noun has, a case and a number, as a random round would', () => {
    const { page } = pageOf([dobrýAdvokát, dveře, pomáhat, ...otherVerbs], { cells: ['gen-sg', 'gen-pl', 'ins-pl'] }, seeded(1))
    const line = goToLineOf(page)
    const formsOpened = (typed: string) =>
      new Set(Array.from({ length: 200 }, () => (line.go(typed), `${page.sentence!.caseId}-${page.sentence!.number}`)))
    expect(formsOpened('advokát')).toEqual(new Set(['gen-sg', 'gen-pl', 'ins-pl']))
    expect(formsOpened('dveře')).toEqual(new Set(['gen-pl', 'ins-pl']))
  })

  it('opens a noun none of whose forms is ticked with nothing to ask for, and scores nothing', () => {
    // Only singular forms are ticked, and dveře has none: advokát still has something to ask.
    const { page, records } = pageOf([dobrýAdvokát, dveře, pomáhat], { cells: cellsOfNumber('sg') })
    const line = goToLineOf(page)
    expect(page.sentence?.noun).toBe('advokát')
    line.go('dveře')
    expect(line).toMatchObject({ field: '', miss: undefined, opened: 1 })
    expect(page.sentence).toBeUndefined()
    expect(page.fields).toEqual([])
    expect(page.complete).toBe(true)
    page.checkAll([])
    expect(records).toEqual([])
  })

  it('with nothing ticked at all, opens any noun with nothing to ask for', () => {
    const { page, records } = pageOf([dobrýAdvokát, dveře, pomáhat], { cells: [] })
    const line = goToLineOf(page)
    line.go('advokát')
    expect(line).toMatchObject({ field: '', miss: undefined, opened: 1 })
    expect(page.sentence).toBeUndefined()
    expect(page.complete).toBe(true)
    expect(records).toEqual([])
  })

  it('scores the sentence it opens the same as a random one', () => {
    const { page, records } = pageOf([dobrýAdvokát, zdraví, dveře, pomáhat], dative)
    goToLineOf(page).go('dveře')
    page.enter(0, 'dřevěným')
    page.enter(1, 'dveřím')
    expect(records).toEqual([
      ['adjectives', true],
      ['nouns', true],
      ['sentences', true],
    ])
  })

  it('opens even the noun on the page, and after it the next sentence goes back to random nouns', () => {
    const { page } = pageOf([dobrýAdvokát, zdraví, dveře, pomáhat], dative)
    const line = goToLineOf(page)
    line.go('advokát')
    expect(page.sentence?.noun).toBe('advokát')
    line.go('dveře')
    // Next: a random noun again, other than the one opened (random 0 takes the first of the rest).
    page.start()
    expect(page.sentence?.noun).toBe('advokát')
    page.start()
    expect(page.sentence?.noun).toBe('zdraví')
  })
})

describe('the filter dialog', () => {
  it('opens on the saved filter of forms, a case and a number each', () => {
    const { page } = pageOf([dobrýAdvokát, pomáhat], { cells: ['dat-pl', 'ins-sg'] })
    expect(page.filter).toEqual(new Set(['dat-pl', 'ins-sg']))
    page.openFilter()
    expect(page.filterDraft.ticked).toEqual(new Set(['dat-pl', 'ins-sg']))
  })

  it('ticks every form when nothing is saved, or what an older build saved (its filter of cases, never published)', () => {
    for (const value of [undefined, { cases: ['dat', 'ins'] }, { cases: [] }]) {
      const { page } = pageOf([dobrýAdvokát, pomáhat], value)
      expect(page.filter, JSON.stringify(value)).toEqual(allCells())
      page.openFilter()
      expect(page.filterDraft.ticked, JSON.stringify(value)).toEqual(allCells())
    }
  })

  it('asks only for the number the filter ticks: with only the dative plural, Pomáhám dobrým advokátům', () => {
    const { page } = pageOf([dobrýAdvokát, pomáhat], { cells: ['dat-pl'] })
    expect(page.sentence).toMatchObject({ caseId: 'dat', number: 'pl', lead: 'Pomáhám' })
    page.checkAll(['', ''])
    expect(page.fields.map((field) => field.acceptedForms)).toEqual([['dobrým'], ['advokátům']])
  })

  it('applies the choice when it closes, saves it for the pool and starts a new sentence, if anything changed', () => {
    const { page, saved } = pageOf([dobrýAdvokát, zdraví, pomáhat, ...otherVerbs], dative)
    page.openFilter()
    page.filterDraft.toggleCase('dat')
    page.filterDraft.set('ins-sg', true)
    expect(page.closeFilter()).toBe(true)
    expect(saved()).toEqual({ cells: ['ins-sg'] })
    expect(page.sentence).toMatchObject({ noun: 'zdraví', caseId: 'ins', number: 'sg', lead: 'Ins1sg' })
  })

  it('saves a column the same way: the forms of a number, in display order', () => {
    const { page, saved } = pageOf([dobrýAdvokát, zdraví, pomáhat, ...otherVerbs], dative)
    page.openFilter()
    page.filterDraft.clearAll()
    page.filterDraft.toggleNumber('pl')
    expect(page.closeFilter()).toBe(true)
    expect(saved()).toEqual({ cells: ['nom-pl', 'gen-pl', 'dat-pl', 'acc-pl', 'voc-pl', 'loc-pl', 'ins-pl'] })
    // zdraví has no plural, so only advokát is left to ask, in the genitive plural (no verb is followed by the nominative here).
    expect(page.sentence).toMatchObject({ noun: 'advokát', caseId: 'gen', number: 'pl' })
  })

  it('changes nothing when it closes with the same ticks', () => {
    const { page, saved } = pageOf([dobrýAdvokát, zdraví, pomáhat], dative)
    page.enter(0, 'dobrému')
    page.openFilter()
    page.filterDraft.selectAll()
    page.filterDraft.clearAll()
    page.filterDraft.set('dat-pl', true)
    page.filterDraft.set('dat-sg', true)
    expect(page.closeFilter()).toBe(false)
    expect(saved()).toEqual(dative)
    expect(page.sentence?.noun).toBe('advokát')
    expect(page.fields[0]?.state).toBe('correct')
  })

  it('with nothing ticked, leaves nothing to ask for: no sentence, Check all disabled, Next sentence highlighted, nothing scored', () => {
    const { page, records, saved } = pageOf([dobrýAdvokát, pomáhat], dative)
    page.openFilter()
    page.filterDraft.clearAll()
    expect(page.closeFilter()).toBe(true)
    expect(saved()).toEqual({ cells: [] })
    expect(page.sentence).toBeUndefined()
    expect(page.fields).toEqual([])
    expect(page.complete).toBe(true)

    page.checkAll([])
    expect(page.enter(0, 'dobrému')).toBeUndefined()
    page.start()
    expect(page.sentence).toBeUndefined()
    expect(records).toEqual([])
  })

  it('with only forms no noun has ticked, leaves nothing to ask for either, and scores nothing', () => {
    const { page, records } = pageOf([zdraví, pomáhat], dative)
    page.openFilter()
    page.filterDraft.clearAll()
    page.filterDraft.toggleNumber('pl')
    expect(page.closeFilter()).toBe(true)
    expect(page.sentence).toBeUndefined()
    expect(page.complete).toBe(true)
    page.checkAll([])
    expect(records).toEqual([])
  })

  it('with nothing ticked saved for the pool, starts with nothing to ask for', () => {
    expect(pageOf([dobrýAdvokát, pomáhat], { cells: [] }).page.sentence).toBeUndefined()
  })
})

import { describe, expect, it } from 'vitest'
import type { Language } from './languages'
import type { QuizType } from './quizzes'
import { defaultPool, select, type Registries } from './selection'
import type { Source } from './sources'

const language = (id: string): Language => ({
  id,
  htmlLang: id,
  specialChars: [],
  shortcuts: {},
  texts: { en: { name: id, shortcutHelp: [] }, cs: { name: id, shortcutHelp: [] } },
})

const quiz = (id: string): QuizType<unknown> => ({
  id,
  contract: { validateItem: () => [], keyOf: () => '' },
  meters: [],
})

type Provides = [language: string, quizType: string]
const source = (id: string, trust: Source['trust'], provides: Provides[], name = id): Source => ({
  id,
  name,
  url: `https://${id}.example/`,
  trust,
  provides: provides.map(([lang, quizType]) => ({ language: lang, quizType, delivery: { kind: 'bundled' } })),
})

const registries = (sources: Source[], languages = ['cs', 'de'], quizTypes = ['verbs', 'nouns']): Registries => ({
  languages: languages.map(language),
  sources,
  quizTypes: quizTypes.map(quiz),
})

const ids = (list: readonly { id: string }[] | undefined) => list?.map((item) => item.id)
const quizIds = (quizzes: readonly { quizType: { id: string } }[] | undefined) => quizzes?.map((q) => q.quizType.id)

describe('select: languages', () => {
  it('lists the languages that at least one source provides something for, in registry order', () => {
    const r = registries([source('a', 'trusted', [['de', 'verbs']]), source('b', 'trusted', [['cs', 'verbs']])], ['cs', 'de', 'fr'])
    expect(ids(select(r, { language: 'cs', includeOtherSources: false }).languages)).toEqual(['cs', 'de'])
  })

  it('does not list a language nothing is provided for, nor one a source names but the registry lacks', () => {
    const r = registries([source('a', 'trusted', [['cs', 'verbs'], ['xx', 'verbs']])], ['cs', 'de'])
    expect(ids(select(r, { language: 'cs', includeOtherSources: false }).languages)).toEqual(['cs'])
  })

  it('offers nothing for a language that is not available', () => {
    const r = registries([source('a', 'trusted', [['cs', 'verbs']])])
    const view = select(r, { language: 'de', includeOtherSources: true })
    expect(view.language).toBeUndefined()
    expect(view.sources).toEqual([])
    expect(view.selected).toBeUndefined()
    expect(view.others).toEqual([])
  })

  it('reports the chosen language', () => {
    const r = registries([source('a', 'trusted', [['cs', 'verbs'], ['de', 'verbs']])])
    expect(select(r, { language: 'de', includeOtherSources: false }).language?.id).toBe('de')
  })
})

describe('select: sources', () => {
  const r = registries([
    source('s-z', 'trusted', [['cs', 'verbs']], 'Zeta'),
    source('s-u', 'unverified', [['cs', 'verbs']], 'Alpha'),
    source('s-a', 'trusted', [['cs', 'nouns']], 'Beta'),
    source('s-de', 'trusted', [['de', 'verbs']], 'Aardvark'),
  ])
  const state = { language: 'cs', includeOtherSources: false }

  it('lists every source with something for the language: trusted first, then by name', () => {
    expect(ids(select(r, state).sources.map((s) => s.source))).toEqual(['s-a', 's-z', 's-u'])
  })

  it('lists untrusted sources rather than hiding them', () => {
    expect(select(r, state).sources.find((s) => s.source.id === 's-u')?.source.trust).toBe('unverified')
  })

  it('selects the first trusted source of the list when none is chosen', () => {
    expect(select(r, state).selected?.source.id).toBe('s-a')
  })

  it('selects the source that was chosen, trusted or not', () => {
    expect(select(r, { ...state, sourceId: 's-u' }).selected?.source.id).toBe('s-u')
    expect(select(r, { ...state, sourceId: 's-z' }).selected?.source.id).toBe('s-z')
  })

  it('falls back to the default when the chosen source has nothing for the language', () => {
    expect(select(r, { ...state, sourceId: 's-de' }).selected?.source.id).toBe('s-a')
    expect(select(r, { ...state, sourceId: 'nope' }).selected?.source.id).toBe('s-a')
  })

  it('selects nothing when no source is trusted, and the user must choose', () => {
    const untrusted = registries([source('x', 'unverified', [['cs', 'verbs']]), source('y', 'unverified', [['cs', 'nouns']])])
    const view = select(untrusted, state)
    expect(ids(view.sources.map((s) => s.source))).toEqual(['x', 'y'])
    expect(view.selected).toBeUndefined()
    expect(select(untrusted, { ...state, sourceId: 'y' }).selected?.source.id).toBe('y')
  })

  it('changes the quizzes with the source', () => {
    expect(quizIds(select(r, { ...state, sourceId: 's-z' }).selected?.quizzes)).toEqual(['verbs'])
    expect(quizIds(select(r, { ...state, sourceId: 's-a' }).selected?.quizzes)).toEqual(['nouns'])
  })
})

describe('select: quizzes', () => {
  it('offers exactly the quiz types the source provides for the language, in registry order', () => {
    const r = registries([source('a', 'trusted', [['cs', 'nouns'], ['cs', 'verbs'], ['de', 'nouns']])], ['cs', 'de'], ['verbs', 'nouns', 'cases'])
    expect(quizIds(select(r, { language: 'cs', includeOtherSources: false }).selected?.quizzes)).toEqual(['verbs', 'nouns'])
    expect(quizIds(select(r, { language: 'de', includeOtherSources: false }).selected?.quizzes)).toEqual(['nouns'])
  })

  it('skips a quiz type the registry does not know', () => {
    const r = registries([source('a', 'trusted', [['cs', 'verbs'], ['cs', 'ghost']])])
    expect(quizIds(select(r, { language: 'cs', includeOtherSources: false }).selected?.quizzes)).toEqual(['verbs'])
  })

  it('describes each quiz as a pool of one source', () => {
    const r = registries([source('a', 'trusted', [['cs', 'verbs']])])
    expect(select(r, { language: 'cs', includeOtherSources: false }).selected?.quizzes).toEqual([
      expect.objectContaining({ pool: { language: 'cs', source: 'a', quizType: 'verbs' } }),
    ])
  })
})

describe('select: other sources', () => {
  const r = registries([
    source('main', 'trusted', [['cs', 'verbs']], 'Main'),
    source('extra', 'unverified', [['cs', 'verbs'], ['cs', 'nouns']], 'Extra'),
    source('other', 'trusted', [['cs', 'nouns']], 'Other'),
    source('foreign', 'trusted', [['de', 'verbs']], 'Foreign'),
  ])
  const state = { language: 'cs', sourceId: 'main', includeOtherSources: false }

  it('shows none by default', () => {
    expect(select(r, state).others).toEqual([])
  })

  it('when opted in, adds the other sources grouped by source, trusted first, never the selected one', () => {
    const { others } = select(r, { ...state, includeOtherSources: true })
    expect(others.map((group) => group.source.id)).toEqual(['other', 'extra'])
    expect(others.map((group) => quizIds(group.quizzes))).toEqual([['nouns'], ['verbs', 'nouns']])
  })

  it('keeps every entry a single-source pool, also for the same quiz type from another source', () => {
    const { selected, others } = select(r, { ...state, includeOtherSources: true })
    const pools = [selected, ...others].flatMap((group) => group!.quizzes.map((q) => q.pool))
    const verbPools = pools.filter((pool) => pool.quizType === 'verbs')
    expect(verbPools).toEqual([
      { language: 'cs', source: 'main', quizType: 'verbs' },
      { language: 'cs', source: 'extra', quizType: 'verbs' },
    ])
    for (const group of [selected!, ...others]) {
      expect(new Set(group.quizzes.map((q) => q.pool.source))).toEqual(new Set([group.source.id]))
    }
  })

  it('lists every source as an other one when none is selected', () => {
    const untrusted = registries([source('x', 'unverified', [['cs', 'verbs']]), source('y', 'unverified', [['cs', 'nouns']])])
    const view = select(untrusted, { language: 'cs', includeOtherSources: true })
    expect(view.selected).toBeUndefined()
    expect(view.others.map((group) => group.source.id)).toEqual(['x', 'y'])
  })
})

describe('defaultPool', () => {
  it("is the first available language's default source's first quiz", () => {
    const r = registries(
      [
        source('late', 'trusted', [['de', 'nouns']], 'Zed'),
        source('prime', 'trusted', [['cs', 'nouns'], ['cs', 'verbs']], 'Prime'),
        source('shady', 'unverified', [['cs', 'verbs']], 'Aaa'),
      ],
      ['de', 'cs'],
    )
    expect(defaultPool(r)).toEqual({ language: 'de', source: 'late', quizType: 'nouns' })
    expect(defaultPool({ ...r, languages: [language('cs'), language('de')] })).toEqual({ language: 'cs', source: 'prime', quizType: 'verbs' })
  })

  it('is undefined when nothing is provided, or when no source is trusted', () => {
    expect(defaultPool(registries([]))).toBeUndefined()
    expect(defaultPool(registries([source('x', 'unverified', [['cs', 'verbs']])]))).toBeUndefined()
  })
})

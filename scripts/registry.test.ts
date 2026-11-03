// Lives in scripts/ rather than src/: it checks the scraper's adapters too, which src/ must never import.
import { describe, expect, it } from 'vitest'
import { loadDataset } from '../src/datasets/load'
import { poolKey, type Pool } from '../src/datasets/pool'
import { LANGUAGES } from '../src/languages'
import { QUIZ_TYPES } from '../src/quizzes'
import { defaultPool } from '../src/selection'
import { SOURCES, type Source } from '../src/sources'
import { ADAPTERS, SCRAPER_SOURCES } from '../scraper/harness/registry'

const duplicates = (values: string[]) => values.filter((value, i) => values.indexOf(value) !== i)

describe('registries', () => {
  it('have unique ids', () => {
    expect(duplicates(LANGUAGES.map((l) => l.id))).toEqual([])
    expect(duplicates(SOURCES.map((s) => s.id))).toEqual([])
    expect(duplicates(QUIZ_TYPES.map((q) => q.id))).toEqual([])
  })

  it('give each quiz type unique meter ids', () => {
    for (const quizType of QUIZ_TYPES) expect(duplicates(quizType.meters.map((m) => m.id)), quizType.id).toEqual([])
  })

  it('have every provides entry name an existing language and quiz type', () => {
    const languageIds = new Set(LANGUAGES.map((l) => l.id))
    const quizTypeIds = new Set(QUIZ_TYPES.map((q) => q.id))
    for (const source of SOURCES) {
      for (const { language, quizType } of source.provides) {
        expect(languageIds.has(language), `${source.id} provides unknown language ${language}`).toBe(true)
        expect(quizTypeIds.has(quizType), `${source.id} provides unknown quiz type ${quizType}`).toBe(true)
      }
    }
  })

  it('give a source at most one dataset per language and quiz type', () => {
    for (const source of SOURCES) {
      expect(duplicates(source.provides.map((p) => `${p.language}/${p.quizType}`)), source.id).toEqual([])
    }
  })

  it('use ids that are safe as folder and file names', () => {
    const safe = /^[a-z0-9]+(-[a-z0-9]+)*$/
    for (const id of [...LANGUAGES, ...SOURCES, ...QUIZ_TYPES].map((entry) => entry.id)) expect(id).toMatch(safe)
  })

  it('open the page on a pool that exists', () => {
    const pool = defaultPool({ languages: LANGUAGES, sources: SOURCES, quizTypes: QUIZ_TYPES })
    expect(pool).toEqual({ language: 'cs', source: 'prirucka', quizType: 'verb-present-tense' })
  })
})

describe('scraper registry', () => {
  /** The pool of one `provides` entry of a source. */
  const poolOf = (source: Source, entry: Source['provides'][number]): Pool => ({
    language: entry.language,
    source: source.id,
    quizType: entry.quizType,
  })

  it('has every non-manual provides entry produced by an adapter, and every adapter by a provides entry', () => {
    const provided = SOURCES.flatMap((source) => source.provides.filter((entry) => !entry.manual).map((entry) => poolKey(poolOf(source, entry))))
    const adapted = ADAPTERS.map(poolKey)
    expect(provided.filter((entry) => !adapted.includes(entry)), 'provided without an adapter').toEqual([])
    const declared = SOURCES.flatMap((source) => source.provides.map((entry) => poolKey(poolOf(source, entry))))
    expect(adapted.filter((entry) => !declared.includes(entry)), 'adapters without a provides entry').toEqual([])
  })

  it('has one adapter per dataset, and each one in its own source', () => {
    expect(duplicates(ADAPTERS.map(poolKey))).toEqual([])
    for (const source of SCRAPER_SOURCES) {
      for (const adapter of source.adapters) expect(adapter.source, source.id).toBe(source.id)
    }
  })

  it('has a request policy for registered sources only, once each', () => {
    const sourceIds = SOURCES.map((s) => s.id)
    expect(SCRAPER_SOURCES.map((s) => s.id).filter((id) => !sourceIds.includes(id))).toEqual([])
    expect(duplicates(SCRAPER_SOURCES.map((s) => s.id))).toEqual([])
  })
})

describe('data delivery', () => {
  it('has no source that uses a delivery kind without a loader', () => {
    for (const source of SOURCES) {
      for (const { language, quizType, delivery } of source.provides) {
        expect(delivery.kind, `${source.id} ${language}/${quizType}`).toBe('bundled')
      }
    }
  })

  it('bundles a dataset file for every provided pool, which the loader finds', async () => {
    for (const source of SOURCES) {
      for (const { language, quizType } of source.provides) {
        const pool = { language, source: source.id, quizType }
        const data = await loadDataset(pool)
        expect({ language: data.language, source: data.source, quizType: data.quizType }, poolKey(pool)).toEqual(pool)
        expect(data.items.length, poolKey(pool)).toBeGreaterThan(0)
      }
    }
  })
})

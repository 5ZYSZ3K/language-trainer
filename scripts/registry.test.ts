// Lives in scripts/ rather than src/: step 8 extends it with the scraper's adapters, which src/ must never import.
import { describe, expect, it } from 'vitest'
import { LANGUAGES } from '../src/languages'
import { QUIZ_TYPES } from '../src/quizzes'
import { defaultPool } from '../src/selection'
import { SOURCES } from '../src/sources'

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

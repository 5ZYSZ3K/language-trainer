import { describe, expect, it } from 'vitest'
import { datasetPath, POOL_FIELDS, poolKey, type Pool } from './pool'

describe('poolKey', () => {
  it('joins language, source and quiz type with slashes', () => {
    expect(poolKey({ language: 'cs', source: 'prirucka', quizType: 'verb-present-tense' })).toBe('cs/prirucka/verb-present-tense')
  })

  it('tells pools apart that differ in one part only', () => {
    const base = { language: 'cs', source: 'prirucka', quizType: 'verb-present-tense' }
    const keys = [base, { ...base, language: 'de' }, { ...base, source: 'other' }, { ...base, quizType: 'noun-cases' }].map(poolKey)
    expect(new Set(keys).size).toBe(4)
  })
})

describe('POOL_FIELDS', () => {
  it('lists every field of a pool, in the order a dataset file writes them in its envelope', () => {
    const pool: Pool = { language: 'cs', source: 'prirucka', quizType: 'verb-present-tense' }
    expect(POOL_FIELDS).toEqual(['language', 'source', 'quizType'])
    expect([...POOL_FIELDS].sort()).toEqual(Object.keys(pool).sort())
  })
})

describe('datasetPath', () => {
  it('is where the pool\'s dataset lies under data/', () => {
    expect(datasetPath({ language: 'cs', source: 'prirucka', quizType: 'verb-present-tense' })).toBe('cs/prirucka/verb-present-tense.json')
  })
})

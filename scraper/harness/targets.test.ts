import { describe, expect, it } from 'vitest'
import type { Adapter } from './context'
import { selectTargets, targetName } from './targets'

const adapter = (source: string, language: string, quizType: string): Adapter => ({
  source,
  language,
  quizType,
  run: async () => ({ items: [], failures: [] }),
})

const a = adapter('prirucka', 'cs', 'verb-present-tense')
const b = adapter('prirucka', 'cs', 'noun-cases')
const c = adapter('dictionary', 'de', 'verb-present-tense')
const ids = (result: ReturnType<typeof selectTargets>) => ('targets' in result ? result.targets.map(targetName) : result)

describe('targetName', () => {
  it('names source, language and quiz type', () => {
    expect(targetName(a)).toBe('prirucka / cs / verb-present-tense')
  })
})

describe('selectTargets', () => {
  it('runs the only adapter when no filter is given', () => {
    expect(ids(selectTargets([a], {}))).toEqual([targetName(a)])
  })

  it('refuses to pick when no filter is given and several adapters exist, listing them', () => {
    const result = selectTargets([a, b, c], {})
    expect(result).toEqual({ error: expect.stringContaining('--source') })
    const { error } = result as { error: string }
    for (const target of [a, b, c]) expect(error).toContain(targetName(target))
  })

  it('narrows by source, language and quiz type, keeping registry order', () => {
    expect(ids(selectTargets([a, b, c], { source: 'prirucka' }))).toEqual([targetName(a), targetName(b)])
    expect(ids(selectTargets([a, b, c], { quizType: 'verb-present-tense' }))).toEqual([targetName(a), targetName(c)])
    expect(ids(selectTargets([a, b, c], { language: 'de' }))).toEqual([targetName(c)])
    expect(ids(selectTargets([a, b, c], { source: 'prirucka', quizType: 'noun-cases' }))).toEqual([targetName(b)])
  })

  it('fails when a filter matches nothing, naming the filter and the targets that exist', () => {
    const result = selectTargets([a], { source: 'nope' })
    expect(result).toEqual({ error: expect.stringContaining('--source nope') })
    expect((result as { error: string }).error).toContain(targetName(a))
  })

  it('fails when no adapter is registered at all', () => {
    expect(selectTargets([], {})).toEqual({ error: expect.stringMatching(/no scrape target/i) })
  })
})

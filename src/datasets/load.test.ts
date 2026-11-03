import { describe, expect, it, vi } from 'vitest'
import type { ExerciseData } from '../core/cell'
import type { Source } from '../sources'
import { loadDataset } from './load'

const pool = { language: 'cs', source: 'prirucka', quizType: 'verb-present-tense' }
const dataset: ExerciseData = { ...pool, items: [{ prompt: 'být', cells: [{ id: '1sg', acceptedForms: ['jsem'] }] }] }

const sourceWith = (delivery: Source['provides'][number]['delivery']): Source => ({
  id: 'prirucka',
  name: 'Příručka',
  url: 'https://example.test/',
  trust: 'trusted',
  provides: [{ language: 'cs', quizType: 'verb-present-tense', delivery }],
})
const bundled = sourceWith({ kind: 'bundled' })

describe('loadDataset', () => {
  it('returns the dataset file of a bundled pool', async () => {
    const modules = { '/data/cs/prirucka/verb-present-tense.json': async () => dataset }
    expect(await loadDataset(pool, modules, [bundled])).toEqual(dataset)
  })

  it('loads only the file of the requested pool', async () => {
    const other = vi.fn(async () => ({ ...dataset, quizType: 'noun-cases' }))
    const modules = {
      '/data/cs/prirucka/noun-cases.json': other,
      '/data/cs/prirucka/verb-present-tense.json': async () => dataset,
    }
    await loadDataset(pool, modules, [bundled])
    expect(other).not.toHaveBeenCalled()
  })

  it('rejects a github delivery with a clear error, since no loader for it exists', async () => {
    const load = vi.fn(async () => dataset)
    const modules = { '/data/cs/prirucka/verb-present-tense.json': load }
    await expect(loadDataset(pool, modules, [sourceWith({ kind: 'github' })])).rejects.toThrow(/github delivery is not implemented/)
    expect(load).not.toHaveBeenCalled()
  })

  it('rejects a pool that no source provides', async () => {
    const modules = { '/data/cs/other/verb-present-tense.json': async () => dataset }
    await expect(loadDataset({ ...pool, source: 'other' }, modules, [bundled])).rejects.toThrow(/cs\/other\/verb-present-tense/)
  })

  it('rejects when the bundle holds no file for a provided pool, naming the file', async () => {
    await expect(loadDataset(pool, {}, [bundled])).rejects.toThrow(/data\/cs\/prirucka\/verb-present-tense\.json/)
  })
})

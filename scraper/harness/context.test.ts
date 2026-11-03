import { mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { Contract } from '../../src/core/contract'
import { createRunContext } from './context'
import { serialise, type DataTarget } from './data-file'

let dir: string
beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'context-'))
})
afterEach(async () => {
  await rm(dir, { recursive: true, force: true })
})

interface Word {
  word: string
}
const contract: Contract<Word> = {
  validateItem: (value) => ((value as Word).word === '' ? ['empty word'] : []),
  keyOf: (item) => item.word,
}
const target: DataTarget = { language: 'cs', source: 'test', quizType: 'words' }

async function open(overrides: { force?: boolean; pauseMs?: number; failCooldownMs?: number } = {}) {
  const lines: string[] = []
  const dataFile = join(dir, 'data', 'cs', 'test', 'words.json')
  const run = await createRunContext<Word>({
    target,
    contract,
    dataFile,
    tmpFile: join(dir, '.tmp'),
    listsDir: join(dir, 'lists'),
    force: overrides.force ?? false,
    failCooldownMs: overrides.failCooldownMs ?? 0,
    pauseMs: overrides.pauseMs ?? 1500,
    get: async () => '',
    log: (message) => void lines.push(message),
  })
  return { ...run, dataFile, lines }
}

describe('createRunContext', () => {
  it('starts from the items already in the data file', async () => {
    await (await open()).context.save([{ word: 'a' }])
    const { context } = await open({ force: true })
    expect(context.existing).toEqual([{ word: 'a' }])
    expect(context.force).toBe(true)
  })

  it('starts from nothing when there is no data file yet', async () => {
    expect((await open()).context.existing).toEqual([])
  })

  it('save writes the whole data file with its envelope, leaving no temporary file', async () => {
    const { context, dataFile } = await open()
    await context.save([{ word: 'a' }, { word: 'b' }])
    expect(await readFile(dataFile, 'utf8')).toBe(serialise({ ...target, items: [{ word: 'a' }, { word: 'b' }] }))
    expect(await readdir(dir)).toEqual(['data'])
  })

  it('save validates every item against the contract and writes nothing when one breaks it', async () => {
    const { context, dataFile } = await open()
    await context.save([{ word: 'a' }])
    await expect(context.save([{ word: 'a' }, { word: '' }])).rejects.toThrow('item 2 breaks the contract: empty word')
    expect(JSON.parse(await readFile(dataFile, 'utf8')).items).toEqual([{ word: 'a' }])
  })

  it('save refuses two items with the same key', async () => {
    const { context } = await open()
    await expect(context.save([{ word: 'a' }, { word: 'a' }])).rejects.toThrow('"a" appears twice')
  })

  it('keeps track of the plan and of what is saved, for the interrupt message', async () => {
    const { context, progress } = await open()
    expect(progress).toEqual({ total: undefined, saved: 0 })
    context.planned(5, 2)
    expect(progress).toEqual({ total: 5, saved: 2 })
    await context.save([{ word: 'a' }, { word: 'b' }, { word: 'c' }])
    expect(progress).toEqual({ total: 5, saved: 3 })
  })

  it('says what pause is in use once the adapter has planned the run, and nothing before', async () => {
    const { context, lines } = await open({ pauseMs: 2500 })
    expect(lines).toEqual([])
    context.planned(5, 2)
    expect(lines).toEqual(['Pausing 2500 ms after each request.'])
  })

  it('also says how it cools down after a failed fetch, when --fail-cooldown is on', async () => {
    const { context, lines } = await open({ pauseMs: 0, failCooldownMs: 90_000 })
    context.planned(1, 0)
    expect(lines).toEqual([
      'Pausing 0 ms after each request.',
      'After an item fails to fetch: cooling down for 90 s, then trying it again.',
    ])
  })

  it('throws on a data file that is not valid JSON', async () => {
    const { context, dataFile } = await open()
    await context.save([])
    await writeFile(dataFile, '{"items":[')
    await expect(open()).rejects.toThrow()
  })
})

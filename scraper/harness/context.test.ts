import { access, mkdir, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { Contract } from '../../src/core/contract'
import { createRunContext } from './context'
import { serialise, type DataTarget } from './data-file'
import { NO_SOURCE_MATERIAL, sideFilesIn, type SourceMaterial } from './source-material'

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
/** What an adapter that keeps no source material hands over. */
const none = NO_SOURCE_MATERIAL

async function open(overrides: { force?: boolean; pauseMs?: number; failCooldownMs?: number } = {}) {
  const lines: string[] = []
  const dataFile = join(dir, 'data', 'cs', 'test', 'words.json')
  const run = await createRunContext<Word>({
    target,
    contract,
    dataFile,
    sideFiles: sideFilesIn(join(dir, 'source-material'), target),
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
    await (await open()).context.save([{ word: 'a' }], none)
    const { context } = await open({ force: true })
    expect(context.existing).toEqual([{ word: 'a' }])
    expect(context.force).toBe(true)
  })

  it('starts from nothing when there is no data file yet', async () => {
    expect((await open()).context.existing).toEqual([])
  })

  it('save writes the whole data file with its envelope, leaving no temporary file', async () => {
    const { context, dataFile } = await open()
    await context.save([{ word: 'a' }, { word: 'b' }], none)
    expect(await readFile(dataFile, 'utf8')).toBe(await serialise({ ...target, items: [{ word: 'a' }, { word: 'b' }] }))
    expect(await readdir(dir)).toEqual(['data'])
  })

  it('save validates every item against the contract and writes nothing when one breaks it', async () => {
    const { context, dataFile } = await open()
    await context.save([{ word: 'a' }], none)
    await expect(context.save([{ word: 'a' }, { word: '' }], none)).rejects.toThrow('item 2 breaks the contract: empty word')
    expect(JSON.parse(await readFile(dataFile, 'utf8')).items).toEqual([{ word: 'a' }])
  })

  it('save refuses two items with the same key', async () => {
    const { context } = await open()
    await expect(context.save([{ word: 'a' }, { word: 'a' }], none)).rejects.toThrow('"a" appears twice')
  })

  it('keeps track of the plan and of what is saved, for the interrupt message', async () => {
    const { context, progress } = await open()
    expect(progress).toEqual({ total: undefined, saved: 0 })
    context.planned(5, 2)
    expect(progress).toEqual({ total: 5, saved: 2 })
    await context.save([{ word: 'a' }, { word: 'b' }, { word: 'c' }], none)
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
    await context.save([], none)
    await writeFile(dataFile, '{"items":[')
    await expect(open()).rejects.toThrow()
  })
})

describe('createRunContext: the side files', () => {
  const sideFiles = () => ({
    sourceMaterial: join(dir, 'source-material', 'cs', 'test', 'words.json'),
    dictionaries: join(dir, 'source-material', 'cs', 'test', 'words.dictionaries.json'),
  })
  const dataFile = () => join(dir, 'data', 'cs', 'test', 'words.json')

  async function openWithSideFiles(forTarget: DataTarget = target) {
    return createRunContext<Word>({
      target: forTarget,
      contract,
      dataFile: dataFile(),
      sideFiles: sideFiles(),
      tmpFile: join(dir, '.tmp'),
      listsDir: join(dir, 'lists'),
      force: false,
      failCooldownMs: 0,
      pauseMs: 0,
      get: async () => '',
      log: () => {},
    })
  }

  const materialOf = (...words: string[]): SourceMaterial => ({
    entries: words.map((prompt) => ({ prompt, lines: [{ label: 'dělení', html: prompt, footnotes: [`own ${prompt}`] }], cellFootnotes: {} })),
    articles: Object.fromEntries(words.map((prompt) => [`own ${prompt}`, `<h1>${prompt}</h1>`])),
    wordsInDictionaries: words.map((prompt) => ({ prompt, entries: { ssc: `${prompt} in SSČ` } })),
  })
  const promptsIn = async (file: string) => JSON.parse(await readFile(file, 'utf8')).items.map((item: { prompt?: string; word?: string }) => item.prompt ?? item.word)
  const exists = (file: string) => access(file).then(() => true, () => false)

  it('save writes both side files next to the dataset, each with its envelope, through the serialiser, leaving no temporary file', async () => {
    const { context } = await openWithSideFiles()
    const material = materialOf('a', 'b')
    await context.save([{ word: 'a' }, { word: 'b' }], material)
    expect(await readFile(sideFiles().sourceMaterial, 'utf8')).toBe(
      await serialise({ ...target, items: [...material.entries], footnotes: material.articles }),
    )
    expect(await readFile(sideFiles().dictionaries, 'utf8')).toBe(await serialise({ ...target, items: [...material.wordsInDictionaries] }))
    expect((await readdir(dir)).sort()).toEqual(['data', 'source-material'])
  })

  it('finds the side files of a dataset under source-material/, the source-material file named like the dataset', () => {
    const root = join(dir, 'source-material')
    expect(sideFilesIn(root, { language: 'cs', source: 'prirucka', quizType: 'noun-declension' })).toEqual({
      sourceMaterial: join(root, 'cs', 'prirucka', 'noun-declension.json'),
      dictionaries: join(root, 'cs', 'prirucka', 'noun-declension.dictionaries.json'),
    })
  })

  it('starts from the side files already there', async () => {
    await (await openWithSideFiles()).context.save([{ word: 'a' }], materialOf('a'))
    expect((await openWithSideFiles()).context.existingMaterial).toEqual(materialOf('a'))
  })

  it('starts from no source material when there are no side files, or when they are for another target', async () => {
    expect((await openWithSideFiles()).context.existingMaterial).toEqual({ entries: [], articles: {}, wordsInDictionaries: [] })
    await (await openWithSideFiles()).context.save([{ word: 'a' }], materialOf('a'))
    const other = await openWithSideFiles({ ...target, quizType: 'other' })
    expect(other.context.existingMaterial).toEqual({ entries: [], articles: {}, wordsInDictionaries: [] })
  })

  it('throws on a side file that is not valid JSON', async () => {
    await (await openWithSideFiles()).context.save([{ word: 'a' }], materialOf('a'))
    await writeFile(sideFiles().dictionaries, '{"items":[')
    await expect(openWithSideFiles()).rejects.toThrow()
  })

  it('writes no side files while there is no source material, and keeps them up to date once there is', async () => {
    const { context } = await openWithSideFiles()
    await context.save([{ word: 'a' }], none)
    expect(await exists(sideFiles().sourceMaterial)).toBe(false)
    expect(await exists(sideFiles().dictionaries)).toBe(false)
    await context.save([{ word: 'a' }], materialOf('a'))
    await context.save([], materialOf())
    expect(await promptsIn(sideFiles().sourceMaterial)).toEqual([])
    expect(await promptsIn(sideFiles().dictionaries)).toEqual([])
  })

  it('writes nothing, the side files included, when an item breaks the contract', async () => {
    const { context } = await openWithSideFiles()
    await expect(context.save([{ word: '' }], materialOf('a'))).rejects.toThrow('breaks the contract')
    expect(await readdir(dir)).toEqual([])
  })

  describe('if the run stops between two writes, a side file never holds a word that its dataset lacks', () => {
    it('writes the dataset first when a word is new', async () => {
      const { context } = await openWithSideFiles()
      await context.save([{ word: 'a' }], materialOf('a'))
      // The run stops after the first write of the next save: the side file cannot be replaced.
      await rm(sideFiles().sourceMaterial)
      await mkdir(sideFiles().sourceMaterial)
      await expect(context.save([{ word: 'a' }, { word: 'b' }], materialOf('a', 'b'))).rejects.toThrow()
      expect(await promptsIn(dataFile())).toEqual(['a', 'b'])
      expect(await promptsIn(sideFiles().dictionaries)).toEqual(['a'])
    })

    it('writes the side files first when words are dropped', async () => {
      const { context } = await openWithSideFiles()
      await context.save([{ word: 'a' }, { word: 'b' }], materialOf('a', 'b'))
      // The run stops after the side files are written: the dataset cannot be replaced.
      await rm(dataFile())
      await mkdir(dataFile())
      await expect(context.save([{ word: 'a' }], materialOf('a'))).rejects.toThrow()
      expect(await promptsIn(sideFiles().sourceMaterial)).toEqual(['a'])
      expect(await promptsIn(sideFiles().dictionaries)).toEqual(['a'])
    })
  })
})

import { mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { Item } from '../../src/core/cell'
import type { Dataset } from '../../src/datasets/dataset'
import { readItems, serialise, writeData, type DataTarget } from './data-file'

let dir: string
beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'data-file-'))
})
afterEach(async () => {
  await rm(dir, { recursive: true, force: true })
})

const target: DataTarget = { language: 'cs', source: 'prirucka', quizType: 'verb-present-tense' }
const envelope = (items: Item[], overrides: Partial<Dataset<Item>> = {}): Dataset<Item> => ({ ...target, ...overrides, items })

const item = (prompt: string): Item => ({
  prompt,
  cells: [
    { id: '1sg', acceptedForms: [`${prompt}m`, 'ž"quoted"'] },
    { id: '1pl', acceptedForms: [`${prompt}me`] },
  ],
})

describe('serialise', () => {
  it('produces JSON that parses back to the same data', () => {
    const data = envelope([item('a'), item('b'), item('c')])
    expect(JSON.parse(serialise(data))).toEqual(data)
  })

  it('puts each item on its own line, so a change to one verb is a one-line diff', () => {
    const text = serialise(envelope([item('a'), item('b')]))
    const lines = text.split('\n')
    expect(lines.filter((line) => line.includes('"prompt":"a"'))).toHaveLength(1)
    expect(lines.filter((line) => line.includes('"prompt":"b"'))).toHaveLength(1)
    expect(lines.find((line) => line.includes('"prompt":"a"'))).not.toContain('"prompt":"b"')
  })

  it('starts with the envelope on its own line: language, source, quiz type, then the items bracket', () => {
    const [first, ...rest] = serialise(envelope([item('a')])).split('\n')
    expect(first).toBe('{"language":"cs","source":"prirucka","quizType":"verb-present-tense","items":[')
    expect(rest.at(-2)).toBe(']}')
  })

  it('ends with a newline', () => {
    expect(serialise(envelope([item('a')])).endsWith('\n')).toBe(true)
  })

  it('still produces valid JSON when there are no items', () => {
    const data = envelope([])
    expect(JSON.parse(serialise(data))).toEqual(data)
  })
})

describe('readItems', () => {
  it('returns the items of a data file of the same language, source and quiz type', async () => {
    const file = join(dir, 'data.json')
    await writeFile(file, serialise(envelope([item('a'), item('b')])))
    expect(await readItems(file, target)).toEqual([item('a'), item('b')])
  })

  it('reads a file in the old single-line layout too', async () => {
    const file = join(dir, 'data.json')
    await writeFile(file, JSON.stringify(envelope([item('a')])))
    expect(await readItems(file, target)).toEqual([item('a')])
  })

  it('returns nothing when the file does not exist', async () => {
    expect(await readItems(join(dir, 'missing.json'), target)).toEqual([])
  })

  it.each([
    ['language', { language: 'de' }],
    ['source', { source: 'other' }],
    ['quiz type', { quizType: 'other' }],
  ] as const)('returns nothing when the file belongs to another %s', async (_name, override) => {
    const file = join(dir, 'data.json')
    await writeFile(file, serialise(envelope([item('a')], override)))
    expect(await readItems(file, target)).toEqual([])
  })

  it('returns nothing from a file whose envelope names no language or source', async () => {
    const file = join(dir, 'data.json')
    await writeFile(file, JSON.stringify({ quizType: target.quizType, items: [item('a')] }))
    expect(await readItems(file, target)).toEqual([])
  })

  it('returns nothing when there is no items array', async () => {
    const file = join(dir, 'data.json')
    await writeFile(file, JSON.stringify({ ...target }))
    expect(await readItems(file, target)).toEqual([])
  })

  it('throws on corrupt JSON instead of treating it as empty, which would send the whole list to the site again', async () => {
    const file = join(dir, 'data.json')
    await writeFile(file, '{"language":"cs","source":"prirucka","quizType":"verb-present-tense","items":[{"prompt":')
    await expect(readItems(file, target)).rejects.toThrow()
  })
})

describe('writeData', () => {
  const data = envelope([{ prompt: 'a', cells: [{ id: '1sg', acceptedForms: ['am'] }] }])
  const expected = '{"language":"cs","source":"prirucka","quizType":"verb-present-tense","items":[\n{"prompt":"a","cells":[{"id":"1sg","acceptedForms":["am"]}]}\n]}\n'

  it('creates the data directory and writes the serialised data', async () => {
    const file = join(dir, 'data', 'cs', 'prirucka', 'x.json')
    await writeData(file, join(dir, '.tmp'), data)
    expect(await readFile(file, 'utf8')).toBe(expected)
  })

  it('leaves no temp file behind', async () => {
    await writeData(join(dir, 'x.json'), join(dir, '.tmp'), data)
    expect(await readdir(dir)).toEqual(['x.json'])
  })

  it('replaces an existing file', async () => {
    const file = join(dir, 'x.json')
    await writeFile(file, 'old contents')
    await writeData(file, join(dir, '.tmp'), data)
    expect(await readFile(file, 'utf8')).toBe(expected)
  })

  it('rejects and leaves the previous file byte for byte intact when the write fails', async () => {
    const file = join(dir, 'x.json')
    await writeFile(file, 'previous contents')
    await expect(writeData(file, join(dir, 'no-such-dir', '.tmp'), data)).rejects.toThrow()
    expect(await readFile(file, 'utf8')).toBe('previous contents')
  })
})

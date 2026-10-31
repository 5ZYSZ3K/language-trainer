import { mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { ExerciseData, Item } from '../src/core/cell'
import { readItems, serialise, writeData } from './data-file'

let dir: string
beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'data-file-'))
})
afterEach(async () => {
  await rm(dir, { recursive: true, force: true })
})

const item = (prompt: string): Item => ({
  prompt,
  cells: [
    { label: 'verbPresent.1sg', acceptedForms: [`${prompt}m`, 'ž"quoted"'] },
    { label: 'verbPresent.1pl', acceptedForms: [`${prompt}me`] },
  ],
})

describe('serialise', () => {
  it('produces JSON that parses back to the same data', () => {
    const data: ExerciseData = { exerciseType: 'verb-present-tense', items: [item('a'), item('b'), item('c')] }
    expect(JSON.parse(serialise(data))).toEqual(data)
  })

  it('puts each item on its own line, so a change to one verb is a one-line diff', () => {
    const text = serialise({ exerciseType: 'verb-present-tense', items: [item('a'), item('b')] })
    const lines = text.split('\n')
    expect(lines.filter((line) => line.includes('"prompt":"a"'))).toHaveLength(1)
    expect(lines.filter((line) => line.includes('"prompt":"b"'))).toHaveLength(1)
    expect(lines.find((line) => line.includes('"prompt":"a"'))).not.toContain('"prompt":"b"')
  })

  it('ends with a newline', () => {
    expect(serialise({ exerciseType: 'x', items: [item('a')] }).endsWith('\n')).toBe(true)
  })

  it('still produces valid JSON when there are no items', () => {
    const data: ExerciseData = { exerciseType: 'x', items: [] }
    expect(JSON.parse(serialise(data))).toEqual(data)
  })
})

describe('readItems', () => {
  it('returns the items of a data file of the same exercise type', async () => {
    const file = join(dir, 'data.json')
    await writeFile(file, serialise({ exerciseType: 'x', items: [item('a'), item('b')] }))
    expect(await readItems(file, 'x')).toEqual([item('a'), item('b')])
  })

  it('reads a file in the old single-line layout too', async () => {
    const file = join(dir, 'data.json')
    await writeFile(file, JSON.stringify({ exerciseType: 'x', items: [item('a')] }))
    expect(await readItems(file, 'x')).toEqual([item('a')])
  })

  it('returns nothing when the file does not exist', async () => {
    expect(await readItems(join(dir, 'missing.json'), 'x')).toEqual([])
  })

  it('returns nothing when the file belongs to another exercise type', async () => {
    const file = join(dir, 'data.json')
    await writeFile(file, serialise({ exerciseType: 'other', items: [item('a')] }))
    expect(await readItems(file, 'x')).toEqual([])
  })

  it('returns nothing when there is no items array', async () => {
    const file = join(dir, 'data.json')
    await writeFile(file, JSON.stringify({ exerciseType: 'x' }))
    expect(await readItems(file, 'x')).toEqual([])
  })

  it('throws on corrupt JSON instead of treating it as empty, which would send the whole list to the site again', async () => {
    const file = join(dir, 'data.json')
    await writeFile(file, '{"exerciseType":"x","items":[{"prompt":')
    await expect(readItems(file, 'x')).rejects.toThrow()
  })
})

describe('writeData', () => {
  const data: ExerciseData = { exerciseType: 'x', items: [{ prompt: 'a', cells: [{ label: 'verbPresent.1sg', acceptedForms: ['am'] }] }] }
  const expected = '{"exerciseType":"x","items":[\n{"prompt":"a","cells":[{"label":"verbPresent.1sg","acceptedForms":["am"]}]}\n]}\n'

  it('creates the data directory and writes the serialised data', async () => {
    const file = join(dir, 'public', 'data', 'x.json')
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

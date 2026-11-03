import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import type { QuizType } from '../src/quizzes'
import type { Source } from '../src/sources'
import { checkData, readDataFiles } from './check-data'

/** A made-up quiz type whose items are `{ n: number }`, so that these tests do not depend on a real contract. */
const numbers: QuizType<unknown> = {
  id: 'numbers',
  contract: {
    validateItem: (value) => ((value as { n?: unknown } | null)?.n === undefined ? ['n is missing'] : typeof (value as { n: unknown }).n === 'number' ? [] : ['n must be a number']),
    keyOf: (item) => String((item as { n: number }).n),
  },
  meters: [],
}
const source = (id: string, provides: Source['provides']): Source => ({ id, name: id, url: `https://${id}.test/`, trust: 'trusted', provides })
const bundled = { kind: 'bundled' } as const
const registries = {
  sources: [source('alpha', [{ language: 'cs', quizType: 'numbers', delivery: bundled }])],
  quizTypes: [numbers],
}

const file = (items: unknown[], head: Record<string, unknown> = {}) =>
  JSON.stringify({ language: 'cs', source: 'alpha', quizType: 'numbers', items, ...head })
const OK_PATH = 'cs/alpha/numbers.json'
const run = (files: Record<string, string>, regs = registries) => checkData(regs, files)

describe('checkData', () => {
  it('has no problems for a dataset that satisfies its contract, and counts its items', () => {
    expect(run({ [OK_PATH]: file([{ n: 1 }, { n: 2 }]) })).toEqual({ problems: [], items: 2 })
  })

  it('reports a bundled dataset without a file', () => {
    const { problems } = run({})
    expect(problems.join('\n')).toMatch(/data\/cs\/alpha\/numbers\.json.*missing/)
  })

  it('does not require a file for a dataset with another delivery, but checks one that exists', () => {
    const regs = {
      ...registries,
      sources: [
        source('alpha', [
          { language: 'cs', quizType: 'numbers', delivery: bundled },
          { language: 'de', quizType: 'numbers', delivery: { kind: 'github' } },
        ]),
      ],
    }
    expect(run({ [OK_PATH]: file([{ n: 1 }]) }, regs).problems).toEqual([])
    const withBadFile = run({ [OK_PATH]: file([{ n: 1 }]), 'de/alpha/numbers.json': file([{ n: 'x' }], { language: 'de' }) }, regs)
    expect(withBadFile.problems.join('\n')).toMatch(/de\/alpha\/numbers\.json.*item 1.*n must be a number/)
  })

  it('reports files that no source provides, whatever they are', () => {
    const files = { [OK_PATH]: file([{ n: 1 }]), 'cs/beta/numbers.json': file([]), 'cs/alpha/notes.txt': 'x', 'stray.json': '{}' }
    const text = run(files).problems.join('\n')
    expect(text).toMatch(/data\/cs\/beta\/numbers\.json.*not provided by any source/)
    expect(text).toMatch(/data\/cs\/alpha\/notes\.txt.*not provided by any source/)
    expect(text).toMatch(/data\/stray\.json.*not provided by any source/)
  })

  it.each([
    ['language', { language: 'de' }],
    ['source', { source: 'beta' }],
    ['quizType', { quizType: 'words' }],
  ])('reports an envelope whose %s differs from the file location', (field, head) => {
    const text = run({ [OK_PATH]: file([{ n: 1 }], head) }).problems.join('\n')
    expect(text).toMatch(new RegExp(`data/cs/alpha/numbers\\.json.*${field}`))
  })

  it('reports a file that is not valid JSON', () => {
    expect(run({ [OK_PATH]: '{"language":' }).problems.join('\n')).toMatch(/numbers\.json.*not valid JSON/)
  })

  it('reports an envelope without an items list', () => {
    expect(run({ [OK_PATH]: JSON.stringify({ language: 'cs', source: 'alpha', quizType: 'numbers' }) }).problems.join('\n')).toMatch(
      /numbers\.json.*items must be a list/,
    )
  })

  it('reports every item that violates the contract, with its number and the contract\'s own message', () => {
    const { problems } = run({ [OK_PATH]: file([{ n: 1 }, { n: 'two' }, {}, { n: 4 }]) })
    expect(problems).toEqual([
      'data/cs/alpha/numbers.json: item 2: n must be a number',
      'data/cs/alpha/numbers.json: item 3: n is missing',
    ])
  })

  it('reports an empty site: no dataset holds any item', () => {
    const { problems } = run({ [OK_PATH]: file([]) })
    expect(problems.join('\n')).toMatch(/no dataset holds any item/)
  })

  it('accepts a dataset with zero items as long as another one has items', () => {
    const regs = {
      ...registries,
      sources: [source('alpha', [{ language: 'cs', quizType: 'numbers', delivery: bundled }]), source('beta', [{ language: 'cs', quizType: 'numbers', delivery: bundled }])],
    }
    const files = { [OK_PATH]: file([{ n: 1 }]), 'cs/beta/numbers.json': file([], { source: 'beta' }) }
    expect(run(files, regs)).toEqual({ problems: [], items: 1 })
  })

  it('does not call a dataset with only invalid items empty', () => {
    const { problems } = run({ [OK_PATH]: file([{}]) })
    expect(problems.join('\n')).not.toMatch(/no dataset holds any item/)
  })

  it('lists all problems at once instead of stopping at the first', () => {
    const regs = {
      ...registries,
      sources: [source('alpha', [{ language: 'cs', quizType: 'numbers', delivery: bundled }, { language: 'de', quizType: 'numbers', delivery: bundled }])],
    }
    const { problems } = run({ [OK_PATH]: file([{ n: 'x' }]), 'cs/stray/numbers.json': '{}' }, regs)
    expect(problems).toEqual([
      'data/de/alpha/numbers.json: missing, but alpha provides it with bundled delivery',
      'data/cs/alpha/numbers.json: item 1: n must be a number',
      'data/cs/stray/numbers.json: not provided by any source',
    ])
  })

  it('reports a dataset whose quiz type is not registered', () => {
    const regs = { ...registries, sources: [source('alpha', [{ language: 'cs', quizType: 'words', delivery: bundled }])] }
    const text = run({ 'cs/alpha/words.json': file([{ n: 1 }], { quizType: 'words' }) }, regs).problems.join('\n')
    expect(text).toMatch(/words\.json.*quiz type "words" is not registered/)
  })
})

describe('readDataFiles', () => {
  let dirs: string[] = []
  afterEach(async () => {
    await Promise.all(dirs.map((dir) => rm(dir, { recursive: true, force: true })))
    dirs = []
  })
  const make = async (files: Record<string, string>) => {
    const dir = await mkdtemp(join(tmpdir(), 'check-data-test-'))
    dirs.push(dir)
    for (const [path, content] of Object.entries(files)) {
      await mkdir(dirname(join(dir, path)), { recursive: true })
      await writeFile(join(dir, path), content)
    }
    return dir
  }

  it('reads every file below the folder, keyed by its slash-separated path from the folder', async () => {
    const dir = await make({ 'cs/alpha/numbers.json': '[1]', 'top.json': '{}' })
    expect(await readDataFiles(dir)).toEqual({ 'cs/alpha/numbers.json': '[1]', 'top.json': '{}' })
  })

  it('ignores dotfiles such as .DS_Store', async () => {
    const dir = await make({ 'cs/alpha/numbers.json': '[1]', '.DS_Store': 'x', 'cs/.DS_Store': 'x' })
    expect(Object.keys(await readDataFiles(dir))).toEqual(['cs/alpha/numbers.json'])
  })

  it('treats a missing folder as having no files', async () => {
    const dir = await make({})
    expect(await readDataFiles(join(dir, 'data'))).toEqual({})
  })
})

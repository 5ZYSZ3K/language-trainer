import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import type { QuizType } from '../src/quizzes'
import type { Source } from '../src/sources'
import { checkData, checkJoins, checkSourceMaterial, readDataFiles } from './check-data'
import { joinedText, type Join } from './joins/join'

/** A made-up quiz type whose items are `{ n: number }`, so that these tests do not depend on a real contract. */
const numbers: QuizType<unknown> = {
  id: 'numbers',
  contract: {
    validateItem: (value) => ((value as { n?: unknown } | null)?.n === undefined ? ['n is missing'] : typeof (value as { n: unknown }).n === 'number' ? [] : ['n must be a number']),
    keyOf: (item) => String((item as { n: number }).n),
  },
  meters: [],
  texts: { en: { title: '', name: '', intro: '', empty: '' }, cs: { title: '', name: '', intro: '', empty: '' } },
  mount: () => ({ applyTexts: () => {} }),
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

  it('reports a valid item whose key repeats an earlier one, but does not key an invalid item', () => {
    const { problems } = run({ [OK_PATH]: file([{ n: 1 }, { n: 2 }, { n: 1 }, {}, {}]) })
    expect(problems).toEqual([
      'data/cs/alpha/numbers.json: item 3: repeats the key "1" of an earlier item',
      'data/cs/alpha/numbers.json: item 4: n is missing',
      'data/cs/alpha/numbers.json: item 5: n is missing',
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

describe('checkSourceMaterial', () => {
  const MATERIAL = 'cs/alpha/numbers.json'
  const DICTIONARIES = 'cs/alpha/numbers.dictionaries.json'
  const envelope = { language: 'cs', source: 'alpha', quizType: 'numbers' }
  const dataFiles = { [OK_PATH]: file([{ n: 1 }, { n: 2 }]) }
  const entry = (prompt: string, lineFootnotes: string[] = [], cellFootnotes: Record<string, string[]> = {}) => ({
    prompt,
    lines: [{ label: 'dělení', html: '…', footnotes: lineFootnotes }],
    cellFootnotes,
  })
  const material = (items: unknown[], footnotes: Record<string, string> = {}, head: Record<string, unknown> = {}) =>
    JSON.stringify({ ...envelope, items, footnotes, ...head })
  const dictionaries = (items: unknown[], head: Record<string, unknown> = {}) => JSON.stringify({ ...envelope, items, ...head })
  const check = (sideFiles: Record<string, string>, data: Record<string, string> = dataFiles, regs = registries) =>
    checkSourceMaterial(regs, data, sideFiles)

  it('is fine with no side files at all, as before any scrape kept source material', () => {
    expect(check({})).toEqual({ problems: [], files: 0 })
  })

  it('has no problems for side files whose words are items of their dataset and whose articles are all there', () => {
    const sideFiles = {
      [MATERIAL]: material([entry('1', ['135'], { 'nom-sg': ['220'] }), entry('2')], { '135': '<h1>…</h1>', '220': '<h1>…</h1>' }),
      [DICTIONARIES]: dictionaries([{ prompt: '2', entries: { ssc: '…' } }]),
    }
    expect(check(sideFiles)).toEqual({ problems: [], files: 2 })
  })

  it('is fine with one side file and not the other', () => {
    expect(check({ [DICTIONARIES]: dictionaries([{ prompt: '1', entries: {} }]) }).problems).toEqual([])
    expect(check({ [MATERIAL]: material([entry('1')]) }).problems).toEqual([])
  })

  it.each([
    ['language', { language: 'de' }],
    ['source', { source: 'beta' }],
    ['quizType', { quizType: 'words' }],
  ])('reports a side file whose %s differs from its location', (field, head) => {
    const { problems } = check({ [MATERIAL]: material([], {}, head), [DICTIONARIES]: dictionaries([], head) })
    expect(problems).toHaveLength(2)
    expect(problems[0]).toMatch(new RegExp(`^source-material/cs/alpha/numbers\\.dictionaries\\.json: ${field} is`))
    expect(problems[1]).toMatch(new RegExp(`^source-material/cs/alpha/numbers\\.json: ${field} is`))
  })

  it('reports a word of either side file that is not an item of its dataset', () => {
    const { problems } = check({
      [MATERIAL]: material([entry('1'), entry('7')]),
      [DICTIONARIES]: dictionaries([{ prompt: '8', entries: {} }]),
    })
    expect(problems).toEqual([
      'source-material/cs/alpha/numbers.dictionaries.json: item 1: "8" is not an item of data/cs/alpha/numbers.json',
      'source-material/cs/alpha/numbers.json: item 2: "7" is not an item of data/cs/alpha/numbers.json',
    ])
  })

  it('reports an article that a line or a cell leads to but that is not in the footnotes', () => {
    const { problems } = check({
      [MATERIAL]: material([entry('1', ['135', '699'], { 'nom-sg': ['135'], 'dat-sg': ['224'] })], { '135': '…', unused: '…' }),
    })
    expect(problems).toEqual([
      'source-material/cs/alpha/numbers.json: item 1 ("1"): line 1 (dělení) leads to article 699, which is not in footnotes',
      'source-material/cs/alpha/numbers.json: item 1 ("1"): cell dat-sg leads to article 224, which is not in footnotes',
    ])
  })

  it('reports a side file that cannot be read: not JSON, no items, items without a prompt, footnotes that are no object', () => {
    const { problems } = check({
      [MATERIAL]: material([{ lines: [], cellFootnotes: {} }, entry('1')], undefined, { footnotes: [] }),
      [DICTIONARIES]: '{"language":',
    })
    expect(problems).toEqual([
      'source-material/cs/alpha/numbers.dictionaries.json: not valid JSON',
      'source-material/cs/alpha/numbers.json: footnotes must be an object of articles by id',
      'source-material/cs/alpha/numbers.json: item 1 has no prompt',
    ])
    expect(check({ [MATERIAL]: JSON.stringify(envelope) }).problems).toEqual(['source-material/cs/alpha/numbers.json: items must be a list'])
  })

  it('reports an item whose lines or cell footnotes cannot be read', () => {
    const { problems } = check({ [MATERIAL]: material([{ prompt: '1', lines: [{ label: 'x' }], cellFootnotes: { 'nom-sg': '135' } }]) })
    expect(problems).toEqual([
      'source-material/cs/alpha/numbers.json: item 1 ("1"): line 1 must have a list of footnotes',
      'source-material/cs/alpha/numbers.json: item 1 ("1"): cell nom-sg must have a list of footnotes',
    ])
  })

  it('reports a file under source-material/ that is not a side file of a scraped dataset', () => {
    const regs = { ...registries, sources: [source('alpha', [{ language: 'cs', quizType: 'numbers', delivery: bundled, manual: true }])] }
    const sideFiles = { 'cs/beta/numbers.json': material([]), 'cs/alpha/numbers.notes.json': '{}', 'stray.txt': 'x' }
    expect(check(sideFiles).problems).toEqual([
      'source-material/cs/alpha/numbers.notes.json: not a side file of any dataset a source scrapes',
      'source-material/cs/beta/numbers.json: not a side file of any dataset a source scrapes',
      'source-material/stray.txt: not a side file of any dataset a source scrapes',
    ])
    // A hand-written dataset has no page to keep anything from.
    expect(check({ [MATERIAL]: material([]) }, dataFiles, regs).problems).toEqual([
      'source-material/cs/alpha/numbers.json: not a side file of any dataset a source scrapes',
    ])
  })

  it('says once that the words cannot be checked when the dataset itself cannot be read', () => {
    const sideFiles = { [MATERIAL]: material([entry('1'), entry('2')]) }
    expect(check(sideFiles, {}).problems).toEqual([
      'source-material/cs/alpha/numbers.json: its dataset data/cs/alpha/numbers.json cannot be read, so its words cannot be checked',
    ])
    expect(check(sideFiles, { [OK_PATH]: '{' }).problems).toHaveLength(1)
  })
})

describe('checkJoins', () => {
  const JOINED = 'cs/alpha/numbers.json'
  /** A made-up join: the numbers of the list `cs/numbers.txt`, one per line, as `{ n }` items. */
  const numbersJoin: Join = {
    pool: { language: 'cs', source: 'alpha', quizType: 'numbers' },
    command: 'npm run join:numbers',
    datasets: [],
    lists: ['cs/numbers.txt'],
    make({ lists }) {
      const lines = (lists['cs/numbers.txt'] ?? '').split('\n').filter(Boolean)
      const bad = lines.filter((line) => Number.isNaN(Number(line)))
      if (bad.length > 0) return { items: [], problems: bad.map((line) => `${JSON.stringify(line)} is not a number`) }
      return { items: lines.map((line) => ({ n: Number(line) })), problems: [] }
    },
  }
  const check = (committed: string | undefined, list: string) =>
    checkJoins([numbersJoin], { data: committed === undefined ? {} : { [JOINED]: committed }, lists: { 'cs/numbers.txt': list } })

  it('has no problems when the committed file is what the join would write now', async () => {
    const written = await joinedText(numbersJoin, [{ n: 1 }, { n: 2 }])
    expect(await check(written, '1\n2\n')).toEqual([])
  })

  it('fails on a stale joined dataset: one whose inputs changed since it was joined, naming the command that joins it again', async () => {
    const written = await joinedText(numbersJoin, [{ n: 1 }, { n: 2 }])
    expect(await check(written, '1\n2\n3\n')).toEqual(['data/cs/alpha/numbers.json is out of step with its inputs. Run: npm run join:numbers'])
    expect(await check(undefined, '1\n')).toEqual(['data/cs/alpha/numbers.json is out of step with its inputs. Run: npm run join:numbers'])
  })

  it('fails on a joined dataset edited by hand, even when its items are still valid', async () => {
    const edited = (await joinedText(numbersJoin, [{ n: 1 }, { n: 2 }])).replace('2', '7')
    expect(await check(edited, '1\n2\n')).toEqual(['data/cs/alpha/numbers.json is out of step with its inputs. Run: npm run join:numbers'])
  })

  it("reports every problem the join finds in its inputs, and nothing about the file, which it could not make again", async () => {
    expect(await check('{}', '1\nx\ny\n')).toEqual([
      'data/cs/alpha/numbers.json cannot be joined: "x" is not a number',
      'data/cs/alpha/numbers.json cannot be joined: "y" is not a number',
    ])
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

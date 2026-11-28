import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { runJoin } from './join'
import { joinedText, type Join } from './joins/join'

let root: string
beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'join-'))
  await mkdir(join(root, 'lists', 'cs'), { recursive: true })
})
afterEach(async () => {
  await rm(root, { recursive: true, force: true })
})

/** A made-up join: the words of the list `cs/words.txt` and of the dataset `cs/alpha/words`, as `{ word }` items. */
const wordsJoin: Join = {
  pool: { language: 'cs', source: 'beta', quizType: 'words' },
  command: 'npm run join:words',
  datasets: [{ language: 'cs', source: 'alpha', quizType: 'words' }],
  lists: ['cs/words.txt'],
  make({ data, lists }) {
    const list = lists['cs/words.txt']
    if (list === undefined) return { items: [], problems: ['lists/cs/words.txt is missing'] }
    const scraped = data['cs/alpha/words.json'] === undefined ? [] : (JSON.parse(data['cs/alpha/words.json']) as { items: string[] }).items
    return { items: [...list.split(','), ...scraped].map((word) => ({ word })), problems: [] }
  },
}
const OUT = ['data', 'cs', 'beta', 'words.json']

const run = async (key: string | undefined) => {
  const lines: string[] = []
  const code = await runJoin({ root, key, joins: [wordsJoin], log: (line) => lines.push(line) })
  return { code, lines }
}

describe('runJoin', () => {
  it('writes the joined dataset from its committed inputs, laid out by Prettier, and says how many items it holds', async () => {
    await writeFile(join(root, 'lists', 'cs', 'words.txt'), 'pes,kočka')
    await mkdir(join(root, 'data', 'cs', 'alpha'), { recursive: true })
    await writeFile(join(root, 'data', 'cs', 'alpha', 'words.json'), JSON.stringify({ items: ['myš'] }))

    const { code, lines } = await run('cs/beta/words')
    expect(code).toBe(0)
    const items = [{ word: 'pes' }, { word: 'kočka' }, { word: 'myš' }]
    expect(await readFile(join(root, ...OUT), 'utf8')).toBe(await joinedText(wordsJoin, items))
    expect(lines).toEqual(['Joined data/cs/beta/words.json: 3 items.'])
    // Replaced in one step: nothing is left beside it.
    expect(await readdir(root)).toEqual(expect.not.arrayContaining(['.join-data.tmp']))
  })

  it('writes nothing, lists every problem and exits 1 when the join refuses its inputs', async () => {
    await mkdir(join(root, 'data', 'cs', 'beta'), { recursive: true })
    await writeFile(join(root, ...OUT), 'before')
    const { code, lines } = await run('cs/beta/words')
    expect(code).toBe(1)
    expect(lines).toEqual(['Nothing written: data/cs/beta/words.json cannot be joined, 1 problem(s):', '  - lists/cs/words.txt is missing'])
    expect(await readFile(join(root, ...OUT), 'utf8')).toBe('before')
  })

  it('names the joins there are, and exits 2, when asked for none or for one that does not exist', async () => {
    for (const key of [undefined, 'cs/beta/nope']) {
      const { code, lines } = await run(key)
      expect(code).toBe(2)
      expect(lines).toEqual(['Usage: tsx scripts/join.ts <language>/<source>/<quiz type>, one of: cs/beta/words'])
    }
  })
})

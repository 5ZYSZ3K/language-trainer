import { mkdir, mkdtemp, readdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { Item } from '../src/core/cell'
import type { Contract } from '../src/core/contract'
import { createRunContext, type RunContext } from './harness/context'
import { sideFilesIn, type EntryMaterial, type SourceMaterial } from './harness/source-material'
import { testContext } from './harness/test-support'
import { ParseError, type HttpGet } from './harness/types'
import { runListDriven, scrapeList, type EntryScraper } from './list-driven'

/** A stand-in adapter: the page for "x" is "page:x"; an entry containing "bad" parses to an error, one containing "empty" to a first cell without a form. */
const cellIds = ['1sg', '1pl']
const stub: EntryScraper<Item> = {
  fetchPage: (entry, get) => get(`page:${entry}`),
  parse(html, entry) {
    if (entry.includes('bad')) throw new ParseError('not the right page')
    if (entry.includes('empty')) return { item: { prompt: entry, cells: cellIds.map((id, i) => ({ id, acceptedForms: i === 0 ? [] : [{ value: `${html}/${id}` }] })) } }
    return { item: { prompt: entry, cells: cellIds.map((id) => ({ id, acceptedForms: [{ value: `${html}/${id}` }] })) } }
  },
}

/** What the stub adapter's items must satisfy: a form in every cell. */
const stubContract: Contract<Item> = {
  validateItem: (value) =>
    (value as Item).cells.filter((cell) => cell.acceptedForms.length === 0).map((cell) => `no form found for ${cell.id}`),
  keyOf: (item) => item.prompt,
}

const noSave = async () => {}

function recordingGet(failOn: string[] = []) {
  const urls: string[] = []
  const get: HttpGet = async (url) => {
    urls.push(url)
    if (failOn.includes(url)) throw new Error('HTTP 503')
    return url
  }
  return { get, urls }
}

/** Like recordingGet, but each url in `failures` fails that many times and then works. */
function flakyGet(failures: Record<string, number>) {
  const urls: string[] = []
  const left = { ...failures }
  const get: HttpGet = async (url) => {
    urls.push(url)
    if ((left[url] ?? 0) > 0) {
      left[url]!--
      throw new Error('HTTP 503')
    }
    return url
  }
  return { get, urls }
}

const stored = (prompt: string): Item => ({
  prompt,
  cells: [
    { id: '1sg', acceptedForms: [{ value: 'kept' }] },
    { id: '1pl', acceptedForms: [{ value: 'kept' }] },
  ],
})

describe('scrapeList', () => {
  it('fetches every prompt when nothing has been scraped yet, keeping the list order', async () => {
    const { get, urls } = recordingGet()
    const result = await scrapeList({ scraper: stub, contract: stubContract, entries: ['b', 'a', 'c'], existing: [], force: false, get, save: noSave })
    expect(urls).toEqual(['page:b', 'page:a', 'page:c'])
    expect(result.items.map((i) => i.prompt)).toEqual(['b', 'a', 'c'])
    expect(result.items[0]!.cells[0]).toEqual({ id: '1sg', acceptedForms: [{ value: 'page:b/1sg' }] })
    expect(result.failures).toEqual([])
  })

  it('only fetches prompts that are missing from the existing data', async () => {
    const { get, urls } = recordingGet()
    const result = await scrapeList({
      scraper: stub, contract: stubContract,
      entries: ['a', 'b', 'c'],
      existing: [stored('a'), stored('c')],
      force: false,
      get,
      save: noSave,
    })
    expect(urls).toEqual(['page:b'])
    expect(result.items.map((i) => i.prompt)).toEqual(['a', 'b', 'c'])
    expect(result.items[0]).toEqual(stored('a'))
  })

  it('fetches everything again when forced', async () => {
    const { get, urls } = recordingGet()
    const result = await scrapeList({ scraper: stub, contract: stubContract, entries: ['a', 'b'], existing: [stored('a'), stored('b')], force: true, get, save: noSave })
    expect(urls).toEqual(['page:a', 'page:b'])
    expect(result.items[0]!.cells[0]!.acceptedForms).toEqual([{ value: 'page:a/1sg' }])
  })

  it('keeps the previous item when a forced refresh of it fails, and still reports the failure', async () => {
    const { get } = recordingGet(['page:b'])
    const result = await scrapeList({ scraper: stub, contract: stubContract, entries: ['a', 'b'], existing: [stored('a'), stored('b')], force: true, get, save: noSave })
    expect(result.items.map((i) => i.prompt)).toEqual(['a', 'b'])
    expect(result.items[0]!.cells[0]!.acceptedForms).toEqual([{ value: 'page:a/1sg' }]) // refreshed
    expect(result.items[1]).toEqual(stored('b')) // not lost
    expect(result.failures).toEqual([{ entry: 'b', reason: 'HTTP 503' }])
  })

  it('drops existing items whose prompt is no longer in the list', async () => {
    const { get, urls } = recordingGet()
    const result = await scrapeList({ scraper: stub, contract: stubContract, entries: ['a'], existing: [stored('a'), stored('gone')], force: false, get, save: noSave })
    expect(urls).toEqual([])
    expect(result.items.map((i) => i.prompt)).toEqual(['a'])
  })

  it('ignores a prompt listed twice', async () => {
    const { get, urls } = recordingGet()
    const result = await scrapeList({ scraper: stub, contract: stubContract, entries: ['a', 'a'], existing: [], force: false, get, save: noSave })
    expect(urls).toEqual(['page:a'])
    expect(result.items).toHaveLength(1)
  })

  it('skips a prompt whose fetch fails, reports why, and carries on with the rest', async () => {
    const { get } = recordingGet(['page:b'])
    const result = await scrapeList({ scraper: stub, contract: stubContract, entries: ['a', 'b', 'c'], existing: [], force: false, get, save: noSave })
    expect(result.items.map((i) => i.prompt)).toEqual(['a', 'c'])
    expect(result.failures).toEqual([{ entry: 'b', reason: 'HTTP 503' }])
  })

  it('skips a prompt whose page cannot be parsed', async () => {
    const { get } = recordingGet()
    const result = await scrapeList({ scraper: stub, contract: stubContract, entries: ['a', 'bad one'], existing: [], force: false, get, save: noSave })
    expect(result.items.map((i) => i.prompt)).toEqual(['a'])
    expect(result.failures).toEqual([{ entry: 'bad one', reason: 'not the right page' }])
  })

  it('skips a prompt whose item breaks the contract, reporting every problem the contract names', async () => {
    const { get } = recordingGet()
    const contract: Contract<Item> = {
      validateItem: (value) => ((value as Item).prompt === 'picky' ? ['first problem', 'second problem'] : []),
      keyOf: (item) => item.prompt,
    }
    const result = await scrapeList({ scraper: stub, contract, entries: ['picky', 'a'], existing: [], force: false, get, save: noSave })
    expect(result.items.map((i) => i.prompt)).toEqual(['a'])
    expect(result.failures).toEqual([{ entry: 'picky', reason: 'first problem; second problem' }])
  })

  it('hands the contract the item exactly as it would be saved', async () => {
    const { get } = recordingGet()
    const seen: unknown[] = []
    const contract: Contract<Item> = { validateItem: (value) => (seen.push(value), []), keyOf: (item) => item.prompt }
    const result = await scrapeList({ scraper: stub, contract, entries: ['a'], existing: [], force: false, get, save: noSave })
    expect(seen).toEqual(result.items)
  })

  it('does not count a contract violation as the site being down', async () => {
    const { get, urls } = recordingGet()
    const entries = ['empty 1', 'empty 2', 'empty 3', 'empty 4', 'empty 5', 'empty 6', 'a']
    const result = await scrapeList({ scraper: stub, contract: stubContract, entries, existing: [], force: false, get, save: noSave })
    expect(urls).toHaveLength(7)
    expect(result.items.map((i) => i.prompt)).toEqual(['a'])
  })

  it('skips a prompt when any cell ends up with no accepted form', async () => {
    const { get } = recordingGet()
    const result = await scrapeList({ scraper: stub, contract: stubContract, entries: ['empty one', 'a'], existing: [], force: false, get, save: noSave })
    expect(result.items.map((i) => i.prompt)).toEqual(['a'])
    expect(result.failures).toHaveLength(1)
    expect(result.failures[0]).toMatchObject({ entry: 'empty one' })
    expect(result.failures[0]!.reason).toBe('no form found for 1sg')
  })

  describe('when the site stops answering', () => {
    it('stops asking after several fetch failures in a row, and reports what it did not try', async () => {
      const { get, urls } = recordingGet(['page:a', 'page:b', 'page:c', 'page:d', 'page:e'])
      const result = await scrapeList({
        scraper: stub, contract: stubContract,
        entries: ['a', 'b', 'c', 'd', 'e'],
        existing: [],
        force: false,
        get,
        save: noSave,
        maxConsecutiveFetchFailures: 3,
      })
      expect(urls).toEqual(['page:a', 'page:b', 'page:c'])
      expect(result.failures.map((f) => f.entry)).toEqual(['a', 'b', 'c', 'd', 'e'])
      expect(result.failures[3]!.reason).toMatch(/not attempted/)
    })

    it('keeps the previous items of the verbs it did not get to', async () => {
      const { get } = recordingGet(['page:a', 'page:b'])
      const result = await scrapeList({
        scraper: stub, contract: stubContract,
        entries: ['a', 'b', 'c'],
        existing: [stored('c')],
        force: true,
        get,
        save: noSave,
        maxConsecutiveFetchFailures: 2,
      })
      expect(result.items).toEqual([stored('c')])
    })

    it('does not count a successful fetch or a page that merely fails to parse as the site failing', async () => {
      const { get, urls } = recordingGet(['page:a', 'page:c'])
      const result = await scrapeList({
        scraper: stub, contract: stubContract,
        entries: ['a', 'b', 'c', 'bad 1', 'bad 2', 'bad 3', 'd'],
        existing: [],
        force: false,
        get,
        save: noSave,
        maxConsecutiveFetchFailures: 2,
      })
      expect(urls).toHaveLength(7) // every prompt was tried
      expect(result.items.map((i) => i.prompt)).toEqual(['b', 'd'])
    })
  })

  describe('with a cooldown after failures', () => {
    /** A `sleep` that records what it was asked to wait, together with the urls fetched up to then. */
    function sleeper(urls: string[]) {
      const naps: { ms: number; fetchedBefore: string[] }[] = []
      const sleep = async (ms: number) => void naps.push({ ms, fetchedBefore: [...urls] })
      return { sleep, naps }
    }

    it('waits, then tries the same verb again before moving on', async () => {
      const { get, urls } = flakyGet({ 'page:b': 1 })
      const { sleep, naps } = sleeper(urls)
      const result = await scrapeList({
        scraper: stub, contract: stubContract,
        entries: ['a', 'b', 'c'],
        existing: [],
        force: false,
        get,
        save: noSave,
        failCooldownMs: 600_000,
        sleep,
      })
      expect(urls).toEqual(['page:a', 'page:b', 'page:b', 'page:c'])
      expect(naps).toEqual([{ ms: 600_000, fetchedBefore: ['page:a', 'page:b'] }])
      expect(result.items.map((i) => i.prompt)).toEqual(['a', 'b', 'c'])
      expect(result.failures).toEqual([])
    })

    it('waits again for every further failure of the same verb', async () => {
      const { get, urls } = flakyGet({ 'page:a': 2 })
      const { sleep, naps } = sleeper(urls)
      const result = await scrapeList({
        scraper: stub, contract: stubContract,
        entries: ['a'],
        existing: [],
        force: false,
        get,
        save: noSave,
        failCooldownMs: 1000,
        sleep,
      })
      expect(urls).toEqual(['page:a', 'page:a', 'page:a'])
      expect(naps.map((n) => n.ms)).toEqual([1000, 1000])
      expect(result.failures).toEqual([])
    })

    it('saves the retried verb once it works, and not before', async () => {
      const { get, urls } = flakyGet({ 'page:b': 1 })
      const { sleep } = sleeper(urls)
      const saved: string[][] = []
      await scrapeList({
        scraper: stub, contract: stubContract,
        entries: ['a', 'b'],
        existing: [],
        force: false,
        get,
        save: async (items) => void saved.push(items.map((i) => i.prompt)),
        failCooldownMs: 1000,
        sleep,
      })
      expect(saved).toEqual([['a'], ['a', 'b']])
    })

    it('gives up after the allowed number of failures in a row, and reports the verb and the rest', async () => {
      const { get, urls } = recordingGet(['page:a', 'page:b', 'page:c'])
      const { sleep, naps } = sleeper(urls)
      const result = await scrapeList({
        scraper: stub, contract: stubContract,
        entries: ['a', 'b', 'c'],
        existing: [],
        force: false,
        get,
        save: noSave,
        failCooldownMs: 1000,
        sleep,
        maxConsecutiveFetchFailures: 3,
      })
      expect(urls).toEqual(['page:a', 'page:a', 'page:a']) // never reached b
      expect(naps).toHaveLength(2) // no pointless wait before giving up
      expect(result.failures.map((f) => f.entry)).toEqual(['a', 'b', 'c'])
      expect(result.failures[0]).toEqual({ entry: 'a', reason: 'HTTP 503' })
      expect(result.failures[1]!.reason).toMatch(/not attempted/)
    })

    it('does not wait for a page that merely fails to parse, since the site is fine', async () => {
      const { get, urls } = recordingGet()
      const { sleep, naps } = sleeper(urls)
      const result = await scrapeList({
        scraper: stub, contract: stubContract,
        entries: ['bad one', 'empty one', 'a'],
        existing: [],
        force: false,
        get,
        save: noSave,
        failCooldownMs: 1000,
        sleep,
      })
      expect(naps).toEqual([])
      expect(urls).toEqual(['page:bad one', 'page:empty one', 'page:a'])
      expect(result.failures.map((f) => f.entry)).toEqual(['bad one', 'empty one'])
    })

    it('does not wait at all when no cooldown is set, as before', async () => {
      const { get, urls } = recordingGet(['page:b'])
      const { sleep, naps } = sleeper(urls)
      const result = await scrapeList({ scraper: stub, contract: stubContract, entries: ['a', 'b', 'c'], existing: [], force: false, get, save: noSave, sleep })
      expect(naps).toEqual([])
      expect(urls).toEqual(['page:a', 'page:b', 'page:c'])
      expect(result.failures).toEqual([{ entry: 'b', reason: 'HTTP 503' }])
    })

    it('counts a retried verb once in the progress numbers, and logs the pause', async () => {
      const { get, urls } = flakyGet({ 'page:a': 1 })
      const { sleep } = sleeper(urls)
      const lines: string[] = []
      await scrapeList({
        scraper: stub, contract: stubContract,
        entries: ['a', 'b'],
        existing: [],
        force: false,
        get,
        save: noSave,
        failCooldownMs: 90_000,
        sleep,
        log: (message) => void lines.push(message),
      })
      expect(lines).toEqual(['retry  a (1/2): HTTP 503; cooling down for 90 s first', 'ok     a (1/2)', 'ok     b (2/2)'])
    })

    it('keeps the previous item when a forced refresh still fails after the last try', async () => {
      const { get, urls } = recordingGet(['page:a'])
      const { sleep } = sleeper(urls)
      const result = await scrapeList({
        scraper: stub, contract: stubContract,
        entries: ['a'],
        existing: [stored('a')],
        force: true,
        get,
        save: noSave,
        failCooldownMs: 1000,
        sleep,
        maxConsecutiveFetchFailures: 2,
      })
      expect(result.items).toEqual([stored('a')])
      expect(result.failures).toEqual([{ entry: 'a', reason: 'HTTP 503' }])
    })
  })

  it('tries a previously failed prompt again on the next run', async () => {
    const first = recordingGet(['page:b'])
    const run1 = await scrapeList({ scraper: stub, contract: stubContract, entries: ['a', 'b'], existing: [], force: false, get: first.get, save: noSave })
    const second = recordingGet()
    const run2 = await scrapeList({ scraper: stub, contract: stubContract, entries: ['a', 'b'], existing: run1.items, force: false, get: second.get, save: noSave })
    expect(second.urls).toEqual(['page:b'])
    expect(run2.items.map((i) => i.prompt)).toEqual(['a', 'b'])
    expect(run2.failures).toEqual([])
  })

  describe('saving as it goes', () => {
    /** A `save` that records a copy of every snapshot it is given, as prompt lists. */
    function recorder() {
      const saved: string[][] = []
      const save = async (items: readonly Item[]) => {
        saved.push(items.map((i) => i.prompt))
      }
      return { save, saved }
    }

    it('saves once per successful verb, with the full snapshot in list order', async () => {
      const { get } = recordingGet()
      const { save, saved } = recorder()
      await scrapeList({ scraper: stub, contract: stubContract, entries: ['a', 'b', 'c'], existing: [], force: false, get, save })
      expect(saved).toEqual([['a'], ['a', 'b'], ['a', 'b', 'c']])
    })

    it('saves the scraped items, not just their prompts', async () => {
      const { get } = recordingGet()
      const snapshots: Item[][] = []
      await scrapeList({ scraper: stub, contract: stubContract, entries: ['a'], existing: [], force: false, get, save: async (items) => void snapshots.push([...items]) })
      expect(snapshots[0]![0]!.cells[0]).toEqual({ id: '1sg', acceptedForms: [{ value: 'page:a/1sg' }] })
    })

    it('keeps the list order when a verb in the middle is fetched after the ones around it were already scraped', async () => {
      const { get } = recordingGet()
      const { save, saved } = recorder()
      await scrapeList({ scraper: stub, contract: stubContract, entries: ['a', 'b', 'c'], existing: [stored('a'), stored('c')], force: false, get, save })
      expect(saved).toEqual([['a', 'b', 'c']])
    })

    it('with force, snapshots still hold the old entries of verbs not reached yet', async () => {
      const { get } = recordingGet()
      const snapshots: Item[][] = []
      await scrapeList({
        scraper: stub, contract: stubContract,
        entries: ['a', 'b', 'c'],
        existing: [stored('a'), stored('b'), stored('c')],
        force: true,
        get,
        save: async (items) => void snapshots.push([...items]),
      })
      expect(snapshots).toHaveLength(3)
      expect(snapshots[0]!.map((i) => i.prompt)).toEqual(['a', 'b', 'c'])
      expect(snapshots[0]![0]!.cells[0]!.acceptedForms).toEqual([{ value: 'page:a/1sg' }]) // refreshed
      expect(snapshots[0]![1]).toEqual(stored('b')) // not reached yet
      expect(snapshots[0]![2]).toEqual(stored('c'))
    })

    it('with force, a verb whose refresh failed keeps its old entry in later snapshots', async () => {
      const { get } = recordingGet(['page:a'])
      const snapshots: Item[][] = []
      await scrapeList({
        scraper: stub, contract: stubContract,
        entries: ['a', 'b'],
        existing: [stored('a'), stored('b')],
        force: true,
        get,
        save: async (items) => void snapshots.push([...items]),
      })
      expect(snapshots).toHaveLength(1) // only b succeeded
      expect(snapshots[0]![0]).toEqual(stored('a'))
      expect(snapshots[0]![1]!.cells[0]!.acceptedForms).toEqual([{ value: 'page:b/1sg' }])
    })

    it('does not save for failures: fetch, parse, empty cell, or not attempted', async () => {
      const { get } = recordingGet(['page:a', 'page:b'])
      const { save, saved } = recorder()
      await scrapeList({
        scraper: stub, contract: stubContract,
        entries: ['a', 'b', 'bad one', 'empty one', 'c'],
        existing: [],
        force: false,
        get,
        save,
        maxConsecutiveFetchFailures: 2,
      })
      expect(saved).toEqual([])
    })

    it('after the site-down stop, the last saved snapshot holds everything that worked before it', async () => {
      const { get } = recordingGet(['page:c', 'page:d'])
      const { save, saved } = recorder()
      const result = await scrapeList({
        scraper: stub, contract: stubContract,
        entries: ['a', 'b', 'c', 'd', 'e'],
        existing: [],
        force: false,
        get,
        save,
        maxConsecutiveFetchFailures: 2,
      })
      expect(saved.at(-1)).toEqual(['a', 'b'])
      expect(result.items.map((i) => i.prompt)).toEqual(['a', 'b'])
    })

    it('saves once at the start when verbs were pruned from the list', async () => {
      const { get } = recordingGet()
      const { save, saved } = recorder()
      await scrapeList({ scraper: stub, contract: stubContract, entries: ['a'], existing: [stored('a'), stored('gone')], force: false, get, save })
      expect(saved).toEqual([['a']])
    })

    it('saves once at the start when the list order changed', async () => {
      const { get } = recordingGet()
      const { save, saved } = recorder()
      await scrapeList({ scraper: stub, contract: stubContract, entries: ['b', 'a'], existing: [stored('a'), stored('b')], force: false, get, save })
      expect(saved).toEqual([['b', 'a']])
    })

    it('does not save at the start when the existing data already matches the list', async () => {
      const { get } = recordingGet()
      const { save, saved } = recorder()
      await scrapeList({ scraper: stub, contract: stubContract, entries: ['a', 'b'], existing: [stored('a'), stored('b')], force: false, get, save })
      expect(saved).toEqual([])
    })

    it('does not save at the start when the only change is that verbs are still missing', async () => {
      const { get } = recordingGet(['page:c'])
      const { save, saved } = recorder()
      await scrapeList({ scraper: stub, contract: stubContract, entries: ['a', 'b', 'c'], existing: [stored('a')], force: false, get, save })
      expect(saved).toEqual([['a', 'b']])
    })

    it('rejects when a save fails, and makes no further fetch', async () => {
      const { get, urls } = recordingGet()
      const save = async () => {
        throw new Error('disk full')
      }
      await expect(scrapeList({ scraper: stub, contract: stubContract, entries: ['a', 'b', 'c'], existing: [], force: false, get, save })).rejects.toThrow('disk full')
      expect(urls).toEqual(['page:a'])
    })

    it('rejects when the save at the start fails, before any fetch', async () => {
      const { get, urls } = recordingGet()
      const save = async () => {
        throw new Error('disk full')
      }
      await expect(
        scrapeList({ scraper: stub, contract: stubContract, entries: ['a', 'b'], existing: [stored('gone')], force: false, get, save }),
      ).rejects.toThrow('disk full')
      expect(urls).toEqual([])
    })
  })

  describe('progress log', () => {
    function logged(run: (log: (message: string) => void) => Promise<unknown>) {
      const lines: string[] = []
      return run((message) => lines.push(message)).then(() => lines)
    }

    it('counts tries out of the number of verbs that will be tried, failures included', async () => {
      const { get } = recordingGet(['page:b'])
      const lines = await logged((log) =>
        scrapeList({ scraper: stub, contract: stubContract, entries: ['a', 'b', 'c'], existing: [], force: false, get, save: noSave, log }),
      )
      expect(lines).toEqual(['ok     a (1/3)', 'FAILED b (2/3): HTTP 503', 'ok     c (3/3)'])
    })

    it('leaves already scraped verbs out of the total', async () => {
      const { get } = recordingGet()
      const lines = await logged((log) =>
        scrapeList({ scraper: stub, contract: stubContract, entries: ['a', 'b', 'c'], existing: [stored('a')], force: false, get, save: noSave, log }),
      )
      expect(lines).toEqual(['ok     b (1/2)', 'ok     c (2/2)'])
    })

    it('counts every listed verb with force', async () => {
      const { get } = recordingGet()
      const lines = await logged((log) =>
        scrapeList({ scraper: stub, contract: stubContract, entries: ['a', 'b'], existing: [stored('a')], force: true, get, save: noSave, log }),
      )
      expect(lines).toEqual(['ok     a (1/2)', 'ok     b (2/2)'])
    })

    it('does not log the verbs it did not attempt', async () => {
      const { get } = recordingGet(['page:a', 'page:b'])
      const lines = await logged((log) =>
        scrapeList({ scraper: stub, contract: stubContract, entries: ['a', 'b', 'c'], existing: [], force: false, get, save: noSave, log, maxConsecutiveFetchFailures: 2 }),
      )
      expect(lines).toEqual(['FAILED a (1/3): HTTP 503', 'FAILED b (2/3): HTTP 503'])
    })
  })
})

describe('scrapeList: source material', () => {
  /** Like `stub`, but each page also says more: a line and a cell leading to the article "common" and one of its own, and a dictionary entry. */
  const withMaterial: EntryScraper<Item> = {
    fetchPage: stub.fetchPage,
    parse(html, entry) {
      const { item } = stub.parse(html, entry)
      const material: EntryMaterial = {
        lines: [{ label: 'dělení', html: `${html} line`, footnotes: ['common', `own ${entry}`] }],
        cellFootnotes: { '1sg': ['common'] },
        dictionaryEntries: { ssc: `${html} ssc` },
        articles: { common: `common, as ${html} has it`, [`own ${entry}`]: `own, as ${html} has it` },
      }
      return { item, material }
    },
  }

  /** The side files of a previous run for these words: each with a line leading to an article of its own. */
  const storedMaterial = (...prompts: string[]): SourceMaterial => ({
    entries: prompts.map((prompt) => ({ prompt, lines: [{ label: 'dělení', html: 'kept', footnotes: [`own ${prompt}`] }], cellFootnotes: {} })),
    articles: Object.fromEntries(prompts.map((prompt) => [`own ${prompt}`, 'kept'])),
    wordsInDictionaries: prompts.map((prompt) => ({ prompt, entries: { ssc: 'kept' } })),
  })

  /** A `save` that keeps the side files of every snapshot it is given. */
  function materialRecorder() {
    const saved: SourceMaterial[] = []
    const save = async (_items: readonly Item[], material: SourceMaterial) => void saved.push(material)
    return { save, saved }
  }
  const prompts = (material: SourceMaterial | undefined) => ({
    entries: material?.entries.map((entry) => entry.prompt),
    wordsInDictionaries: material?.wordsInDictionaries.map((word) => word.prompt),
    articles: Object.keys(material?.articles ?? {}).sort(),
  })

  it('gives each word it fetches an entry in both side files, and keeps each article they lead to once, as the latest page has it', async () => {
    const { save, saved } = materialRecorder()
    await scrapeList({ scraper: withMaterial, contract: stubContract, entries: ['a', 'b'], existing: [], force: false, get: recordingGet().get, save })
    expect(saved).toHaveLength(2)
    const last = saved.at(-1)!
    expect(last.entries).toEqual([
      { prompt: 'a', lines: [{ label: 'dělení', html: 'page:a line', footnotes: ['common', 'own a'] }], cellFootnotes: { '1sg': ['common'] } },
      { prompt: 'b', lines: [{ label: 'dělení', html: 'page:b line', footnotes: ['common', 'own b'] }], cellFootnotes: { '1sg': ['common'] } },
    ])
    expect(last.wordsInDictionaries).toEqual([
      { prompt: 'a', entries: { ssc: 'page:a ssc' } },
      { prompt: 'b', entries: { ssc: 'page:b ssc' } },
    ])
    expect(last.articles).toEqual({ common: 'common, as page:b has it', 'own a': 'own, as page:a has it', 'own b': 'own, as page:b has it' })
  })

  it('on a normal run, drops unlisted words from the side files at the start and puts the rest in list order', async () => {
    const { save, saved } = materialRecorder()
    const { get, urls } = recordingGet()
    await scrapeList({
      scraper: withMaterial,
      contract: stubContract,
      entries: ['b', 'a'],
      existing: [stored('a'), stored('b'), stored('gone')],
      existingMaterial: storedMaterial('a', 'gone', 'b'),
      force: false,
      get,
      save,
    })
    expect(urls).toEqual([])
    expect(saved.map(prompts)).toEqual([{ entries: ['b', 'a'], wordsInDictionaries: ['b', 'a'], articles: ['own a', 'own b'] }])
  })

  it('saves at the start when only the side files are out of step with the list', async () => {
    const { save, saved } = materialRecorder()
    await scrapeList({
      scraper: withMaterial,
      contract: stubContract,
      entries: ['a', 'b'],
      existing: [stored('a'), stored('b')],
      existingMaterial: storedMaterial('b', 'a', 'gone'),
      force: false,
      get: recordingGet().get,
      save,
    })
    expect(saved.map(prompts)).toEqual([{ entries: ['a', 'b'], wordsInDictionaries: ['a', 'b'], articles: ['own a', 'own b'] }])
  })

  it('does not save at the start when the side files already follow the list', async () => {
    const { save, saved } = materialRecorder()
    const options = { scraper: withMaterial, contract: stubContract, entries: ['a', 'b'], existing: [stored('a'), stored('b')], force: false, get: recordingGet().get, save }
    await scrapeList({ ...options, existingMaterial: storedMaterial('a', 'b') })
    await scrapeList(options) // no side files at all, as for words scraped before source material was kept
    expect(saved).toEqual([])
  })

  it('with --force, replaces the entries of every word it fetches', async () => {
    const { save, saved } = materialRecorder()
    await scrapeList({
      scraper: withMaterial,
      contract: stubContract,
      entries: ['a', 'b'],
      existing: [stored('a'), stored('b')],
      existingMaterial: storedMaterial('a', 'b'),
      force: true,
      get: recordingGet().get,
      save,
    })
    const last = saved.at(-1)!
    expect(last.entries.map((entry) => entry.lines[0]!.html)).toEqual(['page:a line', 'page:b line'])
    expect(last.wordsInDictionaries.map((entry) => entry.entries.ssc)).toEqual(['page:a ssc', 'page:b ssc'])
    expect(last.articles).toEqual({ common: 'common, as page:b has it', 'own a': 'own, as page:a has it', 'own b': 'own, as page:b has it' })
  })

  it('keeps the entries of a word whose fetch fails, and the articles they lead to', async () => {
    const { save, saved } = materialRecorder()
    await scrapeList({
      scraper: withMaterial,
      contract: stubContract,
      entries: ['a', 'b'],
      existing: [stored('a'), stored('b')],
      existingMaterial: storedMaterial('a', 'b'),
      force: true,
      get: recordingGet(['page:b']).get,
      save,
    })
    const last = saved.at(-1)!
    expect(last.entries[1]).toEqual(storedMaterial('b').entries[0])
    expect(last.wordsInDictionaries[1]).toEqual(storedMaterial('b').wordsInDictionaries[0])
    expect(last.articles['own b']).toBe('kept')
  })

  it('also keeps the entries of a word whose page no longer parses, or whose item breaks the contract', async () => {
    const { save, saved } = materialRecorder()
    await scrapeList({
      scraper: withMaterial,
      contract: stubContract,
      entries: ['a', 'bad one', 'empty one'],
      existing: [stored('a'), stored('bad one'), stored('empty one')],
      existingMaterial: storedMaterial('a', 'bad one', 'empty one'),
      force: true,
      get: recordingGet().get,
      save,
    })
    expect(saved.at(-1)!.entries.slice(1)).toEqual(storedMaterial('bad one', 'empty one').entries)
  })

  it('drops the articles that no word of the file leads to any more', async () => {
    const { save, saved } = materialRecorder()
    const before = storedMaterial('a', 'b')
    await scrapeList({
      scraper: withMaterial,
      contract: stubContract,
      entries: ['a', 'b'],
      existing: [stored('a'), stored('b')],
      // "a" led to "old a" before the refresh; nothing ever led to "orphan".
      existingMaterial: {
        ...before,
        entries: [{ ...before.entries[0]!, lines: [{ label: 'dělení', html: 'kept', footnotes: ['old a'] }] }, before.entries[1]!],
        articles: { ...before.articles, 'old a': 'kept', orphan: 'kept' },
      },
      force: true,
      get: recordingGet(['page:b']).get,
      save,
    })
    expect(saved.map(prompts)).toEqual([
      { entries: ['a', 'b'], wordsInDictionaries: ['a', 'b'], articles: ['old a', 'own b'] }, // at the start: "orphan" goes
      { entries: ['a', 'b'], wordsInDictionaries: ['a', 'b'], articles: ['common', 'own a', 'own b'] }, // "a" refreshed: "old a" goes
    ])
  })

  it('gives a word that was scraped before source material was kept no entries until it is fetched again', async () => {
    const { save, saved } = materialRecorder()
    await scrapeList({ scraper: withMaterial, contract: stubContract, entries: ['a', 'b'], existing: [stored('a')], force: false, get: recordingGet().get, save })
    expect(saved.map(prompts)).toEqual([{ entries: ['b'], wordsInDictionaries: ['b'], articles: ['common', 'own b'] }])
  })

  it('keeps no entries for a word that has no item, so that every word of a side file is an item of its dataset', async () => {
    // "b" was deleted from the dataset by hand to have it fetched again, and its fetch failed.
    const { save, saved } = materialRecorder()
    await scrapeList({
      scraper: withMaterial,
      contract: stubContract,
      entries: ['a', 'b'],
      existing: [stored('a')],
      existingMaterial: storedMaterial('a', 'b'),
      force: false,
      get: recordingGet(['page:b']).get,
      save,
    })
    expect(saved.map(prompts)).toEqual([{ entries: ['a'], wordsInDictionaries: ['a'], articles: ['own a'] }])
  })

  it('logs what the adapter warns about a page, with the word and its progress, before the line that says how it went', async () => {
    const warning: EntryScraper<Item> = { ...stub, parse: (html, entry) => ({ ...stub.parse(html, entry), warnings: ['footnote 7 is missing', 'and 8'] }) }
    const lines: string[] = []
    await scrapeList({ scraper: warning, contract: stubContract, entries: ['a'], existing: [], force: false, get: recordingGet().get, save: noSave, log: (line) => void lines.push(line) })
    expect(lines).toEqual(['warn   a (1/1): footnote 7 is missing', 'warn   a (1/1): and 8', 'ok     a (1/1)'])
  })

  describe('carrying over what was written by hand', () => {
    /** A contract whose hook copies the first variant's remarks from the previous item, and warns when it cannot. */
    const remarked = (prompt: string): Item => ({
      prompt,
      cells: [
        { id: '1sg', acceptedForms: [{ value: 'kept', remarks: ['dual'] }] },
        { id: '1pl', acceptedForms: [{ value: 'kept' }] },
      ],
    })
    const calls: [Item, Item][] = []
    const carrying: Contract<Item> = {
      ...stubContract,
      carryOver(previous, fresh) {
        calls.push([previous, fresh])
        const remarks = previous.cells[0]!.acceptedForms[0]!.remarks
        const [first, ...rest] = fresh.cells
        return {
          item: { ...fresh, cells: [{ ...first!, acceptedForms: first!.acceptedForms.map((variant) => ({ ...variant, remarks })) }, ...rest] },
          warnings: [`cell 1sg: carried ${String(remarks)}`],
        }
      },
    }
    afterEach(() => void calls.splice(0))

    it('hands the hook the previous item and the fresh one, and saves what it gives back', async () => {
      const lines: string[] = []
      const result = await scrapeList({
        scraper: stub,
        contract: carrying,
        entries: ['a'],
        existing: [remarked('a')],
        force: true,
        get: recordingGet().get,
        save: noSave,
        log: (line) => void lines.push(line),
      })
      expect(calls).toEqual([[remarked('a'), stub.parse('page:a', 'a').item]])
      expect(result.items[0]!.cells[0]!.acceptedForms).toEqual([{ value: 'page:a/1sg', remarks: ['dual'] }])
      expect(lines).toEqual(['warn   a (1/1): cell 1sg: carried dual', 'ok     a (1/1)'])
    })

    it('does not call the hook for a word that has no previous item', async () => {
      await scrapeList({ scraper: stub, contract: carrying, entries: ['a'], existing: [], force: false, get: recordingGet().get, save: noSave })
      expect(calls).toEqual([])
    })

    it('fails a word whose carried item breaks the contract, and keeps its previous item and entries', async () => {
      const picky: Contract<Item> = {
        ...carrying,
        validateItem: (value) => ((value as Item).cells[0]!.acceptedForms[0]!.remarks ? ['remarks are not allowed here'] : []),
      }
      const { save, saved } = materialRecorder()
      const result = await scrapeList({
        scraper: withMaterial,
        contract: picky,
        entries: ['a'],
        existing: [remarked('a')],
        existingMaterial: storedMaterial('a'),
        force: true,
        get: recordingGet().get,
        save,
      })
      expect(result.failures).toEqual([{ entry: 'a', reason: 'remarks are not allowed here' }])
      expect(result.items).toEqual([remarked('a')])
      expect(saved).toEqual([])
    })

    it('logs only why a word failed, not what the page and the hook warned about the fresh item it did not save', async () => {
      const picky: Contract<Item> = { ...carrying, validateItem: () => ['remarks are not allowed here'] }
      const warning: EntryScraper<Item> = { ...stub, parse: (html, entry) => ({ ...stub.parse(html, entry), warnings: ['footnote 7 is missing'] }) }
      const lines: string[] = []
      await scrapeList({
        scraper: warning,
        contract: picky,
        entries: ['a'],
        existing: [remarked('a')],
        force: true,
        get: recordingGet().get,
        save: noSave,
        log: (line) => void lines.push(line),
      })
      expect(lines).toEqual(['FAILED a (1/1): remarks are not allowed here'])
    })
  })
})

describe('runListDriven', () => {
  let listsDir: string
  beforeEach(async () => {
    listsDir = await mkdtemp(join(tmpdir(), 'lists-'))
    await mkdir(join(listsDir, 'cs'))
    await writeFile(join(listsDir, 'cs', 'quiz.txt'), 'a, b,\n c, a')
  })
  afterEach(async () => {
    await rm(listsDir, { recursive: true, force: true })
  })

  function context(overrides: Partial<RunContext<Item>> = {}) {
    const lines: string[] = []
    const plans: [number, number][] = []
    const saved: string[][] = []
    const ctx = testContext<Item>({
      target: { language: 'cs', source: 'test', quizType: 'quiz' },
      contract: stubContract,
      existing: [stored('a'), stored('gone')],
      get: recordingGet().get,
      save: async (items) => void saved.push(items.map((i) => i.prompt)),
      log: (message) => void lines.push(message),
      listsDir,
      planned: (total, done) => void plans.push([total, done]),
      ...overrides,
    })
    return { ctx, lines, plans, saved }
  }

  it("works through lists/<language>/<quiz type>.txt in order, with the context's getter and save", async () => {
    const { get, urls } = recordingGet()
    const { ctx, saved } = context({ get })
    const result = await runListDriven(ctx, stub)
    expect(urls).toEqual(['page:b', 'page:c'])
    expect(saved).toEqual([['a'], ['a', 'b'], ['a', 'b', 'c']])
    expect(result.items.map((i) => i.prompt)).toEqual(['a', 'b', 'c'])
    expect(result.failures).toEqual([])
  })

  it('reports how many entries are listed and already scraped, before fetching anything', async () => {
    const { ctx, lines, plans } = context()
    await runListDriven(ctx, stub)
    expect(plans).toEqual([[3, 1]])
    expect(lines[0]).toBe('3 items listed, 1 already scraped, 2 to fetch.')
  })

  it('logs the counts, then the pause and the cool-down in use, then one line per entry', async () => {
    const lines: string[] = []
    const target = { language: 'cs', source: 'test', quizType: 'quiz' }
    const { context: real } = await createRunContext<Item>({
      target,
      contract: stubContract,
      dataFile: join(listsDir, 'out', 'quiz.json'),
      sideFiles: sideFilesIn(join(listsDir, 'source-material'), target),
      tmpFile: join(listsDir, '.tmp'),
      listsDir,
      force: false,
      failCooldownMs: 90_000,
      pauseMs: 1500,
      get: recordingGet().get,
      log: (message) => void lines.push(message),
    })
    await runListDriven(real, stub)
    expect(lines).toEqual([
      '3 items listed, 0 already scraped, 3 to fetch.',
      'Pausing 1500 ms after each request.',
      'After an item fails to fetch: cooling down for 90 s, then trying it again.',
      'ok     a (1/3)',
      'ok     b (2/3)',
      'ok     c (3/3)',
    ])
    // The stub keeps no source material, so the real context wrote the dataset and no side file.
    expect(await readdir(listsDir)).not.toContain('source-material')
  })

  it('counts every listed entry as to fetch with force', async () => {
    const { ctx, lines } = context({ force: true })
    await runListDriven(ctx, stub)
    expect(lines[0]).toBe('3 items listed, 1 already scraped, 3 to fetch (--force).')
  })

  it('fails when the list file is missing', async () => {
    const { ctx } = context({ target: { language: 'de', source: 'test', quizType: 'quiz' } })
    await expect(runListDriven(ctx, stub)).rejects.toThrow(/ENOENT/)
  })
})

/**
 * The list-driven loop: for each entry of a word list, fetch a page, parse it into an item, validate it, save.
 * Used by the prirucka adapter; available to any adapter that works through a list.
 */
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { Contract } from '../src/core/contract'
import type { Failure, RunContext, RunResult } from './harness/context'
import { ParseError, type HttpGet } from './harness/types'
import { parseList } from './list'

/** How an adapter turns one list entry into an item. */
export interface EntryScraper<Item> {
  /** Fetch the page that describes `entry`, following any redirects or disambiguation. */
  fetchPage(entry: string, get: HttpGet): Promise<string>
  /**
   * Turn a fetched page into the entry's item, whose key (`contract.keyOf`) is the entry. Throws ParseError if it
   * is not the right page.
   */
  parse(html: string, entry: string): Item
}

export interface ScrapeListOptions<Item> {
  scraper: EntryScraper<Item>
  /** What every item must satisfy before it is saved; its problems turn into a `ParseError`. */
  contract: Contract<Item>
  entries: readonly string[]
  /** Items from the previous run. */
  existing: readonly Item[]
  /** Re-fetch everything instead of only what is missing. */
  force: boolean
  get: HttpGet
  /**
   * Persists everything known so far, in the order of `entries`. Called after every entry that was scraped
   * successfully (and once at the start if items were pruned or re-ordered), never for a failure. If it
   * rejects, `scrapeList` rejects at once and fetches nothing more: a run that cannot save must not carry on.
   */
  save: (items: readonly Item[]) => Promise<void>
  /**
   * After this many fetches in a row that fail for reasons other than the page's content (timeouts, errors,
   * "busy"), the site is assumed to be down and the remaining entries are not tried. Default 5.
   */
  maxConsecutiveFetchFailures?: number
  /**
   * When an entry fails for reasons other than the page's content (see above), wait this long and try the same
   * entry again instead of moving on to the next one. Each such failure counts towards
   * `maxConsecutiveFetchFailures`, so a site that stays down is still given up on. 0 (the default) turns it off.
   */
  failCooldownMs?: number
  log?: (message: string) => void
  sleep?: (ms: number) => Promise<void>
}

/** What a run over a list has to do. */
interface Plan<Item> {
  /** The distinct entries, in list order. */
  listed: string[]
  /** The items of the previous run whose entry is still listed, by entry. */
  previous: Map<string, Item>
  /** The entries to fetch: every listed one with `force`, else those without a previous item. */
  toTry: string[]
}

/** The one place that tells listed entries from already scraped ones; the run and its first log line both use it. */
function planRun<Item>(contract: Contract<Item>, entries: readonly string[], existing: readonly Item[], force: boolean): Plan<Item> {
  const listed = [...new Set(entries)]
  const inList = new Set(listed)
  const previous = new Map(
    existing.filter((item) => inList.has(contract.keyOf(item))).map((item) => [contract.keyOf(item), item]),
  )
  return { listed, previous, toTry: force ? listed : listed.filter((entry) => !previous.has(entry)) }
}

/** Items are in the order of `entries`. Entries that failed are absent unless an earlier item for them existed. */
export async function scrapeList<Item>(options: ScrapeListOptions<Item>): Promise<RunResult<Item>> {
  const {
    scraper,
    contract,
    entries,
    existing,
    force,
    get,
    save,
    maxConsecutiveFetchFailures = 5,
    failCooldownMs = 0,
    log = () => {},
    sleep = (ms) => new Promise((r) => setTimeout(r, ms)),
  } = options
  const { listed, previous, toTry } = planRun(contract, entries, existing, force)
  const scraped = new Map<string, Item>()
  const failures: Failure[] = []
  let fetchFailuresInARow = 0

  // What is known right now: this run's item if there is one, else the previous one. A failed refresh must not
  // throw away data that was good, so every failure path leaves the previous item in place.
  const snapshot = (): Item[] =>
    listed.flatMap((entry) => {
      const item = scraped.get(entry) ?? previous.get(entry)
      return item ? [item] : []
    })

  const initial = snapshot()
  const unchanged =
    initial.length === existing.length &&
    initial.every((item, i) => existing[i] !== undefined && contract.keyOf(item) === contract.keyOf(existing[i]))
  if (!unchanged) await save(initial)

  let tried = 0
  for (const entry of toTry) {
    if (fetchFailuresInARow >= maxConsecutiveFetchFailures) {
      failures.push({ entry, reason: 'not attempted: the site stopped responding' })
      continue
    }

    tried++
    const progress = `(${tried}/${toTry.length})`
    let item: Item | undefined
    while (item === undefined) {
      try {
        const html = await scraper.fetchPage(entry, get)
        fetchFailuresInARow = 0
        const candidate = scraper.parse(html, entry)
        const problems = contract.validateItem(candidate)
        if (problems.length > 0) throw new ParseError(problems.join('; '))
        item = candidate
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error)
        const fetchFailed = !(error instanceof ParseError)
        if (fetchFailed) fetchFailuresInARow++
        // Waiting only helps when the site is the problem, and is pointless once the run is about to give up.
        if (fetchFailed && failCooldownMs > 0 && fetchFailuresInARow < maxConsecutiveFetchFailures) {
          log(`retry  ${entry} ${progress}: ${reason}; cooling down for ${failCooldownMs / 1000} s first`)
          await sleep(failCooldownMs)
          continue
        }
        failures.push({ entry, reason })
        log(`FAILED ${entry} ${progress}: ${reason}`)
        break
      }
    }
    if (item === undefined) continue

    // Outside the try: a failed save is fatal, not a failure of this entry.
    scraped.set(entry, item)
    await save(snapshot())
    log(`ok     ${entry} ${progress}`)
  }
  return { items: snapshot(), failures }
}

/**
 * Runs `scrapeList` over `lists/<language>/<quiz type>.txt` for the context's target: reports what the run will
 * do, then fetches what is missing (everything with --force) through the context's getter and save.
 */
export async function runListDriven<Item>(context: RunContext<Item>, scraper: EntryScraper<Item>): Promise<RunResult<Item>> {
  const { target, contract, existing, force } = context
  const entries = parseList(await readFile(join(context.listsDir, target.language, `${target.quizType}.txt`), 'utf8'))
  const { listed, previous, toTry } = planRun(contract, entries, existing, force)
  context.log(`${listed.length} items listed, ${previous.size} already scraped, ${toTry.length} to fetch${force ? ' (--force)' : ''}.`)
  context.planned(listed.length, previous.size)
  return scrapeList({
    scraper,
    contract,
    entries,
    existing,
    force,
    get: context.get,
    save: context.save,
    failCooldownMs: context.failCooldownMs,
    log: context.log,
  })
}

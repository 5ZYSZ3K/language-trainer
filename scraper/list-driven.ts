/**
 * The list-driven loop: for each entry of a word list, fetch a page, parse it into an item (and the entry's source
 * material), carry over what was written by hand, validate it, save. Used by the prirucka adapter; available to any
 * adapter that works through a list.
 */
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { Contract } from '../src/core/contract'
import type { Failure, RunContext, RunResult } from './harness/context'
import {
  materialByWord,
  NO_SOURCE_MATERIAL,
  sideFileKeys,
  sourceMaterialOf,
  wordMaterialOf,
  type EntryMaterial,
  type SourceMaterial,
  type WordMaterial,
} from './harness/source-material'
import { ParseError, type HttpGet } from './harness/types'
import { parseList } from './list'

/** What an adapter makes of one entry's page. */
export interface Scraped<Item> {
  /** The entry's item, whose key (`contract.keyOf`) is the entry. */
  item: Item
  /** What the entry says beyond the item, for the side files. An adapter that keeps none leaves it out. */
  material?: EntryMaterial
  /**
   * What the scrape log should say about the page. None of it stops the item from being saved, and it is logged only
   * if the item is: a word that fails keeps its previous item and entries, so nothing said about the fresh ones applies.
   */
  warnings?: readonly string[]
}

/** How an adapter turns one list entry into an item. */
export interface EntryScraper<Item> {
  /** Fetch the page that describes `entry`, following any redirects or disambiguation. */
  fetchPage(entry: string, get: HttpGet): Promise<string>
  /** Turn a fetched page into the entry's item and source material. Throws ParseError if it is not the right page. */
  parse(html: string, entry: string): Scraped<Item>
}

export interface ScrapeListOptions<Item> {
  scraper: EntryScraper<Item>
  /**
   * What every item must satisfy before it is saved; its problems turn into a `ParseError`. If it has a `carryOver`
   * hook, a fetched entry that already had an item gets what was written by hand in that one before it is checked.
   */
  contract: Contract<Item>
  entries: readonly string[]
  /** Items from the previous run. */
  existing: readonly Item[]
  /** The side files of the previous run (none if left out). */
  existingMaterial?: SourceMaterial
  /** Re-fetch everything instead of only what is missing. */
  force: boolean
  get: HttpGet
  /**
   * Persists everything known so far, in the order of `entries`: the items, and the side files that go with them.
   * Called after every entry that was scraped successfully (and once at the start if items or side files were
   * pruned or re-ordered), never for a failure. If it rejects, `scrapeList` rejects at once and fetches nothing
   * more: a run that cannot save must not carry on.
   */
  save: (items: readonly Item[], material: SourceMaterial) => Promise<void>
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

/** What is known of one listed entry: its item, and its entries in the side files if it has any. */
interface Known<Item> {
  item: Item
  material: WordMaterial
}

/**
 * Items are in the order of `entries`. Entries that failed are absent unless an earlier item for them existed. The
 * side files follow the items: in what is handed to `save`, a word has entries only if it has an item, so that (with
 * the run context's `save`) a side file never names a word its dataset lacks. That is the whole guarantee. The three
 * files cannot be replaced in one step, so a run that stops between two writes may leave a word's fresh entries
 * beside its previous item.
 */
export async function scrapeList<Item>(options: ScrapeListOptions<Item>): Promise<RunResult<Item>> {
  const {
    scraper,
    contract,
    entries,
    existing,
    existingMaterial = NO_SOURCE_MATERIAL,
    force,
    get,
    save,
    maxConsecutiveFetchFailures = 5,
    failCooldownMs = 0,
    log = () => {},
    sleep = (ms) => new Promise((r) => setTimeout(r, ms)),
  } = options
  const { listed, previous, toTry } = planRun(contract, entries, existing, force)
  const scraped = new Map<string, Known<Item>>()
  const failures: Failure[] = []
  let fetchFailuresInARow = 0

  const previousMaterial = materialByWord(existingMaterial)
  // The text of every article known: the previous run's, then each page's as it is fetched (the latest wins).
  const articles: Record<string, string> = { ...existingMaterial.articles }

  // What is known right now: this run's item if there is one, else the previous one. A failed refresh must not
  // throw away data that was good, so every failure path leaves the previous item in place, and its entries in the
  // side files with it.
  const knownOf = (entry: string): Known<Item> | undefined => {
    const fresh = scraped.get(entry)
    if (fresh) return fresh
    const item = previous.get(entry)
    return item && { item, material: previousMaterial.get(entry) ?? {} }
  }
  const snapshot = (): { items: Item[]; material: SourceMaterial } => {
    const known = listed.flatMap((entry) => knownOf(entry) ?? [])
    return { items: known.map(({ item }) => item), material: sourceMaterialOf(known.map(({ material }) => material), articles) }
  }

  // Save at the start only if pruning or re-ordering changed the dataset or a side file.
  const initial = snapshot()
  const keysOf = (items: readonly Item[], material: SourceMaterial) => [items.map((item) => contract.keyOf(item)), ...sideFileKeys(material)]
  const before = keysOf(existing, existingMaterial)
  const unchanged = keysOf(initial.items, initial.material).every(
    (keys, i) => keys.length === before[i]!.length && keys.every((key, j) => key === before[i]![j]),
  )
  if (!unchanged) await save(initial.items, initial.material)

  let tried = 0
  for (const entry of toTry) {
    if (fetchFailuresInARow >= maxConsecutiveFetchFailures) {
      failures.push({ entry, reason: 'not attempted: the site stopped responding' })
      continue
    }

    tried++
    const progress = `(${tried}/${toTry.length})`
    // The checked item with what the page and the carry-over say about it, which is logged once it is saved.
    let toSave: Scraped<Item> | undefined
    while (toSave === undefined) {
      try {
        const html = await scraper.fetchPage(entry, get)
        fetchFailuresInARow = 0
        const parsed = scraper.parse(html, entry)
        const earlier = previous.get(entry)
        const carried = earlier && contract.carryOver ? contract.carryOver(earlier, parsed.item) : { item: parsed.item, warnings: [] }
        const problems = contract.validateItem(carried.item)
        if (problems.length > 0) throw new ParseError(problems.join('; '))
        toSave = { ...parsed, item: carried.item, warnings: [...(parsed.warnings ?? []), ...carried.warnings] }
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
    if (toSave === undefined) continue

    // Outside the try: a failed save is fatal, not a failure of this entry.
    const { item, material, warnings = [] } = toSave
    scraped.set(entry, { item, material: material ? wordMaterialOf(entry, material) : {} })
    Object.assign(articles, material?.articles)
    const now = snapshot()
    await save(now.items, now.material)
    for (const warning of warnings) log(`warn   ${entry} ${progress}: ${warning}`)
    log(`ok     ${entry} ${progress}`)
  }
  return { items: snapshot().items, failures }
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
    existingMaterial: context.existingMaterial,
    force,
    get: context.get,
    save: context.save,
    failCooldownMs: context.failCooldownMs,
    log: context.log,
  })
}

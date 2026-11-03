import type { Item } from '../src/core/cell'
import type { Contract } from '../src/core/contract'
import { ParseError, type HttpGet, type ScrapableExercise } from './exercise'

export interface ScrapeOptions {
  exercise: ScrapableExercise
  /** What every item must satisfy before it is saved; its problems turn into a `ParseError`. */
  contract: Contract<Item>
  prompts: readonly string[]
  /** Items from the previous run. */
  existing: readonly Item[]
  /** Re-fetch everything instead of only what is missing. */
  force: boolean
  get: HttpGet
  /**
   * Persists everything known so far, in the order of `prompts`. Called after every verb that was scraped
   * successfully (and once at the start if verbs were pruned or re-ordered), never for a failure. If it
   * rejects, `scrape` rejects at once and fetches nothing more: a run that cannot save must not carry on.
   */
  save: (items: readonly Item[]) => Promise<void>
  /**
   * After this many fetches in a row that fail for reasons other than the page's content (timeouts, errors,
   * "busy"), the site is assumed to be down and the remaining prompts are not tried. Default 5.
   */
  maxConsecutiveFetchFailures?: number
  /**
   * When a verb fails for reasons other than the page's content (see above), wait this long and try the same
   * verb again instead of moving on to the next one. Each such failure counts towards
   * `maxConsecutiveFetchFailures`, so a site that stays down is still given up on. 0 (the default) turns it off.
   */
  failCooldownMs?: number
  log?: (message: string) => void
  sleep?: (ms: number) => Promise<void>
}

export interface Failure {
  prompt: string
  reason: string
}

export interface ScrapeResult {
  /** In the order of `prompts`. Prompts that failed are absent unless an earlier version of them existed. */
  items: Item[]
  failures: Failure[]
}

export async function scrape(options: ScrapeOptions): Promise<ScrapeResult> {
  const {
    exercise,
    contract,
    prompts,
    existing,
    force,
    get,
    save,
    maxConsecutiveFetchFailures = 5,
    failCooldownMs = 0,
    log = () => {},
    sleep = (ms) => new Promise((r) => setTimeout(r, ms)),
  } = options
  const listed = [...new Set(prompts)]
  const inList = new Set(listed)
  const previous = new Map(existing.filter((item) => inList.has(item.prompt)).map((item) => [item.prompt, item]))
  const scraped = new Map<string, Item>()
  const failures: Failure[] = []
  let fetchFailuresInARow = 0

  // What is known right now: this run's item if there is one, else the previous one. A failed refresh must not
  // throw away data that was good, so every failure path leaves the previous item in place.
  const snapshot = (): Item[] =>
    listed.flatMap((prompt) => {
      const item = scraped.get(prompt) ?? previous.get(prompt)
      return item ? [item] : []
    })

  const initial = snapshot()
  const unchanged = initial.length === existing.length && initial.every((item, i) => item.prompt === existing[i]?.prompt)
  if (!unchanged) await save(initial)

  const toTry = force ? listed : listed.filter((prompt) => !previous.has(prompt))
  let tried = 0
  for (const prompt of toTry) {
    if (fetchFailuresInARow >= maxConsecutiveFetchFailures) {
      failures.push({ prompt, reason: 'not attempted: the site stopped responding' })
      continue
    }

    tried++
    const progress = `(${tried}/${toTry.length})`
    let item: Item | undefined
    while (item === undefined) {
      try {
        const html = await exercise.fetchPage(prompt, get)
        fetchFailuresInARow = 0
        const candidate: Item = { prompt, cells: exercise.parse(html, prompt) }
        const problems = contract.validateItem(candidate)
        if (problems.length > 0) throw new ParseError(problems.join('; '))
        item = candidate
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error)
        const fetchFailed = !(error instanceof ParseError)
        if (fetchFailed) fetchFailuresInARow++
        // Waiting only helps when the site is the problem, and is pointless once the run is about to give up.
        if (fetchFailed && failCooldownMs > 0 && fetchFailuresInARow < maxConsecutiveFetchFailures) {
          log(`retry  ${prompt} ${progress}: ${reason}; cooling down for ${failCooldownMs / 1000} s first`)
          await sleep(failCooldownMs)
          continue
        }
        failures.push({ prompt, reason })
        log(`FAILED ${prompt} ${progress}: ${reason}`)
        break
      }
    }
    if (item === undefined) continue

    // Outside the try: a failed save is fatal, not a failure of this verb.
    scraped.set(prompt, item)
    await save(snapshot())
    log(`ok     ${prompt} ${progress}`)
  }
  return { items: snapshot(), failures }
}

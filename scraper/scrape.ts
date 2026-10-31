import type { Item } from '../src/core/cell'
import { ParseError, type HttpGet, type ScrapableExercise } from './exercise'

export interface ScrapeOptions {
  exercise: ScrapableExercise
  prompts: readonly string[]
  /** Items from the previous run. */
  existing: readonly Item[]
  /** Re-fetch everything instead of only what is missing. */
  force: boolean
  get: HttpGet
  /**
   * After this many fetches in a row that fail for reasons other than the page's content (timeouts, errors,
   * "busy"), the site is assumed to be down and the remaining prompts are not tried. Default 5.
   */
  maxConsecutiveFetchFailures?: number
  log?: (message: string) => void
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
  const { exercise, prompts, existing, force, get, maxConsecutiveFetchFailures = 5, log = () => {} } = options
  const known = new Map(existing.map((item) => [item.prompt, item]))
  const items: Item[] = []
  const failures: Failure[] = []
  let fetchFailuresInARow = 0

  for (const prompt of new Set(prompts)) {
    const kept = force ? undefined : known.get(prompt)
    if (kept) {
      items.push(kept)
      continue
    }

    // A failed refresh must not throw away data that was good, so every failure path keeps the old item.
    const previous = known.get(prompt)

    if (fetchFailuresInARow >= maxConsecutiveFetchFailures) {
      failures.push({ prompt, reason: 'not attempted: the site stopped responding' })
      if (previous) items.push(previous)
      continue
    }

    try {
      const html = await exercise.fetchPage(prompt, get)
      fetchFailuresInARow = 0
      const cells = exercise.parse(html, prompt)
      const empty = cells.find((cell) => cell.acceptedForms.length === 0)
      if (empty) throw new ParseError(`no form found for ${empty.label}`)
      items.push({ prompt, cells })
      log(`ok     ${prompt}`)
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error)
      if (!(error instanceof ParseError)) fetchFailuresInARow++
      failures.push({ prompt, reason })
      log(`FAILED ${prompt}: ${reason}`)
      if (previous) items.push(previous)
    }
  }
  return { items, failures }
}

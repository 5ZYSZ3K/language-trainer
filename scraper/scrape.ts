import type { Item } from '../src/core/cell'
import type { HttpGet, ScrapableExercise } from './exercise'

export interface ScrapeOptions {
  exercise: ScrapableExercise
  prompts: readonly string[]
  /** Items from the previous run. */
  existing: readonly Item[]
  /** Re-fetch everything instead of only what is missing. */
  force: boolean
  get: HttpGet
  log?: (message: string) => void
}

export interface Failure {
  prompt: string
  reason: string
}

export interface ScrapeResult {
  /** In the order of `prompts`. Prompts that failed are absent. */
  items: Item[]
  failures: Failure[]
}

export async function scrape(options: ScrapeOptions): Promise<ScrapeResult> {
  const { exercise, prompts, existing, force, get, log = () => {} } = options
  const known = new Map(existing.map((item) => [item.prompt, item]))
  const items: Item[] = []
  const failures: Failure[] = []
  for (const prompt of new Set(prompts)) {
    const kept = force ? undefined : known.get(prompt)
    if (kept) {
      items.push(kept)
      continue
    }
    try {
      const html = await exercise.fetchPage(prompt, get)
      const cells = exercise.parse(html, prompt)
      const empty = cells.find((cell) => cell.acceptedForms.length === 0)
      if (empty) throw new Error(`no form found for ${empty.label}`)
      items.push({ prompt, cells })
      log(`ok     ${prompt}`)
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error)
      failures.push({ prompt, reason })
      log(`FAILED ${prompt}: ${reason}`)
    }
  }
  return { items, failures }
}

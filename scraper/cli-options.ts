import type { TargetFilter } from './harness/targets'

export const USAGE = `Usage: npm run scrape [-- --source <id>] [--language <id>] [--quiz <id>] [--force] [--delay-ms <ms>] [--fail-cooldown <duration>]
  --source <id>               only the targets of this source (e.g. prirucka)
  --language <id>             only the targets for this learned language (e.g. cs)
  --quiz <id>                 only the targets for this quiz type (e.g. verb-present-tense)
                              With no filter the only target runs; if there are several, they are listed instead.
  --force                     re-fetch every item, not only the missing ones
  --delay-ms <ms>             pause between one request finishing and the next starting (default: the source's own,
                              1500 for prirucka); can also be set with the SCRAPE_DELAY_MS environment variable, the
                              flag wins
  --fail-cooldown <duration>  when an item cannot be fetched (after the usual retries), stop for this long and then
                              try that item again instead of moving on; a number and a unit: 500ms, 90s, 10m, 1h.
                              Off by default. The run still gives up after several failures in a row.`

export interface CliOptions extends TargetFilter {
  force: boolean
  /** Undefined: each source's request policy decides. */
  delayMs: number | undefined
  /** 0 means no cooldown. */
  failCooldownMs: number
}

export type ParsedArgs = { options: CliOptions } | { error: string }

function parseMilliseconds(source: string, value: string): number | string {
  if (!/^\d+$/.test(value.trim())) return `${source} must be a whole number of milliseconds (0 or more), got "${value}"`
  return Number(value)
}

const UNIT_MS = { ms: 1, s: 1000, m: 60_000, h: 3_600_000 }

/** A unit is required: `--delay-ms` is in milliseconds, so a bare number here could be read as ms or as seconds. */
function parseDuration(source: string, value: string): number | string {
  const match = /^(\d+)(ms|s|m|h)$/.exec(value.trim())
  if (!match) return `${source} must be a whole number with a unit, such as 500ms, 90s, 10m or 1h, got "${value}"`
  return Number(match[1]) * UNIT_MS[match[2] as keyof typeof UNIT_MS]
}

/** Each filter flag, the option it sets and an example value for the error message. */
const FILTER_FLAGS = {
  '--source': ['source', 'prirucka'],
  '--language': ['language', 'cs'],
  '--quiz': ['quizType', 'verb-present-tense'],
} as const

export function parseCliOptions(args: readonly string[], env: Readonly<Record<string, string | undefined>>): ParsedArgs {
  let force = false
  let delay: number | string | undefined
  let cooldown: number | string | undefined
  const filter: TargetFilter = {}
  const unknown: string[] = []

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]!
    const filterFlag = Object.keys(FILTER_FLAGS).find((flag) => arg === flag || arg.startsWith(`${flag}=`)) as
      | keyof typeof FILTER_FLAGS
      | undefined
    if (arg === '--force') {
      force = true
    } else if (filterFlag) {
      const value = arg === filterFlag ? args[++i] : arg.slice(filterFlag.length + 1)
      const [key, example] = FILTER_FLAGS[filterFlag]
      if (value === undefined || value === '' || value.startsWith('--')) return { error: `${filterFlag} needs a value, e.g. ${filterFlag} ${example}` }
      filter[key] = value
    } else if (arg === '--delay-ms' || arg.startsWith('--delay-ms=')) {
      const value = arg === '--delay-ms' ? args[++i] : arg.slice('--delay-ms='.length)
      if (value === undefined) return { error: '--delay-ms needs a value, e.g. --delay-ms 3000' }
      delay = parseMilliseconds('--delay-ms', value)
    } else if (arg === '--fail-cooldown' || arg.startsWith('--fail-cooldown=')) {
      const value = arg === '--fail-cooldown' ? args[++i] : arg.slice('--fail-cooldown='.length)
      if (value === undefined) return { error: '--fail-cooldown needs a value, e.g. --fail-cooldown 10m' }
      cooldown = parseDuration('--fail-cooldown', value)
    } else {
      unknown.push(arg)
    }
  }
  if (unknown.length > 0) return { error: `Unknown argument: ${unknown.join(' ')}` }

  if (delay === undefined && env.SCRAPE_DELAY_MS) delay = parseMilliseconds('SCRAPE_DELAY_MS', env.SCRAPE_DELAY_MS)
  if (typeof delay === 'string') return { error: delay }
  if (typeof cooldown === 'string') return { error: cooldown }
  return { options: { force, delayMs: delay, failCooldownMs: cooldown ?? 0, ...filter } }
}

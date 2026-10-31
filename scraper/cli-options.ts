/** Pause between two requests when nothing says otherwise. */
export const DEFAULT_DELAY_MS = 1500

export const USAGE = `Usage: npm run scrape [-- --force] [--delay-ms <ms>] [--fail-cooldown <duration>]
  --force                     re-fetch every verb, not only the missing ones
  --delay-ms <ms>             pause between one request finishing and the next starting (default ${DEFAULT_DELAY_MS});
                              can also be set with the SCRAPE_DELAY_MS environment variable, the flag wins
  --fail-cooldown <duration>  when a verb cannot be fetched (after the usual retries), stop for this long and then
                              try that verb again instead of moving on; a number and a unit: 500ms, 90s, 10m, 1h.
                              Off by default. The run still gives up after several failures in a row.`

export interface CliOptions {
  force: boolean
  delayMs: number
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

export function parseCliOptions(args: readonly string[], env: Readonly<Record<string, string | undefined>>): ParsedArgs {
  let force = false
  let delay: number | string | undefined
  let cooldown: number | string | undefined
  const unknown: string[] = []

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]!
    if (arg === '--force') {
      force = true
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
  return { options: { force, delayMs: delay ?? DEFAULT_DELAY_MS, failCooldownMs: cooldown ?? 0 } }
}

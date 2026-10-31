/** Pause between two requests when nothing says otherwise. */
export const DEFAULT_DELAY_MS = 1500

export const USAGE = `Usage: npm run scrape [-- --force] [--delay-ms <ms>]
  --force          re-fetch every verb, not only the missing ones
  --delay-ms <ms>  pause between one request finishing and the next starting (default ${DEFAULT_DELAY_MS});
                   can also be set with the SCRAPE_DELAY_MS environment variable, the flag wins`

export interface CliOptions {
  force: boolean
  delayMs: number
}

export type ParsedArgs = { options: CliOptions } | { error: string }

function parseMilliseconds(source: string, value: string): number | string {
  if (!/^\d+$/.test(value.trim())) return `${source} must be a whole number of milliseconds (0 or more), got "${value}"`
  return Number(value)
}

export function parseCliOptions(args: readonly string[], env: Readonly<Record<string, string | undefined>>): ParsedArgs {
  let force = false
  let delay: number | string | undefined
  const unknown: string[] = []

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]!
    if (arg === '--force') {
      force = true
    } else if (arg === '--delay-ms' || arg.startsWith('--delay-ms=')) {
      const value = arg === '--delay-ms' ? args[++i] : arg.slice('--delay-ms='.length)
      if (value === undefined) return { error: '--delay-ms needs a value, e.g. --delay-ms 3000' }
      delay = parseMilliseconds('--delay-ms', value)
    } else {
      unknown.push(arg)
    }
  }
  if (unknown.length > 0) return { error: `Unknown argument: ${unknown.join(' ')}` }

  if (delay === undefined && env.SCRAPE_DELAY_MS) delay = parseMilliseconds('SCRAPE_DELAY_MS', env.SCRAPE_DELAY_MS)
  if (typeof delay === 'string') return { error: delay }
  return { options: { force, delayMs: delay ?? DEFAULT_DELAY_MS } }
}

import { TARGET_FLAGS, type TargetFilter } from './harness/targets'

export const USAGE = `Usage: npm run scrape [-- --source <id>] [--language <id>] [--quiz <id>] [--force] [--delay-ms <ms>] [--fail-cooldown <duration>]
  --source <id>               only the targets of this source (e.g. prirucka)
  --language <id>             only the targets for this learned language (e.g. cs)
  --quiz <id>                 only the targets for this quiz type (e.g. verb-present-tense)
                              With no filter the only target runs; if there are several, they are listed instead.
  --force                     re-fetch every item, not only the missing ones
  --delay-ms <ms>             pause between one request finishing and the next starting (default: the source's own
                              request policy); can also be set with the SCRAPE_DELAY_MS environment variable, the
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

/** An example value for each filter, for the error message of a flag given without one. */
const TARGET_EXAMPLES = { source: 'prirucka', language: 'cs', quizType: 'verb-present-tense' } as const satisfies Record<
  keyof TargetFilter,
  string
>

/** A flag that takes a value, as `--flag value` or `--flag=value`. */
interface ValueFlag {
  flag: string
  /** A complete example, shown when the value is missing. */
  example: string
  /** True for a value that is really no value: the filters do not take an empty one or another flag. */
  isMissing?(value: string): boolean
  /** Keeps the value. */
  set(value: string): void
}

export function parseCliOptions(args: readonly string[], env: Readonly<Record<string, string | undefined>>): ParsedArgs {
  let force = false
  // The numbers are parsed when the flag is read; a text is the parser's complaint, reported once all arguments are read.
  const parsed: { delay?: number | string; cooldown?: number | string } = {}
  const filter: TargetFilter = {}
  const unknown: string[] = []

  const valueFlags: readonly ValueFlag[] = [
    ...(Object.keys(TARGET_FLAGS) as (keyof TargetFilter)[]).map((key) => ({
      flag: TARGET_FLAGS[key],
      example: `${TARGET_FLAGS[key]} ${TARGET_EXAMPLES[key]}`,
      isMissing: (value: string) => value === '' || value.startsWith('--'),
      set: (value: string) => void (filter[key] = value),
    })),
    { flag: '--delay-ms', example: '--delay-ms 3000', set: (value) => void (parsed.delay = parseMilliseconds('--delay-ms', value)) },
    { flag: '--fail-cooldown', example: '--fail-cooldown 10m', set: (value) => void (parsed.cooldown = parseDuration('--fail-cooldown', value)) },
  ]

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]!
    if (arg === '--force') {
      force = true
      continue
    }
    const valueFlag = valueFlags.find(({ flag }) => arg === flag || arg.startsWith(`${flag}=`))
    if (!valueFlag) {
      unknown.push(arg)
      continue
    }
    const value = arg === valueFlag.flag ? args[++i] : arg.slice(valueFlag.flag.length + 1)
    if (value === undefined || valueFlag.isMissing?.(value)) return { error: `${valueFlag.flag} needs a value, e.g. ${valueFlag.example}` }
    valueFlag.set(value)
  }
  if (unknown.length > 0) return { error: `Unknown argument: ${unknown.join(' ')}` }

  let { delay } = parsed
  if (delay === undefined && env.SCRAPE_DELAY_MS) delay = parseMilliseconds('SCRAPE_DELAY_MS', env.SCRAPE_DELAY_MS)
  if (typeof delay === 'string') return { error: delay }
  if (typeof parsed.cooldown === 'string') return { error: parsed.cooldown }
  return { options: { force, delayMs: delay, failCooldownMs: parsed.cooldown ?? 0, ...filter } }
}

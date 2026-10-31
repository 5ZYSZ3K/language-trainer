/**
 * Build-time scraper. Usage: npm run scrape [-- --force] [--delay-ms <ms>] [--fail-cooldown <duration>]
 * (see USAGE in cli-options.ts)
 *
 * Reads czech_verbs.txt, fetches only the verbs missing from the existing data file (all of them with
 * --force) and saves public/data/ after every verb, so stopping the run (Ctrl-C, a crash, the site going
 * away) loses nothing. With --fail-cooldown, a verb the site would not serve is retried after a pause
 * instead of being skipped. Exits non-zero if any verb failed; the data of the verbs that worked is already
 * written. Only one scrape may run at a time (.scrape.lock).
 */
import { readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Item } from '../src/core/cell'
import { parseCliOptions, USAGE } from './cli-options'
import { readItems, writeData } from './data-file'
import { fetchText, politely } from './http'
import { acquireLock, LockHeldError, type Lock } from './lock'
import { scrape } from './scrape'
import { parseVerbList } from './verb-list'
import { isServerBusy, verbPresentTense } from './verb-present-tense'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const exercise = verbPresentTense
const verbsFile = resolve(root, 'czech_verbs.txt')
const dataFile = resolve(root, 'public', 'data', `${exercise.type}.json`)
// In the repo root, not under public/: Vite copies everything in public/ into dist/, and these must not be published.
const lockFile = resolve(root, '.scrape.lock')
const tmpDataFile = resolve(root, '.scrape-data.tmp')

const USER_AGENT = 'uceni-se-cestiny-scraper (+https://github.com/5ZYSZ3K/uceni-se-cestiny)'

async function main(): Promise<number> {
  const parsed = parseCliOptions(process.argv.slice(2), process.env)
  if ('error' in parsed) {
    console.error(`${parsed.error}\n${USAGE}`)
    return 2
  }
  const { force, delayMs, failCooldownMs } = parsed.options

  let lock: Lock
  try {
    lock = await acquireLock(lockFile)
  } catch (error) {
    if (!(error instanceof LockHeldError)) throw error
    const holder = error.pid === undefined ? '' : ` (pid ${error.pid})`
    console.error(`Another scrape is running${holder}; never run two at once. If it is not, delete ${lockFile}.`)
    return 2
  }
  process.on('exit', () => lock.release())

  // What the signal handler reports; filled in once the list and the data file have been read.
  let listedCount: number | undefined
  let savedCount = 0
  const onSignal = (code: number) => {
    console.error(
      listedCount === undefined ? '\nStopped.' : `\nStopped: ${savedCount} of ${listedCount} verbs saved in ${dataFile}`,
    )
    lock.release()
    process.exit(code)
  }
  process.on('SIGINT', () => onSignal(130))
  process.on('SIGTERM', () => onSignal(143))

  try {
    const prompts = parseVerbList(await readFile(verbsFile, 'utf8'))
    const listed = new Set(prompts)
    const existing = await readItems(dataFile, exercise.type)
    const alreadyScraped = existing.filter((item) => listed.has(item.prompt)).length
    listedCount = listed.size
    savedCount = alreadyScraped
    console.log(
      `${listed.size} verbs listed, ${alreadyScraped} already scraped, ${force ? listed.size : listed.size - alreadyScraped} to fetch${force ? ' (--force)' : ''}.`,
    )
    console.log(`Pausing ${delayMs} ms after each request.`)
    if (failCooldownMs > 0) console.log(`After a verb fails to fetch: cooling down for ${failCooldownMs / 1000} s, then trying it again.`)

    // One request at a time, `delayMs` after the previous one finished. The site is slow and sometimes answers
    // "busy"; back off and retry.
    const get = politely(fetchText({ timeoutMs: 30_000, userAgent: USER_AGENT }), {
      delayMs,
      retries: 4,
      retryDelayMs: 15_000,
      isUnusable: isServerBusy,
    })
    const save = async (items: readonly Item[]) => {
      await writeData(dataFile, tmpDataFile, { exerciseType: exercise.type, items: [...items] })
      savedCount = items.length
    }
    const { items, failures } = await scrape({ exercise, prompts, existing, force, get, save, failCooldownMs, log: console.log })

    console.log(`\nDone: ${items.length} verbs in ${dataFile}`)
    if (failures.length > 0) {
      console.error(`\n${failures.length} verb(s) failed and are excluded from the site:`)
      for (const { prompt, reason } of failures) console.error(`  - ${prompt}: ${reason}`)
      return 1
    }
    return 0
  } catch (error) {
    console.error(error)
    return 1
  } finally {
    lock.release()
  }
}

main().then(
  (code) => {
    process.exitCode = code
  },
  (error) => {
    console.error(error)
    process.exitCode = 1
  },
)

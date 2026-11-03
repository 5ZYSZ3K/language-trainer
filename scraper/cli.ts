/**
 * Build-time scraper. Usage: npm run scrape [-- --source <id>] [--language <id>] [--quiz <id>] [--force]
 * [--delay-ms <ms>] [--fail-cooldown <duration>] (see USAGE in cli-options.ts)
 *
 * Runs the registered adapters the filters select (with no filter, the only one; several are listed instead).
 * Each adapter writes data/<language>/<source>/<quiz type>.json after every item, so stopping the run (Ctrl-C,
 * a crash, the site going away) loses nothing. Exits non-zero if any item failed; the data of the items that
 * worked is already written. Only one scrape may run at a time (.scrape.lock).
 */
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { datasetPath } from '../src/datasets/pool'
import { QUIZ_TYPES } from '../src/quizzes'
import { parseCliOptions, USAGE } from './cli-options'
import { createRunContext, type RunProgress, type ScraperSource } from './harness/context'
import { politeGetter } from './harness/http'
import { acquireLock, LockHeldError, type Lock } from './harness/lock'
import { ADAPTERS, SCRAPER_SOURCES } from './harness/registry'
import { selectTargets, targetName } from './harness/targets'
import type { HttpGet } from './harness/types'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const listsDir = resolve(root, 'lists')
// In the repo root, on the same filesystem as data/ (the atomic save renames the temporary file over the data file).
const lockFile = resolve(root, '.scrape.lock')
const tmpDataFile = resolve(root, '.scrape-data.tmp')

async function main(): Promise<number> {
  const parsed = parseCliOptions(process.argv.slice(2), process.env)
  if ('error' in parsed) {
    console.error(`${parsed.error}\n${USAGE}`)
    return 2
  }
  const { force, delayMs, failCooldownMs } = parsed.options

  const selected = selectTargets(ADAPTERS, parsed.options)
  if ('error' in selected) {
    console.error(selected.error)
    return 2
  }

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

  // What the signal handler reports: the target being scraped, once its data file has been read.
  let current: { dataFile: string; progress: RunProgress } | undefined
  const onSignal = (code: number) => {
    const total = current?.progress.total
    console.error(
      current === undefined || total === undefined
        ? '\nStopped.'
        : `\nStopped: ${current.progress.saved} of ${total} items saved in ${current.dataFile}`,
    )
    lock.release()
    process.exit(code)
  }
  process.on('SIGINT', () => onSignal(130))
  process.on('SIGTERM', () => onSignal(143))

  // One polite getter per source for the whole run, so its pause also holds between that source's targets.
  const getters = new Map<string, HttpGet>()
  const getterFor = (source: ScraperSource): HttpGet => {
    const get = getters.get(source.id) ?? politeGetter(source.policy, { delayMs })
    getters.set(source.id, get)
    return get
  }

  try {
    let exitCode = 0
    for (const [i, adapter] of selected.targets.entries()) {
      console.log(`${i > 0 ? '\n' : ''}== ${targetName(adapter)} ==`)
      const quizType = QUIZ_TYPES.find((q) => q.id === adapter.quizType)
      if (!quizType) throw new Error(`Unknown quiz type ${adapter.quizType}`)
      const target = { language: adapter.language, source: adapter.source, quizType: adapter.quizType }
      const dataFile = resolve(root, 'data', datasetPath(target))
      const source = SCRAPER_SOURCES.find((s) => s.id === adapter.source)
      if (!source) throw new Error(`No request policy for source ${adapter.source}`)
      const get = getterFor(source)
      console.log(`Pausing ${delayMs ?? source.policy.delayMs} ms after each request.`)
      if (failCooldownMs > 0) console.log(`After an item fails to fetch: cooling down for ${failCooldownMs / 1000} s, then trying it again.`)

      const { context, progress } = await createRunContext({
        target,
        contract: quizType.contract,
        dataFile,
        tmpFile: tmpDataFile,
        listsDir,
        force,
        failCooldownMs,
        get,
        log: console.log,
      })
      current = { dataFile, progress }
      const { items, failures } = await adapter.run(context)

      console.log(`\nDone: ${items.length} items in ${dataFile}`)
      if (failures.length > 0) {
        console.error(`\n${failures.length} item(s) failed and are excluded from the site:`)
        for (const { entry, reason } of failures) console.error(`  - ${entry}: ${reason}`)
        exitCode = 1
      }
    }
    return exitCode
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

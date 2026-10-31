/**
 * Build-time scraper. Usage: npm run scrape [-- --force]
 *
 * Reads czech_verbs.txt, fetches only the verbs missing from the existing data file (all of them with
 * --force) and writes the merged data to public/data/. Exits non-zero if any verb failed; the data of
 * the verbs that worked is still written.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { ExerciseData, Item } from '../src/core/cell'
import { fetchText, politely } from './http'
import { scrape } from './scrape'
import { parseVerbList } from './verb-list'
import { isServerBusy, verbPresentTense } from './verb-present-tense'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const exercise = verbPresentTense
const verbsFile = resolve(root, 'czech_verbs.txt')
const dataFile = resolve(root, 'public', 'data', `${exercise.type}.json`)

const USER_AGENT = 'uceni-se-cestiny-scraper (+https://github.com/5ZYSZ3K/uceni-se-cestiny)'

async function readExisting(): Promise<Item[]> {
  let text: string
  try {
    text = await readFile(dataFile, 'utf8')
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return []
    throw error
  }
  const data = JSON.parse(text) as ExerciseData
  return data.exerciseType === exercise.type && Array.isArray(data.items) ? data.items : []
}

async function main(): Promise<number> {
  const args = process.argv.slice(2)
  const unknown = args.filter((a) => a !== '--force')
  if (unknown.length > 0) {
    console.error(`Unknown argument: ${unknown.join(' ')}\nUsage: npm run scrape [-- --force]`)
    return 2
  }
  const force = args.includes('--force')

  const prompts = parseVerbList(await readFile(verbsFile, 'utf8'))
  const existing = await readExisting()
  const wanted = new Set(prompts)
  const toFetch = force ? wanted.size : [...wanted].filter((p) => !existing.some((i) => i.prompt === p)).length
  console.log(`${wanted.size} verbs listed, ${existing.length} already scraped${force ? ' (--force: fetching all)' : ''}; fetching ${toFetch}.`)

  // One request at a time, 1.5 s apart. The site is slow and sometimes answers "busy"; back off and retry.
  const get = politely(fetchText({ timeoutMs: 30_000, userAgent: USER_AGENT }), {
    delayMs: 1500,
    retries: 4,
    retryDelayMs: 15_000,
    isUnusable: isServerBusy,
  })
  const { items, failures } = await scrape({ exercise, prompts, existing, force, get, log: console.log })

  const data: ExerciseData = { exerciseType: exercise.type, items }
  await mkdir(dirname(dataFile), { recursive: true })
  await writeFile(dataFile, JSON.stringify(data))

  console.log(`\nDone: ${items.length} verbs in ${dataFile}`)
  if (failures.length > 0) {
    console.error(`\n${failures.length} verb(s) failed and are excluded from the site:`)
    for (const { prompt, reason } of failures) console.error(`  - ${prompt}: ${reason}`)
    return 1
  }
  return 0
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

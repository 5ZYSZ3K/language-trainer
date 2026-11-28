/**
 * Usage: npm run join:cs:adjectives | join:cs:demonstratives | join:cs:personal-pronouns  (tsx scripts/join.ts <language>/<source>/<quiz type>)
 *
 * Makes a joined dataset again from its committed inputs (scripts/joins) and writes it to data/, laid out by Prettier
 * and replaced in one step like the scraper's files. If the join finds any problem in its inputs, it writes nothing,
 * lists every problem and exits 1. Run it after any of its inputs changes, then commit the file; check-data fails the
 * build while the committed file is out of step.
 */
import { realpathSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { writeData } from '../scraper/harness/data-file'
import { datasetPath, poolKey } from '../src/datasets/pool'
import { JOINS } from './joins'
import { readJoinInputs, type Join } from './joins/join'

/** Where the file is written first, in the repository root, before it is renamed over the dataset (git-ignored). */
const TMP_FILE = '.join-data.tmp'

export interface JoinOptions {
  /** The repository root. */
  readonly root: string
  /** The pool key of the joined dataset to make, e.g. `cs/language-trainer/adjective-noun-declension`. */
  readonly key: string | undefined
  readonly joins: readonly Join[]
  readonly log: (line: string) => void
}

/** Runs the join `key` names over the repository at `root`. Gives the exit code: 0 written, 1 refused, 2 bad usage. */
export async function runJoin({ root, key, joins, log }: JoinOptions): Promise<number> {
  const chosen = joins.find((entry) => poolKey(entry.pool) === key)
  if (!chosen) {
    log(`Usage: tsx scripts/join.ts <language>/<source>/<quiz type>, one of: ${joins.map((entry) => poolKey(entry.pool)).join(', ')}`)
    return 2
  }
  const file = `data/${datasetPath(chosen.pool)}`
  const { items, problems } = chosen.make(await readJoinInputs(root, chosen))
  if (problems.length > 0) {
    log(`Nothing written: ${file} cannot be joined, ${problems.length} problem(s):`)
    for (const problem of problems) log(`  - ${problem}`)
    return 1
  }
  await writeData(join(root, file), join(root, TMP_FILE), { ...chosen.pool, items })
  log(`Joined ${file}: ${items.length} items.`)
  return 0
}

const isEntryPoint = process.argv[1] !== undefined && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))
if (isEntryPoint) {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
  process.exitCode = await runJoin({ root, key: process.argv[2], joins: JOINS, log: (line) => console.log(line) })
}

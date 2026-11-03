/**
 * Usage: npm run check-data  (also the second step of `npm run build`)
 *
 * Validates the committed datasets in data/ against the registries, so that a broken or empty site is never
 * built, and therefore never published. Lists every problem, then exits 1.
 */
import { realpathSync } from 'node:fs'
import { readdir, readFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { isRecord } from '../src/core/is-record'
import { datasetPath, POOL_FIELDS, type Pool } from '../src/datasets/pool'
import { QUIZ_TYPES, type QuizType } from '../src/quizzes'
import { findById } from '../src/registry'
import { SOURCES, type Source } from '../src/sources'

export interface DataRegistries {
  readonly sources: readonly Source[]
  readonly quizTypes: readonly QuizType<unknown>[]
}

export interface DataCheck {
  /** One line per problem, each starting with the file it is about; empty means the data is fine. */
  readonly problems: string[]
  /** The number of items in all datasets together (invalid ones included). */
  readonly items: number
}

/**
 * Checks the contents of data/ against what the sources provide. `files` maps each file's path below data/
 * (slash-separated, e.g. `cs/prirucka/verb-present-tense.json`) to its text. A problem is reported if:
 * a dataset provided with `bundled` delivery has no file; a file is not provided by any source; a file's
 * envelope (language, source, quiz type) does not match its location; an item violates its quiz type's
 * contract; or no dataset holds any item at all (an empty site). A dataset with zero items is valid.
 */
export function checkData({ sources, quizTypes }: DataRegistries, files: Readonly<Record<string, string>>): DataCheck {
  const problems: string[] = []

  const provided = new Map<string, { language: string; source: Source; quizType: string; bundled: boolean }>()
  for (const source of sources) {
    for (const { language, quizType, delivery } of source.provides) {
      provided.set(datasetPath({ language, source: source.id, quizType }), { language, source, quizType, bundled: delivery.kind === 'bundled' })
    }
  }

  for (const [path, entry] of provided) {
    if (entry.bundled && !(path in files)) {
      problems.push(`data/${path}: missing, but ${entry.source.id} provides it with bundled delivery`)
    }
  }

  let items = 0
  for (const path of Object.keys(files).sort()) {
    const where = `data/${path}`
    const entry = provided.get(path)
    if (!entry) {
      problems.push(`${where}: not provided by any source`)
      continue
    }

    let data: unknown
    try {
      data = JSON.parse(files[path]!)
    } catch {
      problems.push(`${where}: not valid JSON`)
      continue
    }
    if (!isRecord(data)) {
      problems.push(`${where}: must be a JSON object with ${POOL_FIELDS.join(', ')} and items`)
      continue
    }

    const expected: Pool = { language: entry.language, source: entry.source.id, quizType: entry.quizType }
    for (const field of POOL_FIELDS) {
      if (data[field] !== expected[field]) {
        problems.push(`${where}: ${field} is ${JSON.stringify(data[field])} but the file location says ${JSON.stringify(expected[field])}`)
      }
    }

    if (!Array.isArray(data.items)) {
      problems.push(`${where}: items must be a list`)
      continue
    }
    items += data.items.length

    const quizType = findById(quizTypes, entry.quizType)
    if (!quizType) {
      problems.push(`${where}: quiz type "${entry.quizType}" is not registered`)
      continue
    }
    data.items.forEach((item: unknown, i) => {
      for (const problem of quizType.contract.validateItem(item)) problems.push(`${where}: item ${i + 1}: ${problem}`)
    })
  }

  if (items === 0) problems.push('no dataset holds any item, so the site would be empty. Run: npm run scrape')
  return { problems, items }
}

/**
 * Every file below `dir` (dotfiles such as .DS_Store skipped) keyed by its slash-separated path from `dir`.
 * A missing folder has no files.
 */
export async function readDataFiles(dir: string): Promise<Record<string, string>> {
  const files: Record<string, string> = {}
  async function walk(folder: string, prefix: string): Promise<void> {
    let entries
    try {
      entries = await readdir(folder, { withFileTypes: true })
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return
      throw error
    }
    for (const entry of entries) {
      if (entry.name.startsWith('.')) continue
      if (entry.isDirectory()) await walk(join(folder, entry.name), `${prefix}${entry.name}/`)
      else files[`${prefix}${entry.name}`] = await readFile(join(folder, entry.name), 'utf8')
    }
  }
  await walk(dir, '')
  return files
}

const isEntryPoint = process.argv[1] !== undefined && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))
if (isEntryPoint) {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
  const files = await readDataFiles(join(root, 'data'))
  const { problems, items } = checkData({ sources: SOURCES, quizTypes: QUIZ_TYPES }, files)
  if (problems.length > 0) {
    console.error(`Data check failed, ${problems.length} problem(s):`)
    for (const problem of problems) console.error(`  - ${problem}`)
    process.exitCode = 1
  } else {
    console.log(`Data OK: ${items} items in ${Object.keys(files).length} dataset file(s).`)
  }
}

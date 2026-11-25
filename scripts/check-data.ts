/**
 * Usage: npm run check-data  (also the second step of `npm run build`)
 *
 * Validates the committed datasets in data/ against the registries, so that a broken or empty site is never
 * built, and therefore never published; then the side files in source-material/ against their datasets. Lists
 * every problem, then exits 1.
 */
import { realpathSync } from 'node:fs'
import { readdir, readFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { dictionariesPath } from '../scraper/harness/source-material'
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
 * contract, or repeats the key (`keyOf`) of an earlier item of its file; or no dataset holds any item at all (an
 * empty site). A dataset with zero items is valid.
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

    const data = readEnvelope(where, files[path]!, { language: entry.language, source: entry.source.id, quizType: entry.quizType }, problems)
    if (!data) continue
    items += data.items.length

    const quizType = findById(quizTypes, entry.quizType)
    if (!quizType) {
      problems.push(`${where}: quiz type "${entry.quizType}" is not registered`)
      continue
    }
    // Valid items must also differ in their key (the contract's identity of an item); an invalid one may have no key.
    const keys = new Set<string>()
    data.items.forEach((item: unknown, i) => {
      const itemProblems = quizType.contract.validateItem(item)
      for (const problem of itemProblems) problems.push(`${where}: item ${i + 1}: ${problem}`)
      if (itemProblems.length > 0) return
      const key = quizType.contract.keyOf(item)
      if (keys.has(key)) problems.push(`${where}: item ${i + 1}: repeats the key ${JSON.stringify(key)} of an earlier item`)
      keys.add(key)
    })
  }

  if (items === 0) problems.push('no dataset holds any item, so the site would be empty. Run: npm run scrape:cs:verbs or npm run scrape:cs:nouns')
  return { problems, items }
}

/**
 * The parsed file, a dataset or a side file, once its envelope and item list have been checked: undefined, with the
 * reason added to `problems`, if it is not valid JSON, not an object or has no item list. An envelope field that does
 * not match the file's location (`expected`) is a problem too, but the rest of the file can still be checked.
 */
function readEnvelope(where: string, text: string, expected: Pool, problems: string[]): (Record<string, unknown> & { items: unknown[] }) | undefined {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    problems.push(`${where}: not valid JSON`)
    return undefined
  }
  if (!isRecord(data)) {
    problems.push(`${where}: must be a JSON object with ${POOL_FIELDS.join(', ')} and items`)
    return undefined
  }
  for (const field of POOL_FIELDS) {
    if (data[field] !== expected[field]) {
      problems.push(`${where}: ${field} is ${JSON.stringify(data[field])} but the file location says ${JSON.stringify(expected[field])}`)
    }
  }
  if (!Array.isArray(data.items)) {
    problems.push(`${where}: items must be a list`)
    return undefined
  }
  return { ...data, items: data.items }
}

export interface SourceMaterialCheck {
  /** One line per problem, each starting with the file it is about; empty means the side files are fine. */
  readonly problems: string[]
  /** The number of side files checked. */
  readonly files: number
}

/**
 * Checks the side files in source-material/ (see scraper/harness/source-material.ts). `sideFiles` maps each file's path
 * below source-material/ to its text, and `dataFiles` each path below data/ to its text. A missing side file is fine:
 * its words may not have been scraped since source material was kept. A problem is reported if a file is not a side
 * file of a dataset that a source provides through an adapter; a side file is not valid JSON, its envelope does not
 * match its location, or it has no item list; one of its words is not an item of its dataset (or that dataset cannot
 * be read); or, in a source-material file, a line or a cell leads to an article that is not a key of its `footnotes`.
 */
export function checkSourceMaterial(
  { sources, quizTypes }: DataRegistries,
  dataFiles: Readonly<Record<string, string>>,
  sideFiles: Readonly<Record<string, string>>,
): SourceMaterialCheck {
  const problems: string[] = []

  const sideFileOf = new Map<string, { pool: Pool; kind: 'material' | 'dictionaries' }>()
  for (const source of sources) {
    for (const { language, quizType, manual } of source.provides) {
      if (manual) continue
      const pool: Pool = { language, source: source.id, quizType }
      // The source-material file is named like its dataset.
      sideFileOf.set(datasetPath(pool), { pool, kind: 'material' })
      sideFileOf.set(dictionariesPath(pool), { pool, kind: 'dictionaries' })
    }
  }

  for (const path of Object.keys(sideFiles).sort()) {
    const where = `source-material/${path}`
    const side = sideFileOf.get(path)
    if (!side) {
      problems.push(`${where}: not a side file of any dataset a source scrapes`)
      continue
    }

    const data = readEnvelope(where, sideFiles[path]!, side.pool, problems)
    if (!data) continue

    // The source-material file's articles, by id, which it keeps under `footnotes`.
    let articles: Record<string, unknown> | undefined
    if (side.kind === 'material') {
      if (isRecord(data.footnotes)) articles = data.footnotes
      else problems.push(`${where}: footnotes must be an object of articles by id`)
    }

    const datasetFile = `data/${datasetPath(side.pool)}`
    const words = wordsOf(quizTypes, side.pool, dataFiles[datasetPath(side.pool)])
    if (words === 'unreadable') problems.push(`${where}: its dataset ${datasetFile} cannot be read, so its words cannot be checked`)

    data.items.forEach((item: unknown, i) => {
      const prompt = isRecord(item) ? item.prompt : undefined
      if (typeof prompt !== 'string') return void problems.push(`${where}: item ${i + 1} has no prompt`)
      if (words instanceof Set && !words.has(prompt)) problems.push(`${where}: item ${i + 1}: ${JSON.stringify(prompt)} is not an item of ${datasetFile}`)
      if (articles) {
        for (const problem of articleIdProblems(item as Record<string, unknown>, articles)) {
          problems.push(`${where}: item ${i + 1} (${JSON.stringify(prompt)}): ${problem}`)
        }
      }
    })
  }
  return { problems, files: Object.keys(sideFiles).length }
}

/**
 * The keys of the valid items of a pool's dataset file, `'unreadable'` if there is no such file or it cannot be read
 * as a dataset, or undefined if its quiz type is not registered (`checkData` reports that).
 */
function wordsOf(quizTypes: readonly QuizType<unknown>[], pool: Pool, text: string | undefined): Set<string> | 'unreadable' | undefined {
  const quizType = findById(quizTypes, pool.quizType)
  if (!quizType) return undefined
  let data: unknown
  try {
    data = text === undefined ? undefined : JSON.parse(text)
  } catch {
    return 'unreadable'
  }
  if (!isRecord(data) || !Array.isArray(data.items)) return 'unreadable'
  const valid = data.items.filter((item: unknown) => quizType.contract.validateItem(item).length === 0)
  return new Set(valid.map((item) => quizType.contract.keyOf(item)))
}

/** What is wrong with the article ids of a source-material entry's lines and cells, given the file's articles. */
function articleIdProblems(entry: Record<string, unknown>, articles: Record<string, unknown>): string[] {
  const problems: string[] = []
  const missing = (ids: unknown[], what: string) => {
    for (const id of ids) if (typeof id !== 'string' || !(id in articles)) problems.push(`${what} leads to article ${String(id)}, which is not in footnotes`)
  }

  if (!Array.isArray(entry.lines)) problems.push('lines must be a list')
  else {
    entry.lines.forEach((line: unknown, i) => {
      const what = `line ${i + 1}${isRecord(line) && typeof line.label === 'string' ? ` (${line.label})` : ''}`
      if (!isRecord(line) || !Array.isArray(line.footnotes)) return void problems.push(`line ${i + 1} must have a list of footnotes`)
      missing(line.footnotes, what)
    })
  }

  if (!isRecord(entry.cellFootnotes)) problems.push('cellFootnotes must be an object of footnote lists by cell id')
  else {
    for (const [cell, ids] of Object.entries(entry.cellFootnotes)) {
      if (!Array.isArray(ids)) problems.push(`cell ${cell} must have a list of footnotes`)
      else missing(ids, `cell ${cell}`)
    }
  }
  return problems
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
  const registries = { sources: SOURCES, quizTypes: QUIZ_TYPES }
  const files = await readDataFiles(join(root, 'data'))
  const sideFiles = await readDataFiles(join(root, 'source-material'))
  const data = checkData(registries, files)
  const material = checkSourceMaterial(registries, files, sideFiles)
  const problems = [...data.problems, ...material.problems]
  if (problems.length > 0) {
    console.error(`Data check failed, ${problems.length} problem(s):`)
    for (const problem of problems) console.error(`  - ${problem}`)
    process.exitCode = 1
  } else {
    console.log(`Data OK: ${data.items} items in ${Object.keys(files).length} dataset file(s), ${material.files} source-material file(s).`)
  }
}

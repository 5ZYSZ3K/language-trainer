import type { Contract } from '../../src/core/contract'
import { readItems, writeData, type DataTarget } from './data-file'
import type { RequestPolicy } from './http'
import { readSourceMaterial, wordsIn, writeSourceMaterial, type SideFiles, type SourceMaterial } from './source-material'
import type { HttpGet } from './types'

/** An entry the run could not turn into an item, and why. */
export interface Failure {
  entry: string
  reason: string
}

export interface RunResult<Item> {
  /** Everything in the data file at the end of the run. */
  items: readonly Item[]
  /** Every entry that failed or was not attempted; any of these makes the run exit 1. */
  failures: readonly Failure[]
}

/** What the harness hands an adapter for one run. */
export interface RunContext<Item> {
  readonly target: DataTarget
  /** The target quiz type's contract. `save` enforces it; an adapter checks each item with it first. */
  readonly contract: Contract<Item>
  /** The items in the data file when the run started (none if there is no file or it is for another target). */
  readonly existing: readonly Item[]
  /** What the side files held when the run started (nothing if there are none, or they are for another target). */
  readonly existingMaterial: SourceMaterial
  /** --force: re-fetch every item, not only the missing ones. */
  readonly force: boolean
  /** --fail-cooldown in ms; 0 means off. */
  readonly failCooldownMs: number
  /** The source's polite getter: one request at a time, paced and retried by the source's request policy. */
  readonly get: HttpGet
  /**
   * Validates every item against the contract and replaces the data file with them, atomically, and the side files
   * with `material` the same way. An adapter that keeps no source material hands over `NO_SOURCE_MATERIAL`: while
   * there has been no source material at all, no side files are written. Rejects (and writes nothing) if an item
   * breaks the contract or a key appears twice, or if a write fails; all fatal. The side files only hold words that
   * are items of the dataset, and stay that way if the run stops between two writes.
   */
  save(items: readonly Item[], material: SourceMaterial): Promise<void>
  log(message: string): void
  /** The lists folder (lists/<language>/<quiz type>.txt); only adapters that work through a list read it. */
  readonly listsDir: string
  /**
   * Tells the harness how many items the run aims for and how many of them are already saved. Call it once, after
   * logging what the run will do: the harness then adds the pause and the cool-down in use to the log.
   */
  planned(total: number, saved: number): void
}

/** Build-time code that produces one dataset from one source. */
export interface Adapter<Item = unknown> {
  readonly source: string
  readonly language: string
  readonly quizType: string
  run(context: RunContext<Item>): Promise<RunResult<Item>>
}

/** What the harness reports when the run is interrupted. */
export interface RunProgress {
  /** Undefined until the adapter has said how many items it aims for. */
  total: number | undefined
  saved: number
}

export interface RunContextOptions<Item> {
  target: DataTarget
  contract: Contract<Item>
  dataFile: string
  /** Where the dataset's side files are. None is written while there is no source material. */
  sideFiles: SideFiles
  /** Where each file is written before it is renamed over its place (the data file or a side file); same filesystem. */
  tmpFile: string
  listsDir: string
  force: boolean
  failCooldownMs: number
  /** The pause between requests that `get` keeps (the source's policy or --delay-ms), reported to the log. */
  pauseMs: number
  get: HttpGet
  log: (message: string) => void
}

/** Reads the data file and builds the context of one run, plus the progress the interrupt message reports. */
export async function createRunContext<Item>(
  options: RunContextOptions<Item>,
): Promise<{ context: RunContext<Item>; progress: RunProgress }> {
  const { target, contract, dataFile, sideFiles, tmpFile } = options
  const existing = await readItems<Item>(dataFile, target)
  const existingMaterial = await readSourceMaterial(sideFiles, target)
  const progress: RunProgress = { total: undefined, saved: 0 }

  // The words of the dataset on disk, and whether the side files have ever held anything (else none are written).
  let inDataset = new Set(existing.map((item) => contract.keyOf(item)))
  let keepsMaterial = wordsIn(existingMaterial).length > 0

  const problemsOf = (items: readonly Item[]): string[] => {
    const seen = new Set<string>()
    return items.flatMap((item, i) => {
      const problems = contract.validateItem(item).map((problem) => `item ${i + 1} breaks the contract: ${problem}`)
      if (problems.length > 0) return problems
      const key = contract.keyOf(item)
      if (seen.has(key)) return [`item ${i + 1}: "${key}" appears twice`]
      seen.add(key)
      return []
    })
  }

  const context: RunContext<Item> = {
    target,
    contract,
    existing,
    existingMaterial,
    force: options.force,
    failCooldownMs: options.failCooldownMs,
    get: options.get,
    listsDir: options.listsDir,
    log: options.log,
    async save(items, material) {
      const problems = problemsOf(items)
      if (problems.length > 0) throw new Error(`Refusing to save ${dataFile}: ${problems.join('; ')}`)
      const writeDataset = () => writeData(dataFile, tmpFile, { ...target, items: [...items] })
      const words = wordsIn(material)
      if (!keepsMaterial && words.length === 0) {
        await writeDataset()
      } else {
        const writeSideFiles = async () => {
          await writeSourceMaterial(sideFiles, tmpFile, target, material)
          keepsMaterial = true
        }
        // Each file is replaced in one step, but not the three together. If the side files only hold words that the
        // dataset on disk already has, they go first (that is how words are dropped); otherwise the dataset does (that
        // is how words are added). Either way, a run that stops in between leaves no side file with a word too many,
        // though it may leave a word's entries from one run beside its item from another.
        if (words.every((word) => inDataset.has(word))) {
          await writeSideFiles()
          await writeDataset()
        } else {
          await writeDataset()
          await writeSideFiles()
        }
      }
      inDataset = new Set(items.map((item) => contract.keyOf(item)))
      progress.saved = items.length
    },
    planned(total, saved) {
      progress.total = total
      progress.saved = saved
      options.log(`Pausing ${options.pauseMs} ms after each request.`)
      if (options.failCooldownMs > 0) {
        options.log(`After an item fails to fetch: cooling down for ${options.failCooldownMs / 1000} s, then trying it again.`)
      }
    },
  }
  return { context, progress }
}

/** A source as the scraper knows it: how to ask it, and one adapter per dataset it provides. */
export interface ScraperSource {
  /** The id of the source in src/sources/. */
  readonly id: string
  readonly policy: RequestPolicy
  readonly adapters: readonly Adapter[]
}

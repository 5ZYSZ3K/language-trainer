import { readFile } from 'node:fs/promises'
import { join as joinPath } from 'node:path'
import { resolveConfig } from 'prettier'
import { serialise } from '../../scraper/harness/data-file'
import { datasetPath, type Pool } from '../../src/datasets/pool'

/** What a join reads, by path: dataset files below data/, lists below lists/. A file that is not there is absent. */
export interface JoinInputs {
  readonly data: Readonly<Record<string, string>>
  readonly lists: Readonly<Record<string, string>>
}

/** What a join gives: the dataset's items, none if there is any problem, and every problem. */
export interface JoinResult<Item = unknown> {
  readonly items: Item[]
  readonly problems: string[]
}

/**
 * A joined dataset: how to make it again from its inputs, which are committed datasets and lists. The owner runs it
 * (`command`) after an input changes and commits the result; check-data runs it in memory and fails while the committed
 * file differs from what it would write.
 */
export interface Join {
  /** The joined dataset. */
  readonly pool: Pool
  /** The npm script that writes it, which check-data names when the committed file is out of step. */
  readonly command: string
  /** The datasets it reads. */
  readonly datasets: readonly Pool[]
  /** The lists it reads, by path below lists/. */
  readonly lists: readonly string[]
  /** The items, from `inputs` alone, or every problem that stops the join. Must not throw. */
  make(inputs: JoinInputs): JoinResult
}

/** The files at `paths` below `dir`, keyed by those paths; a missing one is left out. */
export async function readFilesBelow(dir: string, paths: readonly string[]): Promise<Record<string, string>> {
  const files: Record<string, string> = {}
  for (const path of paths) {
    try {
      files[path] = await readFile(joinPath(dir, path), 'utf8')
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
    }
  }
  return files
}

/** Everything `join` reads, from the repository at `root`. */
export async function readJoinInputs(root: string, join: Join): Promise<JoinInputs> {
  return {
    data: await readFilesBelow(joinPath(root, 'data'), join.datasets.map(datasetPath)),
    lists: await readFilesBelow(joinPath(root, 'lists'), join.lists),
  }
}

/**
 * The text of the joined dataset with `items`, as the join writes it: laid out by Prettier like every data file (with the
 * repository's config for `file`, if it has one and `file` is given).
 */
export async function joinedText(join: Join, items: unknown[], file?: string): Promise<string> {
  const options = file === undefined ? undefined : ((await resolveConfig(file)) ?? undefined)
  return serialise({ ...join.pool, items }, options)
}

/** Parses an input, or adds the reason it cannot be read to `problems`. */
export function parseInput(where: string, text: string | undefined, problems: string[]): unknown {
  if (text === undefined) return void problems.push(`${where} is missing`)
  try {
    return JSON.parse(text)
  } catch {
    return void problems.push(`${where} is not valid JSON`)
  }
}

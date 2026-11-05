import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import { format, resolveConfig, type Options } from 'prettier'
import type { Dataset } from '../../src/datasets/dataset'
import { POOL_FIELDS, type Pool } from '../../src/datasets/pool'

/** What a data file is for: one quiz type, for one language, from one source. */
export type DataTarget = Pool

/**
 * The items in an existing data file, or none if there is no file, it belongs to another target (language,
 * source or quiz type differs) or has no item list. A file that is not valid JSON throws: starting over would
 * send the whole list to the site. The items are not checked here; the file only ever holds what the contract
 * accepted when it was saved.
 */
export async function readItems<Item>(file: string, target: DataTarget): Promise<Item[]> {
  let text: string
  try {
    text = await readFile(file, 'utf8')
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return []
    throw error
  }
  const data = JSON.parse(text) as Partial<Dataset<Item>>
  const sameTarget = POOL_FIELDS.every((field) => data[field] === target[field])
  return sameTarget && Array.isArray(data.items) ? data.items : []
}

/**
 * The data file as text: valid JSON laid out by Prettier, the formatter the editor runs on save, so that
 * saving the file by hand never changes it. The JSON is handed over compact so the layout never depends on what
 * the file looked like before (Prettier keeps an object expanded if its source was).
 */
export function serialise<Item>(data: Dataset<Item>, options?: Options): Promise<string> {
  const envelope = Object.fromEntries(POOL_FIELDS.map((field) => [field, data[field]]))
  return format(JSON.stringify({ ...envelope, items: data.items }), { ...options, parser: 'json' })
}

/**
 * Replaces `file` with the serialised data in one step (write `tmpFile`, then rename it over `file`), so a
 * crash or a full disk never leaves a half-written data file. The data is formatted with the Prettier config
 * that applies to `file`, if the repository has one. Any error propagates: a failed save is fatal.
 * Both paths must be on the same filesystem.
 */
export async function writeData<Item>(file: string, tmpFile: string, data: Dataset<Item>): Promise<void> {
  await mkdir(dirname(file), { recursive: true })
  await writeFile(tmpFile, await serialise(data, (await resolveConfig(file)) ?? undefined))
  await rename(tmpFile, file)
}

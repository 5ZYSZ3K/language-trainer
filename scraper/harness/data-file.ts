import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import { format, resolveConfig, type Options } from 'prettier'
import { isRecord } from '../../src/core/is-record'
import type { Dataset } from '../../src/datasets/dataset'
import { POOL_FIELDS, type Pool } from '../../src/datasets/pool'

/** What a data file is for: one quiz type, for one language, from one source. */
export type DataTarget = Pool

/** A file with an envelope and items, and any other fields after them: a dataset, or one of its side files. */
export type EnvelopeFile<Item> = Dataset<Item> & Readonly<Record<string, unknown>>

/**
 * The parsed file, its items an empty list if it has none, or undefined if there is no file or it belongs to another
 * target (language, source or quiz type differs). A file that is not valid JSON throws: starting over would send the
 * whole list to the site. The items are not checked here.
 */
export async function readEnvelopeFile(file: string, target: DataTarget): Promise<EnvelopeFile<unknown> | undefined> {
  let text: string
  try {
    text = await readFile(file, 'utf8')
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined
    throw error
  }
  const data: unknown = JSON.parse(text)
  if (!isRecord(data) || !POOL_FIELDS.every((field) => data[field] === target[field])) return undefined
  return { ...data, items: Array.isArray(data.items) ? data.items : [] } as EnvelopeFile<unknown>
}

/**
 * The items in an existing data file, or none if there is no file, it belongs to another target (language,
 * source or quiz type differs) or has no item list. A file that is not valid JSON throws: starting over would
 * send the whole list to the site. The items are not checked here; the file only ever holds what the contract
 * accepted when it was saved.
 */
export async function readItems<Item>(file: string, target: DataTarget): Promise<Item[]> {
  return ((await readEnvelopeFile(file, target))?.items ?? []) as Item[]
}

/**
 * The data file as text: valid JSON laid out by Prettier, the formatter the editor runs on save, so that
 * saving the file by hand never changes it. The envelope comes first, then the items, then the file's other fields
 * in their order. The JSON is handed over compact so the layout never depends on what the file looked like before
 * (Prettier keeps an object expanded if its source was).
 */
export function serialise<File extends Dataset<unknown>>(data: File, options?: Options): Promise<string> {
  const { items, ...fields } = data
  const envelope = Object.fromEntries(POOL_FIELDS.map((field) => [field, data[field]]))
  const others = Object.entries(fields).filter(([field]) => !(POOL_FIELDS as readonly string[]).includes(field))
  return format(JSON.stringify({ ...envelope, items, ...Object.fromEntries(others) }), { ...options, parser: 'json' })
}

/**
 * Replaces `file` with the serialised data in one step (write `tmpFile`, then rename it over `file`), so a
 * crash or a full disk never leaves a half-written data file. The data is formatted with the Prettier config
 * that applies to `file`, if the repository has one. Any error propagates: a failed save is fatal.
 * Both paths must be on the same filesystem.
 */
export async function writeData<File extends Dataset<unknown>>(file: string, tmpFile: string, data: File): Promise<void> {
  await mkdir(dirname(file), { recursive: true })
  await writeFile(tmpFile, await serialise(data, (await resolveConfig(file)) ?? undefined))
  await rename(tmpFile, file)
}

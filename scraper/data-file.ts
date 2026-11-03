import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import type { ExerciseData, Item } from '../src/core/cell'

/** What a data file is for: one quiz type, for one language, from one source. */
export type DataTarget = Pick<ExerciseData, 'language' | 'source' | 'quizType'>

/**
 * The items in an existing data file, or none if there is no file, it belongs to another target (language,
 * source or quiz type differs) or has no item list. A file that is not valid JSON throws: starting over would
 * send the whole verb list to the site.
 */
export async function readItems(file: string, target: DataTarget): Promise<Item[]> {
  let text: string
  try {
    text = await readFile(file, 'utf8')
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return []
    throw error
  }
  const data = JSON.parse(text) as ExerciseData
  const sameTarget = data.language === target.language && data.source === target.source && data.quizType === target.quizType
  return sameTarget && Array.isArray(data.items) ? data.items : []
}

/**
 * The data file as text: valid JSON in the same shape as `ExerciseData`, with one item per line so that a
 * change to one verb is a one-line diff once the file is committed.
 */
export function serialise(data: ExerciseData): string {
  const items = data.items.map((item) => JSON.stringify(item)).join(',\n')
  const { language, source, quizType } = data
  const head = `{"language":${JSON.stringify(language)},"source":${JSON.stringify(source)},"quizType":${JSON.stringify(quizType)}`
  return `${head},"items":[\n${items}${items ? '\n' : ''}]}\n`
}

/**
 * Replaces `file` with the serialised data in one step (write `tmpFile`, then rename it over `file`), so a
 * crash or a full disk never leaves a half-written data file. Any error propagates: a failed save is fatal.
 * Both paths must be on the same filesystem.
 */
export async function writeData(file: string, tmpFile: string, data: ExerciseData): Promise<void> {
  await mkdir(dirname(file), { recursive: true })
  await writeFile(tmpFile, serialise(data))
  await rename(tmpFile, file)
}

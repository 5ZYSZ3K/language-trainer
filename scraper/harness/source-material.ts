/**
 * Source material: everything an entry says beyond the forms (its lines, the footnotes that lead to the source's
 * articles, its dictionary entries), kept beside each dataset for the owner to write remarks and explanations from.
 * It is committed and never shipped: it lives in source-material/, outside data/, so the page never sees it.
 *
 * Each dataset has two side files there, with the dataset's envelope, read and written here:
 * - `<language>/<source>/<quiz type>.json`, named like the dataset: `items` (one source-material entry per word) and
 *   `footnotes` (each article the entries lead to, once, by id);
 * - `<language>/<source>/<quiz type>.dictionaries.json`: `items` (each word's entries in the dictionaries).
 *
 * The shape is the one #3 asked for, prirucka's: a source whose entries say something else needs the harness changed
 * (README, *The scraper*).
 */
import { join } from 'node:path'
import { isRecord } from '../../src/core/is-record'
import { datasetPath, poolKey, type Pool } from '../../src/datasets/pool'
import { readEnvelopeFile, writeData, type DataTarget } from './data-file'

/** One line of an entry: the source's own label, its HTML as the source has it, and the ids of the articles its markers lead to. */
export interface SourceLine {
  label: string
  html: string
  footnotes: string[]
}

/** What an adapter reads from one entry besides its item. */
export interface EntryMaterial {
  /** Every line of the entry, in the order of the page. */
  lines: SourceLine[]
  /** The ids of the articles each cell's markers lead to, by cell id; a cell without a marker is left out. */
  cellFootnotes: Record<string, string[]>
  /** The entry in each dictionary the source quotes, as HTML, by the source's id of the dictionary. */
  dictionaryEntries: Record<string, string>
  /** Every article the lines and the cells lead to, as HTML, by id. */
  articles: Record<string, string>
}

/** A word's lines and cell footnotes: one item of the source-material file. */
export interface SourceMaterialEntry {
  prompt: string
  lines: SourceLine[]
  cellFootnotes: Record<string, string[]>
}

/** A word's entry in each dictionary the source quotes: one item of the dictionaries file. */
export interface WordInDictionaries {
  prompt: string
  /** Its entry in each dictionary, as HTML, by the source's id of the dictionary. */
  entries: Record<string, string>
}

/** What the two side files of one dataset hold. */
export interface SourceMaterial {
  /** The source-material file's items, in the order of the list. */
  readonly entries: readonly SourceMaterialEntry[]
  /** The articles the entries lead to, by id: the source-material file's `footnotes`. */
  readonly articles: Readonly<Record<string, string>>
  /** The dictionaries file's items, in the order of the list. */
  readonly wordsInDictionaries: readonly WordInDictionaries[]
}

export const NO_SOURCE_MATERIAL: SourceMaterial = { entries: [], articles: {}, wordsInDictionaries: [] }

/** The ids of every article an entry's lines and cells lead to, each once. */
export function articleIdsOf(entry: Pick<SourceMaterialEntry, 'lines' | 'cellFootnotes'>): string[] {
  return [...new Set([...entry.lines.flatMap((line) => line.footnotes), ...Object.values(entry.cellFootnotes).flat()])]
}

/** Every word the side files name, with repeats: none means there is no source material. */
export function wordsIn(material: SourceMaterial): string[] {
  return [...material.entries, ...material.wordsInDictionaries].map((word) => word.prompt)
}

/** What pruning and re-ordering change in the side files: the words of each, in order, and the ids of the articles. */
export function sideFileKeys(material: SourceMaterial): string[][] {
  return [material.entries.map((entry) => entry.prompt), material.wordsInDictionaries.map((word) => word.prompt), Object.keys(material.articles)]
}

/** One word's entries in the two side files. Files from an earlier run may give a word one and not the other. */
export interface WordMaterial {
  sourceMaterial?: SourceMaterialEntry
  inDictionaries?: WordInDictionaries
}

/** The side-file entries of `prompt`, from what the adapter read from its entry. */
export function wordMaterialOf(prompt: string, material: EntryMaterial): Required<WordMaterial> {
  return {
    sourceMaterial: { prompt, lines: material.lines, cellFootnotes: material.cellFootnotes },
    inDictionaries: { prompt, entries: material.dictionaryEntries },
  }
}

/** Each word's entries in the side files, by prompt. */
export function materialByWord(material: SourceMaterial): Map<string, WordMaterial> {
  const byWord = new Map<string, WordMaterial>()
  for (const entry of material.entries) byWord.set(entry.prompt, { ...byWord.get(entry.prompt), sourceMaterial: entry })
  for (const word of material.wordsInDictionaries) byWord.set(word.prompt, { ...byWord.get(word.prompt), inDictionaries: word })
  return byWord
}

/** What the side files hold for these words, in their order: their entries, and those of `articles` that the entries lead to. */
export function sourceMaterialOf(words: readonly WordMaterial[], articles: Readonly<Record<string, string>>): SourceMaterial {
  const entries = words.flatMap((word) => word.sourceMaterial ?? [])
  const referenced = new Set(entries.flatMap(articleIdsOf))
  return {
    entries,
    articles: Object.fromEntries(Object.entries(articles).filter(([id]) => referenced.has(id))),
    wordsInDictionaries: words.flatMap((word) => word.inDictionaries ?? []),
  }
}

/** Where a dataset's dictionaries file lies under source-material/, e.g. `cs/prirucka/noun-declension.dictionaries.json`. */
export const dictionariesPath = (pool: Pool): string => `${poolKey(pool)}.dictionaries.json`

/** Where the two side files of a dataset are. */
export interface SideFiles {
  sourceMaterial: string
  dictionaries: string
}

/** A dataset's side files in `dir` (the repository's source-material/). */
export function sideFilesIn(dir: string, pool: Pool): SideFiles {
  return { sourceMaterial: join(dir, datasetPath(pool)), dictionaries: join(dir, dictionariesPath(pool)) }
}

/**
 * What a dataset's side files hold, read like the dataset: a missing side file, or one for another target, holds
 * nothing, and one that is not valid JSON throws. Their contents are not checked here.
 */
export async function readSourceMaterial(files: SideFiles, target: DataTarget): Promise<SourceMaterial> {
  const material = await readEnvelopeFile(files.sourceMaterial, target)
  const dictionaries = await readEnvelopeFile(files.dictionaries, target)
  return {
    entries: (material?.items ?? []) as SourceMaterialEntry[],
    articles: isRecord(material?.footnotes) ? (material.footnotes as Record<string, string>) : {},
    wordsInDictionaries: (dictionaries?.items ?? []) as WordInDictionaries[],
  }
}

/** Replaces both side files with `material`, each in one step like the dataset (see `writeData`), but not both together. */
export async function writeSourceMaterial(files: SideFiles, tmpFile: string, target: DataTarget, material: SourceMaterial): Promise<void> {
  await writeData(files.sourceMaterial, tmpFile, { ...target, items: [...material.entries], footnotes: material.articles })
  await writeData(files.dictionaries, tmpFile, { ...target, items: [...material.wordsInDictionaries] })
}

import type { ExerciseData } from '../core/cell'
import { SOURCES, type Source } from '../sources'
import { datasetPath, poolKey, type Pool } from './pool'

/** Lazy importers of dataset files, by absolute path from the project root: the shape `import.meta.glob` returns. */
export type DatasetModules = Readonly<Record<string, () => Promise<ExerciseData>>>

/**
 * Every dataset file as its own lazily loaded chunk. The build (scripts/check-data.ts) has already validated
 * them, and nothing is fetched at runtime: the JSON is inside the bundle.
 */
const bundledModules: DatasetModules = import.meta.glob<ExerciseData>('/data/*/*/*.json', { import: 'default' })

/**
 * The dataset of a pool, delivered the way its source declares (`provides[].delivery`). `bundled` imports the
 * file from `modules`; `github` is specified but has no loader yet, so it rejects. `modules` and `sources`
 * are arguments so that the loader can be tested without Vite and the real registries.
 */
export async function loadDataset(
  pool: Pool,
  modules: DatasetModules = bundledModules,
  sources: readonly Source[] = SOURCES,
): Promise<ExerciseData> {
  const entry = sources
    .find((source) => source.id === pool.source)
    ?.provides.find((provided) => provided.language === pool.language && provided.quizType === pool.quizType)
  if (!entry) throw new Error(`No source provides the pool ${poolKey(pool)}.`)

  if (entry.delivery.kind === 'github') {
    throw new Error(`The github delivery is not implemented, so the dataset of ${poolKey(pool)} cannot be loaded.`)
  }

  const file = `/data/${datasetPath(pool)}`
  const load = modules[file]
  if (!load) throw new Error(`The bundle has no dataset file ${file.slice(1)} for the pool ${poolKey(pool)}.`)
  return load()
}

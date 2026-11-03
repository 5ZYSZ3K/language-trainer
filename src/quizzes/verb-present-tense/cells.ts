import type { VerbPresentTextKey } from './texts.en'

const CELL_IDS = ['1sg', '1pl', '2sg', '2pl', '3sg', '3pl'] as const
type CellId = (typeof CELL_IDS)[number]

/** The cells of an item, in display order (rendered as a two-column grid, row by row). */
export const verbPresentCellIds: readonly string[] = CELL_IDS

/**
 * The key, in the quiz's texts, of the visible label of a cell: `cell.<id>`. Typed against the texts, so a cell id
 * without a label is a compile error.
 */
const labelKey = (id: CellId): VerbPresentTextKey => `cell.${id}`

/** Label key by cell id. Data holds only the ids; the page looks the label up here. */
export const verbPresentCellLabelKeys: Readonly<Record<string, VerbPresentTextKey>> = Object.fromEntries(
  CELL_IDS.map((id) => [id, labelKey(id)]),
)

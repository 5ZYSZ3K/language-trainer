import type { VerbPresentTextKey } from './texts.en'

/** The cells of an item, in display order (rendered as a two-column grid, row by row). */
export const verbPresentCellIds: readonly string[] = ['1sg', '1pl', '2sg', '2pl', '3sg', '3pl']

/** The key, in the quiz's texts, of the visible label for each cell id. Data holds only the ids; the page looks the label up here. */
export const verbPresentCellLabelKeys: Readonly<Record<string, VerbPresentTextKey>> = {
  '1sg': 'cell.1sg',
  '1pl': 'cell.1pl',
  '2sg': 'cell.2sg',
  '2pl': 'cell.2pl',
  '3sg': 'cell.3sg',
  '3pl': 'cell.3pl',
}

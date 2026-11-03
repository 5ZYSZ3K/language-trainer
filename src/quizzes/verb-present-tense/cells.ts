import type { TranslationKey } from '../../i18n'

/** The cells of an item, in display order (rendered as a two-column grid, row by row). */
export const verbPresentCellIds: readonly string[] = ['1sg', '1pl', '2sg', '2pl', '3sg', '3pl']

/** The text key of the visible label for each cell id. Data holds only the ids; the page looks the label up here. */
export const verbPresentCellLabelKeys: Readonly<Record<string, TranslationKey>> = {
  '1sg': 'verbPresent.1sg',
  '1pl': 'verbPresent.1pl',
  '2sg': 'verbPresent.2sg',
  '2pl': 'verbPresent.2pl',
  '3sg': 'verbPresent.3sg',
  '3pl': 'verbPresent.3pl',
}

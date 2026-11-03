import type { Exercise } from '../core/exercise'
import type { TranslationKey } from '../i18n/en'

export const verbPresentTense: Exercise = {
  type: 'verb-present-tense',
  cellIds: ['1sg', '1pl', '2sg', '2pl', '3sg', '3pl'],
}

/** The text key of the visible label for each cell id. Data holds only the ids; the page looks the label up here. */
export const verbPresentCellLabelKeys: Readonly<Record<string, TranslationKey>> = {
  '1sg': 'verbPresent.1sg',
  '1pl': 'verbPresent.1pl',
  '2sg': 'verbPresent.2sg',
  '2pl': 'verbPresent.2pl',
  '3sg': 'verbPresent.3sg',
  '3pl': 'verbPresent.3pl',
}

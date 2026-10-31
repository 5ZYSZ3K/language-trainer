import type { TranslationKey } from '../i18n/en'

/** One input in an exercise: a label to show and every form that counts as correct. */
export interface Cell {
  label: TranslationKey
  acceptedForms: string[]
}

/** One round of an exercise: something to show, and the cells to fill in for it. */
export interface Item {
  prompt: string
  cells: Cell[]
}

/** Shape of the scraped data file served next to the page. */
export interface ExerciseData {
  exerciseType: string
  items: Item[]
}

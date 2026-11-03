/** One input in an exercise: a neutral id (what the page shows for it is the exercise's business) and every form that counts as correct. */
export interface Cell {
  id: string
  acceptedForms: string[]
}

/** One round of an exercise: something to show, and the cells to fill in for it. */
export interface Item {
  prompt: string
  cells: Cell[]
}

/**
 * Shape of a dataset file: the items of one quiz type, for one language, from one source. The three
 * identifying fields must match the file's location and the registries.
 */
export interface ExerciseData {
  language: string
  source: string
  quizType: string
  items: Item[]
}

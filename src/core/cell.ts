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

/** Shape of the scraped data file served next to the page. */
export interface ExerciseData {
  exerciseType: string
  items: Item[]
}

/** One input of a type-in quiz: a neutral id (what the page shows for it is the quiz type's business) and every form that counts as correct. */
export interface Cell {
  id: string
  acceptedForms: string[]
}

/** One round of a type-in quiz: something to show, and the cells to fill in for it. */
export interface Item {
  prompt: string
  cells: Cell[]
  /** The page the item came from; optional and not shown (a source that must be credited can use it later). */
  sourceUrl?: string
}

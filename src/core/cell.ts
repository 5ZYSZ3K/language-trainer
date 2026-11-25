/** One of the forms a source lists for a cell: its value, which is an accepted form, and optional remarks about it. */
export interface Variant {
  value: string
  remarks?: string[]
}

/** One input of a type-in quiz: a neutral id (what the page shows for it is the quiz type's business) and every variant that counts as correct. */
export interface Cell {
  id: string
  acceptedForms: Variant[]
}

/** One round of a type-in quiz: something to show, and the cells to fill in for it. */
export interface Item {
  prompt: string
  cells: Cell[]
  /** The page the item came from; optional and not shown (a source that must be credited can use it later). */
  sourceUrl?: string
}

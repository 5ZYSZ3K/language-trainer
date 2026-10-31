import type { Item } from './cell'
import { isCorrect } from './matching'
import type { Scores } from './scores'

export type CellState = 'open' | 'correct' | 'wrong'

/** One attempt at one item. Checking locks a cell for the rest of the round and updates the scores. */
export class Round {
  private readonly states: CellState[]

  constructor(
    private readonly exerciseType: string,
    private readonly item: Item,
    private readonly scores: Scores,
  ) {
    this.states = item.cells.map(() => 'open')
  }

  state(index: number): CellState {
    return this.states[index] ?? 'open'
  }

  /** Checks one cell. An empty input is ignored: it neither counts nor locks the cell. */
  checkCell(index: number, input: string): void {
    if (input.trim() === '') return
    this.lock(index, input)
  }

  /** Checks every unlocked cell; `inputs[i]` belongs to cell i. Empty cells count as wrong. */
  checkAll(inputs: readonly string[]): void {
    this.states.forEach((_, i) => this.lock(i, inputs[i] ?? ''))
  }

  private lock(index: number, input: string): void {
    const cell = this.item.cells[index]
    if (!cell || this.states[index] !== 'open') return
    const correct = isCorrect(input, cell.acceptedForms)
    this.states[index] = correct ? 'correct' : 'wrong'
    this.scores.recordCell(this.exerciseType, correct)
    if (this.complete) {
      this.scores.recordItem(
        this.exerciseType,
        this.states.every((s) => s === 'correct'),
      )
    }
  }

  /** True once every cell has been checked. */
  get complete(): boolean {
    return this.states.every((s) => s !== 'open')
  }
}

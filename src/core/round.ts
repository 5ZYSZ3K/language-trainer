import type { Item } from './cell'
import { isCorrect } from './matching'

export type CellState = 'open' | 'correct' | 'wrong'

/** What a round reports as it goes; whoever runs the round decides what to do with it (keep scores, say). */
export interface RoundEvents {
  /** A cell was checked and locked. */
  cellChecked(correct: boolean): void
  /** The last open cell was checked; `fullyCorrect` is true if every cell was right. Reported once per round. */
  itemCompleted(fullyCorrect: boolean): void
}

/** One attempt at one item. Checking locks a cell for the rest of the round and reports the result. */
export class Round {
  private readonly states: CellState[]

  constructor(
    private readonly item: Item,
    private readonly events: RoundEvents,
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
    this.events.cellChecked(correct)
    if (this.complete) this.events.itemCompleted(this.states.every((s) => s === 'correct'))
  }

  /** True once every cell has been checked. */
  get complete(): boolean {
    return this.states.every((s) => s !== 'open')
  }
}

/**
 * The exact shape of data a quiz type needs: a validator that works on parsed JSON, and the identity of an item.
 * Anything that satisfies it can feed the quiz, however it was produced.
 */
export interface Contract<Item> {
  /** Problems with `value`; empty means it satisfies the contract. */
  validateItem(value: unknown): string[]
  /** Unique identity of an item (its prompt); used for order, pruning and duplicates. */
  keyOf(item: Item): string
}

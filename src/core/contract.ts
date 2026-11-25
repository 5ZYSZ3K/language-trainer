/**
 * The exact shape of data a quiz type needs: a validator that works on parsed JSON, the identity of an item, and
 * what of an item is written by hand. Anything that satisfies it can feed the quiz, however it was produced.
 */
export interface Contract<Item> {
  /** Problems with `value`; empty means it satisfies the contract. */
  validateItem(value: unknown): string[]
  /** Unique identity of an item (its prompt); used for order, pruning and duplicates. */
  keyOf(item: Item): string
  /**
   * Copies what was written by hand onto an item that was just made again from its source (`fresh`), from the item
   * it replaces (`previous`, which satisfies the contract), so that a re-scrape keeps it. Gives back the item to
   * check and save, and a warning for each hand-written piece that has nowhere to go any more. A quiz type whose
   * items hold nothing written by hand has no hook.
   */
  carryOver?(previous: Item, fresh: Item): { item: Item; warnings: string[] }
}

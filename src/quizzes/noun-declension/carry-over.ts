import type { NounItem } from './index'

/** A variant of a cell, as one key: the cell id and the variant's value. */
const variantKey = (cellId: string, value: string) => JSON.stringify([cellId, value])

/**
 * The noun contract's `carryOver` hook: what the owner wrote by hand on a noun, put back onto the noun a scrape has just
 * made again from its page, which has none of it. Each variant's remarks go back onto the variant with the same value
 * in the same cell, and the noun's explanation onto the noun. Everything else is the fresh item's: its forms, their
 * order, its gender. A remark whose variant is no longer on the page is dropped, with a warning naming the cell and the
 * value. Whether the result still satisfies the contract (an explanation needs a remark to open it) is for the
 * contract to say.
 */
export function carryOverNoun(previous: NounItem, fresh: NounItem): { item: NounItem; warnings: string[] } {
  const remarked = new Map<string, string[]>()
  for (const cell of previous.cells) {
    for (const variant of cell.acceptedForms) if (variant.remarks) remarked.set(variantKey(cell.id, variant.value), variant.remarks)
  }

  const placed = new Set<string>()
  const cells = fresh.cells.map((cell) => ({
    ...cell,
    acceptedForms: cell.acceptedForms.map((variant) => {
      const key = variantKey(cell.id, variant.value)
      const remarks = remarked.get(key)
      if (!remarks) return variant
      placed.add(key)
      return { ...variant, remarks: [...remarks] }
    }),
  }))

  const warnings = previous.cells.flatMap((cell) =>
    cell.acceptedForms
      .filter((variant) => variant.remarks && !placed.has(variantKey(cell.id, variant.value)))
      .map((variant) => `cell ${cell.id} no longer has the variant "${variant.value}", so its remarks (${variant.remarks!.join(', ')}) were dropped`),
  )

  // The explanation sits before the cells, where the data shows it.
  const { cells: _freshCells, ...head } = fresh
  const item: NounItem = { ...head, ...(previous.explanation && { explanation: previous.explanation }), cells }
  return { item, warnings }
}

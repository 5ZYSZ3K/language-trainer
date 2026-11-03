export interface Edit {
  value: string
  caret: number
}

/** Typed trigger character -> letter before it -> replacement (lower case; upper case is derived). A language owns its table. */
export type ShortcutTable = Readonly<Record<string, Readonly<Record<string, string>>>>

/**
 * Called after each keystroke with the new text and caret. If the character just typed (before the
 * caret) completes a shortcut of `table`, returns the text with the pair replaced; otherwise returns it unchanged.
 */
export function applyShortcut(value: string, caret: number, table: ShortcutTable): Edit {
  const typed = value[caret - 1]
  const previous = value[caret - 2]
  const lower = typed && previous ? table[typed]?.[previous.toLowerCase()] : undefined
  if (!lower) return { value, caret }
  const replacement = previous === previous!.toUpperCase() ? lower.toUpperCase() : lower
  return { value: value.slice(0, caret - 2) + replacement + value.slice(caret), caret: caret - 1 }
}

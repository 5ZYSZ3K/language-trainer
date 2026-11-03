/**
 * Puts the language's shortcut help lines at the top of `list`, replacing the ones put there before. Items the list
 * holds of its own (a quiz's note, say) stay below them.
 */
export function renderShortcutHelp(list: HTMLElement, lines: readonly string[]): void {
  list.querySelectorAll('[data-shortcut-help]').forEach((item) => item.remove())
  list.prepend(
    ...lines.map((line) => {
      const item = document.createElement('li')
      item.dataset.shortcutHelp = ''
      item.textContent = line
      return item
    }),
  )
}

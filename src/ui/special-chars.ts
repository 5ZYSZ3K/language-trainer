import type { Language } from '../languages'

/**
 * Fills `group` with one button per special character of the language, in its order. A click inserts the character
 * into the field `target()` returns (nothing happens when it returns none).
 */
export function fillSpecialChars(
  group: HTMLElement,
  language: Language,
  target: () => HTMLInputElement | undefined,
): void {
  for (const char of language.specialChars) {
    const button = document.createElement('button')
    button.type = 'button'
    button.textContent = char
    button.lang = language.htmlLang
    // Keep the focus (and caret) in the text field the user is typing in.
    button.addEventListener('mousedown', (event) => event.preventDefault())
    button.addEventListener('click', () => {
      const input = target()
      if (input) insertAtCaret(input, char)
    })
    group.append(button)
  }
}

/** Replaces the selection of `input` (or inserts at its caret) with `text`, and puts the focus back there. */
export function insertAtCaret(input: HTMLInputElement, text: string): void {
  const start = input.selectionStart ?? input.value.length
  const end = input.selectionEnd ?? start
  input.setRangeText(text, start, end, 'end')
  input.focus()
}

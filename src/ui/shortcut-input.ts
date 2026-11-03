import { applyShortcut, type ShortcutTable } from '../core/shortcuts'

/** Applies the typing shortcuts of `table` to what is typed into `input`. */
export function enableShortcuts(input: HTMLInputElement, table: ShortcutTable): void {
  input.addEventListener('input', (event) => {
    const { inputType, isComposing } = event as InputEvent
    // Only plain typing triggers shortcuts: not deleting, pasting or IME composition.
    if (inputType !== 'insertText' || isComposing) return
    const caret = input.selectionStart ?? input.value.length
    const edit = applyShortcut(input.value, caret, table)
    if (edit.value === input.value) return
    input.value = edit.value
    input.setSelectionRange(edit.caret, edit.caret)
  })
}

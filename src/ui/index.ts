// Shared DOM building blocks (for type-in quizzes: special-character buttons, shortcuts, help list; and the element look-up) and
// their texts. Nothing here runs at import time: every function is called by the shell or a quiz's mount.
export { finder } from './dom'
export { enableShortcuts } from './shortcut-input'
export { renderShortcutHelp } from './shortcut-help'
export { fillSpecialChars, insertAtCaret } from './special-chars'
export { uiTexts, type UiTextKey } from './texts'

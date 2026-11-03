// Shared building blocks for type-in quizzes, and their texts. Nothing here runs at import time: every function is called by a quiz's mount.
export { enableShortcuts } from './shortcut-input'
export { renderShortcutHelp } from './shortcut-help'
export { fillSpecialChars, insertAtCaret } from './special-chars'
export { uiTexts, type UiTextKey } from './texts'

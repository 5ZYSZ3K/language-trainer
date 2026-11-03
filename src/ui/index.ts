// Shared building blocks for type-in quizzes. Nothing here runs at import time: every export is called by a quiz's mount.
export { enableShortcuts } from './shortcut-input'
export { renderShortcutHelp } from './shortcut-help'
export { fillSpecialChars, insertAtCaret } from './special-chars'

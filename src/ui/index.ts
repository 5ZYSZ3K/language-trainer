// Shared DOM building blocks (for type-in quizzes: special-character buttons, shortcuts, help list; and the element look-up) and
// their texts. Nothing here runs at import time: every function is called by the shell or a quiz's mount.
export { finder } from './dom'
export { createGoTo, type GoTo, type GoToTextKey } from './go-to'
export { enableShortcuts } from './shortcut-input'
export { syncRoundActions } from './round-actions'
export { renderShortcutHelp } from './shortcut-help'
export { fillSpecialChars, insertAtCaret } from './special-chars'
export { uiTexts, type UiTextKey } from './texts'

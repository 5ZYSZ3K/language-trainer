import type { Dictionaries } from '../i18n'
import { cs } from './texts.cs'
import { en, type UiTextKey } from './texts.en'

export type { UiTextKey }

/** The type-in building blocks' texts, per UI language. */
export const uiTexts: Dictionaries<UiTextKey> = { en, cs }

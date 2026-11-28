import { createT, joinTexts, type Dictionaries } from '../../i18n'
import { uiTexts } from '../../ui'
import { cs } from './texts.cs'
import { en, type DemonstrativeNounTextKey } from './texts.en'

export type { DemonstrativeNounTextKey }

/** The quiz's own texts, per UI language. */
export const demonstrativeNounTexts: Dictionaries<DemonstrativeNounTextKey> = { en, cs }

/** Translates what the quiz's area shows: its own texts and the shared type-in ones. */
export const t = createT(joinTexts(uiTexts, demonstrativeNounTexts))

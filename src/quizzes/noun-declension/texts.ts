import { createT, joinTexts, type Dictionaries } from '../../i18n'
import { uiTexts } from '../../ui'
import { cs } from './texts.cs'
import { en, type NounDeclensionTextKey } from './texts.en'

export type { NounDeclensionTextKey }

/** The quiz's own texts, per UI language. */
export const nounDeclensionTexts: Dictionaries<NounDeclensionTextKey> = { en, cs }

/** Translates what the quiz's area shows: its own texts and the shared type-in ones. */
export const t = createT(joinTexts(uiTexts, nounDeclensionTexts))

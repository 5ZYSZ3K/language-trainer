import { createT, joinTexts, type Dictionaries } from '../../i18n'
import { uiTexts } from '../../ui'
import { cs } from './texts.cs'
import { en, type AdjectiveNounTextKey } from './texts.en'

export type { AdjectiveNounTextKey }
export { caseLabelKey, filterNumberKey, formText, numberLabelKey } from './sentence-texts'

/** The quiz's own texts, per UI language. */
export const adjectiveNounTexts: Dictionaries<AdjectiveNounTextKey> = { en, cs }

/** Translates what the quiz's area shows: its own texts and the shared type-in ones. */
export const t = createT(joinTexts(uiTexts, adjectiveNounTexts))

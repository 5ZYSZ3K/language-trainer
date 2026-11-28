import { createT, joinTexts, type Dictionaries } from '../../i18n'
import { uiTexts } from '../../ui'
import type { PronounRemark } from './tables'
import { cs } from './texts.cs'
import { en, type PersonalPronounTextKey } from './texts.en'

export type { PersonalPronounTextKey }

/** The quiz's own texts, per UI language. */
export const personalPronounTexts: Dictionaries<PersonalPronounTextKey> = { en, cs }

/** Translates what the quiz's area shows: its own texts and the shared type-in ones. */
export const t = createT(joinTexts(uiTexts, personalPronounTexts))

/** The key of a remark's chip label: `remark.<code>`. Typed against the texts, so a remark without one is a compile error. */
export const remarkLabelKey = (code: PronounRemark): `remark.${PronounRemark}` => `remark.${code}`

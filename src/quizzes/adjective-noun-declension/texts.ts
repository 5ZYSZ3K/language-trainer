import { createT, joinTexts, type Dictionaries } from '../../i18n'
import { uiTexts } from '../../ui'
import type { CaseId, GrammaticalNumber } from '../noun-declension/cells'
import { cs } from './texts.cs'
import { en, type AdjectiveNounTextKey } from './texts.en'

export type { AdjectiveNounTextKey }

/** The quiz's own texts, per UI language. */
export const adjectiveNounTexts: Dictionaries<AdjectiveNounTextKey> = { en, cs }

/** Translates what the quiz's area shows: its own texts and the shared type-in ones. */
export const t = createT(joinTexts(uiTexts, adjectiveNounTexts))

/** The key of a case's name: `case.<id>`. Typed against the texts, so a case without a name is a compile error. */
export const caseLabelKey = (caseId: CaseId): AdjectiveNounTextKey => `case.${caseId}`

/** The key of a number's name: `number.<id>`. */
export const numberLabelKey = (number: GrammaticalNumber): AdjectiveNounTextKey => `number.${number}`

/** The key of a number's column heading in the filter: `filters.number.<id>`. */
export const filterNumberKey = (number: GrammaticalNumber): AdjectiveNounTextKey => `filters.number.${number}`

/** The case and the number a sentence asks for, in the texts `translate` gives: "3. dative, singular". */
export const formText = (translate: (key: AdjectiveNounTextKey) => string, caseId: CaseId, number: GrammaticalNumber): string =>
  translate('form').replace('{case}', translate(caseLabelKey(caseId))).replace('{number}', translate(numberLabelKey(number)))

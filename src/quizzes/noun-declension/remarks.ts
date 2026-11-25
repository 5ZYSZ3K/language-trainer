import type { Cell, Variant } from '../../core/cell'
import type { CellState } from '../../core/round'
import type { UiLanguage } from '../../i18n'
import { nounDeclensionTexts } from './texts'
import type { NounDeclensionTextKey } from './texts.en'

/**
 * The remark codes a noun variant may have, each with a label in the quiz's texts (`remark.<code>`). Unlike numerals'
 * remarks, a code has no part of the word in front of it. Adding one is one more code here plus its texts.
 */
export const NOUN_REMARK_CODES = ['dual', 'non-final', 'meaning'] as const
export type NounRemarkCode = (typeof NOUN_REMARK_CODES)[number]

/**
 * The codes without a shared explanation: what they mean differs from noun to noun, so only the noun's own explanation
 * can say it (`meaning`: only the noun can say which meaning is which). A variant with one needs a noun that has an
 * explanation. Every other code has a shared explanation in the texts (`remark-explanation.<code>`).
 */
const WITHOUT_SHARED_EXPLANATION = ['meaning'] as const satisfies readonly NounRemarkCode[]
type SharedExplanationCode = Exclude<NounRemarkCode, (typeof WITHOUT_SHARED_EXPLANATION)[number]>

const isNounRemarkCode = (code: unknown): code is NounRemarkCode => (NOUN_REMARK_CODES as readonly unknown[]).includes(code)

/**
 * A variant's remarks as the codes they are, for a variant whose remarks are known to be good (the contract lets only
 * known codes through; this narrows them for the type) or that has none.
 */
export const remarkCodesOf = (variant: { readonly value: string; readonly remarks?: unknown }): NounRemarkCode[] =>
  Array.isArray(variant.remarks) ? variant.remarks.filter(isNounRemarkCode) : []

export const hasSharedExplanation = (code: NounRemarkCode): code is SharedExplanationCode =>
  !(WITHOUT_SHARED_EXPLANATION as readonly string[]).includes(code)

/** The key of a code's label, on its chip: `remark.<code>`. Typed against the texts, so a code without one is a compile error. */
export const nounRemarkLabelKey = (code: NounRemarkCode): NounDeclensionTextKey => `remark.${code}`

/** The key of a code's shared explanation: `remark-explanation.<code>`. Typed the same way. */
const nounRemarkExplanationKey = (code: SharedExplanationCode): NounDeclensionTextKey => `remark-explanation.${code}`

/** A noun's own hand-written note on its special variants: HTML, in every UI language. */
export type NounExplanation = Record<UiLanguage, string>

/** One piece of a cell's answer line: a variant's value, a chip for one of its remarks, or the ⓘ for all of them. */
export type AnswerPart =
  | { readonly kind: 'form'; readonly value: string }
  | { readonly kind: 'remark'; readonly code: NounRemarkCode }
  | { readonly kind: 'explain'; readonly variant: Variant }

/**
 * What a cell's answer line shows: nothing while the cell is open; once it is checked, right or wrong, every variant
 * in order, and right after each variant with remarks a chip per remark and one ⓘ. Plain variants get neither.
 */
export function answerLine(cell: Cell, state: CellState): AnswerPart[] {
  if (state === 'open') return []
  return cell.acceptedForms.flatMap((variant): AnswerPart[] => {
    const remarks = remarkCodesOf(variant)
    const form: AnswerPart = { kind: 'form', value: variant.value }
    if (remarks.length === 0) return [form]
    return [form, ...remarks.map((code): AnswerPart => ({ kind: 'remark', code })), { kind: 'explain', variant }]
  })
}

/**
 * What the dialog an ⓘ opens shows, as HTML in `uiLanguage`: the shared explanation of each of the variant's remarks
 * that has one, in the variant's order, then the noun's own explanation, if it has one.
 */
export function explanationOf(remarks: readonly NounRemarkCode[], explanation: NounExplanation | undefined, uiLanguage: UiLanguage): string[] {
  const texts = nounDeclensionTexts[uiLanguage]
  const shared = remarks.filter(hasSharedExplanation).map((code) => texts[nounRemarkExplanationKey(code)])
  return explanation === undefined ? shared : [...shared, explanation[uiLanguage]]
}

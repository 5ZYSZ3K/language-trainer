import type { GoverningCase, GoverningVerbItem } from '../adjective-noun-declension/sentence-items'
import type { AgreementForm } from '../adjective-noun-declension/sentence-page'
import type { PersonalPronounTable, PronounRemark, PronounVariant } from './tables'

/**
 * Where the noun stands in a sentence (its position, see the glossary): after the verb (`Pomáhám mu.`), after a
 * preposition, wherever the preposition stands (`Mluvím o něm.`, `O něm mluvím.`), or at the start, with no preposition
 * (`Jemu pomáhám.`). The page never shows it: the sentence does.
 */
export const POSITIONS = ['after-verb', 'after-preposition', 'start'] as const
export type Position = (typeof POSITIONS)[number]

/**
 * Whether a sentence of `verb` can have the noun in `position`: after the verb if the verb has no preposition, after a
 * preposition if it has one, and at the start if it has neither a preposition nor a subject (`To je on.` cannot start
 * with `on`).
 */
export function fits(verb: GoverningVerbItem, position: Position): boolean {
  if (position === 'after-preposition') return verb.preposition !== undefined
  if (position === 'after-verb') return verb.preposition === undefined
  return verb.preposition === undefined && verb.subject === undefined
}

/** The remark of a variant that never starts a sentence (Czech `ho`, `mu`), which the start leaves out. */
const UNSTRESSED: PronounRemark = 'unstressed-not-sentence-initial'

/**
 * The personal pronoun's accepted forms in `form`, for a noun in `position`, in the table's order and with their
 * remarks: the table's forms after a preposition there (`něm`), its forms without one after the verb (`jemu`, `mu`), and
 * those but the unstressed ones at the start (`jemu`), which is this quiz's rule, read from the remark.
 */
export function acceptedPronouns(table: PersonalPronounTable, form: AgreementForm<GoverningCase>, position: Position): readonly PronounVariant[] {
  const forms = table.forms(form, position === 'after-preposition')
  return position === 'start' ? forms.filter((variant) => !variant.remarks?.includes(UNSTRESSED)) : forms
}

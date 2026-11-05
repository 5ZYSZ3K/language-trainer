import type { Item } from '../../core/cell'
import type { Contract } from '../../core/contract'
import { isRecord } from '../../core/is-record'
import type { Meter, QuizType } from '../quiz-type'
import { nounDeclensionCellIds } from './cells'
import { mountNounDeclension } from './mount'
import { nounDeclensionTexts, type NounDeclensionTextKey } from './texts'

export { nounCaseIds, nounCellId, nounDeclensionCellIds, nounNumbers, partsOf } from './cells'

/** A noun: an item that may also say what gender it is. */
export interface NounItem extends Item {
  /**
   * The grammatical gender as the source words it (`m. živ.`, `m. neživ.`, `ž.`, `s.`). Not used by the quiz yet; nouns
   * scraped before it was kept have none.
   */
  gender?: string
}

/**
 * What the quiz needs of an item: a non-empty prompt (the dictionary form) and the cells that exist, each with at
 * least one non-empty accepted form, in the order of `nounDeclensionCellIds` without repeats. The first cell is the
 * nominative singular, or the nominative plural for a noun that has no singular at all: the quiz shows it as given. At
 * least one cell must follow it, or there would be nothing to ask. An optional `sourceUrl` and an optional `gender`
 * must be text; other properties are ignored.
 */
export const nounDeclensionContract: Contract<NounItem> = {
  validateItem(value) {
    if (!isRecord(value)) return ['item must be an object']
    const problems: string[] = []
    if (typeof value.prompt !== 'string' || value.prompt.trim() === '') problems.push('missing prompt')
    if (value.sourceUrl !== undefined && typeof value.sourceUrl !== 'string') problems.push('sourceUrl must be text')
    if (value.gender !== undefined && (typeof value.gender !== 'string' || value.gender.trim() === '')) problems.push('gender must be text')

    const cells = value.cells
    if (!Array.isArray(cells)) return [...problems, 'cells must be a list']
    if (cells.length === 0) return [...problems, 'no cells']

    const known: readonly string[] = nounDeclensionCellIds
    const ids = cells.map((cell: unknown) => (isRecord(cell) ? cell.id : undefined))
    const positions = ids.map((id) => (typeof id === 'string' ? known.indexOf(id) : -1))
    const found = ids.map(String).join(', ')
    if (positions.includes(-1)) {
      problems.push(`cell ids must be among ${nounDeclensionCellIds.join(', ')}, found ${found}`)
    } else if (positions.some((position, i) => i > 0 && position <= positions[i - 1]!)) {
      problems.push(`cell ids must come in the order ${nounDeclensionCellIds.join(', ')}, without repeats, found ${found}`)
    } else {
      const hasSingular = ids.some((id) => String(id).endsWith('-sg'))
      const given = hasSingular ? 'nom-sg' : 'nom-pl'
      if (ids[0] !== given) problems.push(`the first cell must be ${given}, the form the learner is given, found ${String(ids[0])}`)
      if (cells.length < 2) problems.push('needs at least one form besides the given one')
    }

    cells.forEach((cell: unknown, i) => {
      const id = isRecord(cell) && typeof cell.id === 'string' ? cell.id : `#${i + 1}`
      const forms: unknown = isRecord(cell) ? cell.acceptedForms : undefined
      if (!Array.isArray(forms)) return void problems.push(`no form found for ${id}`)
      if (forms.some((form) => typeof form !== 'string')) problems.push(`cell ${id} has a form that is not text`)
      else if (!forms.some((form: string) => form.trim() !== '')) problems.push(`no form found for ${id}`)
    })
    return problems
  },

  keyOf: (item) => item.prompt,
}

const meters: readonly Meter<NounDeclensionTextKey>[] = [
  { id: 'cells', label: 'meter.cells' },
  { id: 'items', label: 'meter.items' },
]

export const nounDeclension: QuizType<NounItem> = {
  id: 'noun-declension',
  contract: nounDeclensionContract,
  meters,
  texts: nounDeclensionTexts,
  mount: mountNounDeclension,
}

import type { Item } from '../../core/cell'
import type { Contract } from '../../core/contract'
import type { Meter, QuizType } from '../quiz-type'
import { verbPresentCellIds } from './cells'
import { mountVerbPresentTense } from './mount'
import { verbPresentTexts, type VerbPresentTextKey } from './texts'

export { verbPresentCellIds, verbPresentCellLabelKeys } from './cells'

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

/**
 * What the quiz needs of an item: a non-empty prompt and exactly the six cells `verbPresentCellIds`, in that order, each
 * with at least one non-empty accepted form. Other properties (an optional `sourceUrl`, say) are ignored.
 */
export const verbPresentTenseContract: Contract<Item> = {
  validateItem(value) {
    if (!isRecord(value)) return ['item must be an object']
    const problems: string[] = []
    if (typeof value.prompt !== 'string' || value.prompt.trim() === '') problems.push('missing prompt')

    const cells = value.cells
    if (!Array.isArray(cells)) return [...problems, 'cells must be a list']

    const found = cells.map((cell: unknown) => (isRecord(cell) ? cell.id : undefined))
    const expected = verbPresentCellIds
    if (found.length !== expected.length || found.some((id, i) => id !== expected[i])) {
      problems.push(`cell ids must be ${expected.join(', ')} in that order, found ${found.map(String).join(', ')}`)
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

const meters: readonly Meter<VerbPresentTextKey>[] = [
  { id: 'cells', label: 'meter.cells' },
  { id: 'items', label: 'meter.items' },
]

export const verbPresentTense: QuizType<Item> = {
  id: 'verb-present-tense',
  contract: verbPresentTenseContract,
  meters,
  texts: verbPresentTexts,
  mount: mountVerbPresentTense,
}

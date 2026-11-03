import type { Item } from '../core/cell'
import type { Contract } from '../core/contract'
import type { Exercise } from '../core/exercise'
import type { TranslationKey } from '../i18n/en'

export const verbPresentTense: Exercise = {
  type: 'verb-present-tense',
  cellIds: ['1sg', '1pl', '2sg', '2pl', '3sg', '3pl'],
}

/** The text key of the visible label for each cell id. Data holds only the ids; the page looks the label up here. */
export const verbPresentCellLabelKeys: Readonly<Record<string, TranslationKey>> = {
  '1sg': 'verbPresent.1sg',
  '1pl': 'verbPresent.1pl',
  '2sg': 'verbPresent.2sg',
  '2pl': 'verbPresent.2pl',
  '3sg': 'verbPresent.3sg',
  '3pl': 'verbPresent.3pl',
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

/**
 * What the quiz needs of an item: a non-empty prompt and exactly the six cells `cellIds`, in that order, each
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
    const expected = verbPresentTense.cellIds
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

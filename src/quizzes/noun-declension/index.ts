import type { Item } from '../../core/cell'
import type { Contract } from '../../core/contract'
import { isRecord } from '../../core/is-record'
import { checkVariants, type CheckedVariant } from '../../core/variants'
import { UI_LANGUAGES } from '../../i18n'
import type { Meter, QuizType } from '../quiz-type'
import { carryOverNoun } from './carry-over'
import { nounDeclensionCellIds } from './cells'
import { mountNounDeclension } from './mount'
import { hasSharedExplanation, NOUN_REMARK_CODES, remarkCodesOf, type NounExplanation } from './remarks'
import { nounDeclensionTexts, type NounDeclensionTextKey } from './texts'

export { nounCaseIds, nounCellId, nounDeclensionCellIds, nounNumbers, partsOf } from './cells'
export { NOUN_REMARK_CODES, type NounExplanation, type NounRemarkCode } from './remarks'

/** A noun: an item that may also say what gender it is, and explain its special variants. */
export interface NounItem extends Item {
  /**
   * The grammatical gender as the source words it (`m. živ.`, `m. neživ.`, `ž.`, `s.`). Not used by the quiz yet; nouns
   * scraped before it was kept have none.
   */
  gender?: string
  /** The noun's own note on its variants with remarks, written by hand. The page shows it from a remark's ⓘ. */
  explanation?: NounExplanation
}

/**
 * What the quiz needs of an item: a non-empty prompt (the dictionary form) and the cells that exist, each with at
 * least one variant, in the order of `nounDeclensionCellIds` without repeats. A variant is an object with a non-empty
 * text `value` (the accepted form) and optional `remarks`: a non-empty list of codes from `NOUN_REMARK_CODES`, each
 * once. The first cell is the nominative singular, or the nominative plural for a noun that has no singular at all: the
 * quiz shows it as given, by its first value alone, so none of its variants may have remarks. At least one cell must
 * follow it, or there would be nothing to ask. An optional `sourceUrl` and an optional `gender` must be text. An
 * optional `explanation` holds a non-empty text per UI language; a noun has one only if a variant outside the given
 * cell has a remark (nothing else could open it), and must have one if a variant has a remark without a shared
 * explanation (`meaning`). Other properties are ignored.
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

    const hasExplanation = value.explanation !== undefined
    let hasRemark = false
    // Whether a cell other than the given one has variants or remarks that could not be read: then nobody knows yet if a
    // remark opens the explanation. The given cell (the first) never counts: it never gets an answer line, so a remark
    // there could never be shown, nor open the explanation.
    let unread = false
    cells.forEach((cell: unknown, i) => {
      const id = isRecord(cell) && typeof cell.id === 'string' ? cell.id : `#${i + 1}`
      const given = i === 0
      const checked = checkVariants(id, isRecord(cell) ? cell.acceptedForms : undefined)
      if ('problem' in checked) {
        if (!given) unread = true
        return void problems.push(checked.problem)
      }
      if (given) {
        if (checked.variants.some((variant) => variant.remarks !== undefined)) {
          problems.push(`cell ${id} is the given cell: the page shows only its first value and never an answer line there, so a remark on it could never be shown`)
        }
        return
      }
      const remarkProblems = checkRemarks(id, checked.variants)
      problems.push(...remarkProblems)
      if (remarkProblems.length > 0) return void (unread = true)
      const codes = checked.variants.flatMap(remarkCodesOf)
      if (codes.length > 0) hasRemark = true
      if (hasExplanation) return
      for (const code of new Set(codes.filter((code) => !hasSharedExplanation(code)))) {
        problems.push(`cell ${id} has the remark ${code}, which only the noun's own explanation explains, but the noun has no explanation`)
      }
    })

    if (hasExplanation) {
      problems.push(...explanationProblems(value.explanation))
      if (!hasRemark && !unread) problems.push('the noun has an explanation, but no variant has a remark to open it')
    }
    return problems
  },

  keyOf: (item) => item.prompt,

  /** The remarks and the explanation, written by hand, survive a forced scrape (see `carryOverNoun`). */
  carryOver: carryOverNoun,
}

/**
 * A variant's `remarks`, if it has any, is a non-empty list of codes from `NOUN_REMARK_CODES`, none of them twice. Gives
 * back the problems, at most one per variant.
 */
function checkRemarks(cellId: string, variants: readonly CheckedVariant[]): string[] {
  const known: readonly string[] = NOUN_REMARK_CODES
  return variants.flatMap(({ remarks }) => {
    if (remarks === undefined) return []
    if (!Array.isArray(remarks) || !remarks.every((code) => typeof code === 'string')) {
      return [`cell ${cellId} has a variant whose remarks are not a list of codes`]
    }
    if (remarks.length === 0) return [`cell ${cellId} has a variant with an empty list of remarks`]
    const unknown = remarks.find((code) => !known.includes(code))
    if (unknown !== undefined) return [`cell ${cellId} has a variant with the unknown remark ${unknown} (known: ${known.join(', ')})`]
    const repeated = remarks.find((code, i) => remarks.indexOf(code) !== i)
    if (repeated !== undefined) return [`cell ${cellId} has a variant with the remark ${repeated} twice`]
    return []
  })
}

/** An explanation is an object with a non-empty text for every UI language. */
function explanationProblems(explanation: unknown): string[] {
  if (!isRecord(explanation)) return [`explanation must be an object with a text per UI language (${UI_LANGUAGES.join(', ')})`]
  return UI_LANGUAGES.filter((language) => {
    const text = explanation[language]
    return typeof text !== 'string' || text.trim() === ''
  }).map((language) => `explanation has no ${language} text`)
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

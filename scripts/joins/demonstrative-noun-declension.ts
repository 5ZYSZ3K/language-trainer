import { czechGoverningVerbs } from '../../src/quizzes/adjective-noun-declension/governing-verbs.cs'
import { isGoverningCase, type SentenceNounItem } from '../../src/quizzes/adjective-noun-declension/sentence-items'
import { agreementOf } from '../../src/quizzes/adjective-noun-declension/sentence-page'
import { DEMONSTRATIVE_TABLES, demonstrativeNounContract, type DemonstrativeNounItem, type DemonstrativeTable } from '../../src/quizzes/demonstrative-noun-declension'
import { partsOf } from '../../src/quizzes/noun-declension'
import type { Join, JoinResult } from './join'
import { CZECH_NOUNS, CZECH_PAIRING, CZECH_VERBS, czechSentenceInputs, GOVERNING_VERBS, joinSentenceQuiz, type SentenceJoinInputs, type SentenceNounRules } from './sentence'

export interface DemonstrativeNounJoinInputs extends SentenceJoinInputs {
  /** The learned language's demonstrative pronoun table, which must give a form for every cell of every noun. */
  readonly table: DemonstrativeTable
}

/**
 * The dataset of demonstratives with nouns, joined from the pairing (its nouns only: the adjectives are not read), the
 * noun and verb datasets and the governing verbs (see joinSentenceQuiz): the nouns in pairing order, each without its
 * vocative cells, which this quiz never asks, then the verbs in module order. Besides what every sentence quiz's join
 * refuses, nothing is made, and every problem is listed, if the table gives no form for a cell a noun has, or a plural
 * gender is not one the table knows.
 */
export function joinDemonstrativesWithNouns({ table, ...inputs }: DemonstrativeNounJoinInputs): JoinResult<DemonstrativeNounItem> {
  return joinSentenceQuiz(inputs, demonstrativeNouns(table), demonstrativeNounContract, GOVERNING_VERBS)
}

/** The nouns of demonstratives with nouns: each without its vocative cells, and with a form of the pronoun in each other one. */
const demonstrativeNouns = (table: DemonstrativeTable): SentenceNounRules<SentenceNounItem, true> => ({
  entry: 'a noun and its gender',
  genders: table.genders,
  own: () => true,
  make: ({ cells, ...noun }) => ({ ...noun, cells: cells.filter((cell) => isGoverningCase(partsOf(cell.id)?.caseId)) }),
  problems(item, noun) {
    const problem = formProblem(table, item)
    return problem === undefined ? [] : [`${noun}: the demonstrative pronoun has no form in ${problem}`]
  },
})

/** Where, and why, the table has no pronoun for `noun`: the first cell of the noun it throws in or gives no form for. */
function formProblem(table: DemonstrativeTable, noun: SentenceNounItem): string | undefined {
  for (const cell of noun.cells) {
    const parts = partsOf(cell.id)
    if (!parts || !isGoverningCase(parts.caseId)) continue
    try {
      const form = table.form(agreementOf(noun, parts.caseId, parts.number))
      if (form.trim() === '') return cell.id
    } catch (error) {
      return `${cell.id}: ${error instanceof Error ? error.message : String(error)}`
    }
  }
  return undefined
}

/**
 * `npm run join:cs:demonstratives`: the Czech demonstratives with nouns, from the nouns of
 * `lists/cs/adjective-noun-declension.json`, `cs/prirucka/noun-declension`, `cs/prirucka/verb-present-tense` and the
 * Czech governing verbs.
 */
export const czechDemonstrativesWithNouns: Join = {
  pool: { language: 'cs', source: 'language-trainer', quizType: 'demonstrative-noun-declension' },
  command: 'npm run join:cs:demonstratives',
  datasets: [CZECH_NOUNS, CZECH_VERBS],
  lists: [CZECH_PAIRING],
  make({ data, lists }) {
    const problems: string[] = []
    const inputs = czechSentenceInputs(data, lists, problems)
    const table = DEMONSTRATIVE_TABLES.cs
    if (!table) problems.push('there is no Czech demonstrative pronoun table')
    if (problems.length > 0 || !inputs || !table) return { items: [], problems }
    return joinDemonstrativesWithNouns({ ...inputs, governingVerbs: czechGoverningVerbs, table })
  },
}

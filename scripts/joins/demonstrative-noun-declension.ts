import { isGoverningCase, type SentenceNounItem } from '../../src/quizzes/adjective-noun-declension/sentence-items'
import { agreementOf } from '../../src/quizzes/adjective-noun-declension/sentence-page'
import { DEMONSTRATIVE_TABLES, demonstrativeNounContract, type DemonstrativeNounItem, type DemonstrativeTable } from '../../src/quizzes/demonstrative-noun-declension'
import { partsOf } from '../../src/quizzes/noun-declension'
import type { Join, JoinResult } from './join'
import { czechSentenceJoin, joinSentenceQuiz, nounsWithoutVocative, VERBS_AS_THEY_ARE, type SentenceJoinInputs } from './sentence'

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
  const nouns = nounsWithoutVocative(table.genders, 'the demonstrative pronoun', (noun) => formProblem(table, noun))
  return joinSentenceQuiz(inputs, nouns, demonstrativeNounContract, VERBS_AS_THEY_ARE)
}

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
export const czechDemonstrativesWithNouns: Join = czechSentenceJoin({
  quizType: 'demonstrative-noun-declension',
  command: 'npm run join:cs:demonstratives',
  declensions: DEMONSTRATIVE_TABLES,
  declensionName: 'demonstrative pronoun table',
  join: (inputs, table) => joinDemonstrativesWithNouns({ ...inputs, table }),
})

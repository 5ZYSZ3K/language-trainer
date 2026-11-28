import { mountSentenceQuiz } from '../adjective-noun-declension/sentence-mount'
import type { QuizHost, QuizInstance } from '../quiz-type'
import type { DemonstrativeNounItem } from './items'
import { DemonstrativePage } from './page'
import { DEMONSTRATIVE_TABLES } from './tables'
import { t } from './texts'

/**
 * The sentence quiz's page (see mountSentenceQuiz) with the demonstrative pronoun in the first blank: `ten` and the noun
 * in their base forms with the case and number above the sentence, then the verb form, a field for the pronoun and one
 * for the noun. Filters offer the 12 forms of every case but the vocative. Records into the meters `pronouns`, `nouns`
 * (per checked field) and `sentences` (per completed sentence).
 */
export function mountDemonstrativeNounDeclension(container: HTMLElement, host: QuizHost<DemonstrativeNounItem>): QuizInstance {
  // Without a table for the learned language there is nothing to check answers against: no round, only the help.
  const table = DEMONSTRATIVE_TABLES[host.language.id]
  const page = table && new DemonstrativePage({ items: host.items, table, settings: host.settings, record: host.record, random: Math.random })
  return mountSentenceQuiz(container, host, { page, t })
}

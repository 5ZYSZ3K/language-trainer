import type { QuizHost, QuizInstance } from '../quiz-type'
import { ADJECTIVE_DECLENSION_GENERATORS } from './generators'
import type { AdjectiveNounItem } from './items'
import { SentencePage } from './page'
import { sentencePageHost } from './sentence-page'
import { mountTwoFieldSentenceQuiz } from './sentence-mount'
import { t } from './texts'

/**
 * The page of a sentence quiz of two fields (see mountTwoFieldSentenceQuiz) with an adjective in the first blank: the
 * adjective and the noun in their base forms with the case and number above the sentence, then the verb form, a field
 * for the adjective and one for the noun. Filters offer all 14 forms. Records into the meters `adjectives`, `nouns` (per checked field) and
 * `sentences` (per completed sentence).
 */
export function mountAdjectiveNounDeclension(container: HTMLElement, host: QuizHost<AdjectiveNounItem>): QuizInstance {
  // Without a generator for the learned language there is nothing to check answers against: no round, only the help.
  const generator = ADJECTIVE_DECLENSION_GENERATORS[host.language.id]
  const page = generator && new SentencePage({ items: host.items, generator, ...sentencePageHost(host) })
  return mountTwoFieldSentenceQuiz(container, host, { page, t })
}

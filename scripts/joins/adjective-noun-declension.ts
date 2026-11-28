import { ADJECTIVE_DECLENSION_GENERATORS, type AdjectiveDeclensionGenerator } from '../../src/quizzes/adjective-noun-declension/generators'
import { adjectiveNounContract, type AdjectiveNounItem, type PairedNounItem } from '../../src/quizzes/adjective-noun-declension/items'
import { agreementOf } from '../../src/quizzes/adjective-noun-declension/sentence-page'
import { partsOf } from '../../src/quizzes/noun-declension'
import type { Join, JoinResult } from './join'
import { czechSentenceJoin, joinSentenceQuiz, VERBS_AS_THEY_ARE, type SentenceJoinInputs, type SentenceNounRules } from './sentence'

export interface AdjectiveNounJoinInputs extends SentenceJoinInputs {
  /** The learned language's adjective declension generator, which every adjective must decline with. */
  readonly generator: AdjectiveDeclensionGenerator
}

/**
 * The dataset of adjectives with nouns, joined from the pairing, the noun and verb datasets and the governing verbs (see
 * joinSentenceQuiz): the nouns in pairing order, each with its adjectives and every case, then the verbs in module order
 * (see `PairedNounItem`, `GoverningVerbItem`). Besides what every sentence quiz's join refuses, nothing is made, and
 * every problem is listed, if an adjective list is empty or repeats one, an adjective does not decline in some cell of
 * its noun, or a plural gender is not one the generator knows.
 */
export function joinAdjectivesWithNouns({ generator, ...inputs }: AdjectiveNounJoinInputs): JoinResult<AdjectiveNounItem> {
  return joinSentenceQuiz(inputs, adjectiveNouns(generator), adjectiveNounContract, VERBS_AS_THEY_ARE)
}

/** The nouns of adjectives with nouns: each with the pairing's adjectives, which must all decline in each of its cells. */
const adjectiveNouns = (generator: AdjectiveDeclensionGenerator): SentenceNounRules<PairedNounItem, string[]> => ({
  entry: 'a noun, its gender and its adjectives',
  genders: generator.genders,
  own: (entry, noun, problems) => adjectivesOf(noun, entry.adjectives, problems),
  make: ({ cells, ...noun }, adjectives) => ({ ...noun, adjectives, cells }),
  problems(item, noun) {
    const problems: string[] = []
    for (const adjective of new Set(item.adjectives)) {
      const problem = declensionProblem(generator, item, adjective)
      if (problem !== undefined) problems.push(`${noun}: the adjective ${JSON.stringify(adjective)} cannot be declined in ${problem}`)
    }
    return problems
  },
})

/** The pairing's adjectives of a noun; undefined, with a problem, for an empty list or one that is not all text. A repeat is a problem too. */
function adjectivesOf(noun: string, adjectives: unknown, problems: string[]): string[] | undefined {
  if (!Array.isArray(adjectives) || adjectives.length === 0) {
    problems.push(`${noun} has no adjectives`)
    return undefined
  }
  if (!adjectives.every((adjective) => typeof adjective === 'string' && adjective.trim() !== '')) {
    problems.push(`${noun} has an adjective that is not text`)
    return undefined
  }
  const repeated = adjectives.filter((adjective, i) => adjectives.indexOf(adjective) !== i)
  for (const adjective of new Set(repeated)) problems.push(`${noun} has the adjective ${JSON.stringify(adjective)} twice`)
  return adjectives
}

/** Where, and why, `adjective` does not decline with `noun`: the first cell of the noun it throws in or gives no form for. */
function declensionProblem(generator: AdjectiveDeclensionGenerator, noun: PairedNounItem, adjective: string): string | undefined {
  for (const cell of noun.cells) {
    const parts = partsOf(cell.id)
    if (!parts) continue
    try {
      const forms = generator.decline(adjective, agreementOf(noun, parts.caseId, parts.number))
      if (!forms.some((form) => form.trim() !== '')) return `${cell.id}: it gives no form`
    } catch (error) {
      return `${cell.id}: ${error instanceof Error ? error.message : String(error)}`
    }
  }
  return undefined
}

/**
 * `npm run join:cs:adjectives`: the Czech adjectives with nouns, from `lists/cs/adjective-noun-declension.json`,
 * `cs/prirucka/noun-declension`, `cs/prirucka/verb-present-tense` and the Czech governing verbs.
 */
export const czechAdjectivesWithNouns: Join = czechSentenceJoin({
  quizType: 'adjective-noun-declension',
  command: 'npm run join:cs:adjectives',
  declensions: ADJECTIVE_DECLENSION_GENERATORS,
  declensionName: 'adjective declension generator',
  join: (inputs, generator) => joinAdjectivesWithNouns({ ...inputs, generator }),
})

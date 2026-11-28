import { czechGoverningVerbs } from '../../src/quizzes/adjective-noun-declension/governing-verbs.cs'
import { isGoverningCase, PERSONS, type Person, type SentenceNounItem } from '../../src/quizzes/adjective-noun-declension/sentence-items'
import { partsOf } from '../../src/quizzes/noun-declension'
import {
  acceptedPronouns,
  PERSONAL_PRONOUN_TABLES,
  personalPronounContract,
  POSITIONS,
  reflexiveOf,
  type PersonalPronounItem,
  type PersonalPronounTable,
  type Position,
  type PronounVerbItem,
} from '../../src/quizzes/personal-pronoun-declension'
import type { Join, JoinResult } from './join'
import {
  CZECH_NOUNS,
  CZECH_PAIRING,
  CZECH_VERBS,
  czechSentenceInputs,
  joinSentenceQuiz,
  type SentenceJoinInputs,
  type SentenceNounRules,
  type SentenceVerbRules,
} from './sentence'

export interface PersonalPronounJoinInputs extends SentenceJoinInputs {
  /** The learned language's personal pronoun table, which must give a form for every cell of every noun, in every position. */
  readonly table: PersonalPronounTable
}

/**
 * The dataset of personal pronouns, joined from the pairing (its nouns only: the adjectives are not read), the noun and
 * verb datasets and the governing verbs (see joinSentenceQuiz): the nouns in pairing order, each without its vocative
 * cells, which this quiz never asks, as demonstratives with nouns makes them; then the verbs in module order, each with
 * a reflexive verb's particle kept apart from its forms. Besides what every sentence quiz's join refuses, nothing is
 * made, and every problem is listed, if the table gives no form for a cell a noun has in some position, a plural gender
 * is not one the table knows, or a reflexive verb's form does not end with its particle.
 */
export function joinPersonalPronouns({ table, ...inputs }: PersonalPronounJoinInputs): JoinResult<PersonalPronounItem> {
  return joinSentenceQuiz(inputs, pronounNouns(table), personalPronounContract, REFLEXIVE_APART)
}

/** The nouns of personal pronouns: each without its vocative cells, and with a form of the pronoun in each other one. */
const pronounNouns = (table: PersonalPronounTable): SentenceNounRules<SentenceNounItem, true> => ({
  entry: 'a noun and its gender',
  genders: table.genders,
  own: () => true,
  make: ({ cells, ...noun }) => ({ ...noun, cells: cells.filter((cell) => isGoverningCase(partsOf(cell.id)?.caseId)) }),
  problems(item, noun) {
    const problem = formProblem(table, item)
    return problem === undefined ? [] : [`${noun}: the personal pronoun has no form in ${problem}`]
  },
})

const POSITION_NAMES: Readonly<Record<Position, string>> = { 'after-verb': 'after the verb', 'after-preposition': 'after a preposition', start: 'at the start' }

/**
 * Where, and why, the table has no pronoun for `noun`: the first cell of the noun, and position, it throws in or accepts
 * no form in (at the start, the unstressed forms are not accepted).
 */
function formProblem(table: PersonalPronounTable, noun: SentenceNounItem): string | undefined {
  for (const cell of noun.cells) {
    const parts = partsOf(cell.id)
    if (!parts || !isGoverningCase(parts.caseId)) continue
    const form = { caseId: parts.caseId, number: parts.number, gender: noun.gender, pluralGender: noun.pluralGender }
    try {
      const empty = POSITIONS.find((position) => acceptedPronouns(table, form, position).every((variant) => variant.value.trim() === ''))
      if (empty !== undefined) return `${cell.id} ${POSITION_NAMES[empty]}`
    } catch (error) {
      return `${cell.id}: ${error instanceof Error ? error.message : String(error)}`
    }
  }
  return undefined
}

/**
 * The governing verbs of personal pronouns: a reflexive verb, one whose prompt's last word is `se` or `si`, has that word
 * as its `reflexive`, cut off the end of every form (`bojím se` → `bojím`), so that a sentence can put it second.
 */
const REFLEXIVE_APART: SentenceVerbRules<PronounVerbItem> = {
  make(item, verb, problems) {
    const particle = reflexiveOf(item.verb)
    if (particle === undefined) return item
    const ending = ` ${particle}`
    const forms = Object.fromEntries(
      PERSONS.map((person) => {
        const form = item.forms[person]
        if (form.endsWith(ending)) return [person, form.slice(0, -ending.length)]
        problems.push(`${verb}: its ${person}, ${JSON.stringify(form)}, does not end with its reflexive particle ${JSON.stringify(particle)}`)
        return [person, form]
      }),
    ) as Record<Person, string>
    const { kind, verb: prompt, ...rest } = item
    return { kind, verb: prompt, reflexive: particle, ...rest, forms }
  },
}

/**
 * `npm run join:cs:personal-pronouns`: the Czech personal pronouns, from the nouns of
 * `lists/cs/adjective-noun-declension.json`, `cs/prirucka/noun-declension`, `cs/prirucka/verb-present-tense` and the
 * Czech governing verbs.
 */
export const czechPersonalPronouns: Join = {
  pool: { language: 'cs', source: 'language-trainer', quizType: 'personal-pronoun-declension' },
  command: 'npm run join:cs:personal-pronouns',
  datasets: [CZECH_NOUNS, CZECH_VERBS],
  lists: [CZECH_PAIRING],
  make({ data, lists }) {
    const problems: string[] = []
    const inputs = czechSentenceInputs(data, lists, problems)
    const table = PERSONAL_PRONOUN_TABLES.cs
    if (!table) problems.push('there is no Czech personal pronoun table')
    if (problems.length > 0 || !inputs || !table) return { items: [], problems }
    return joinPersonalPronouns({ ...inputs, governingVerbs: czechGoverningVerbs, table })
  },
}

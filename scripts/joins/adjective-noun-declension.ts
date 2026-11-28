import type { Cell, Item } from '../../src/core/cell'
import { isRecord } from '../../src/core/is-record'
import { datasetPath, poolKey, type Pool } from '../../src/datasets/pool'
import { ADJECTIVE_DECLENSION_GENERATORS, type AdjectiveDeclensionGenerator } from '../../src/quizzes/adjective-noun-declension/generators'
import type { GoverningVerb } from '../../src/quizzes/adjective-noun-declension/governing-verbs'
import { czechGoverningVerbs } from '../../src/quizzes/adjective-noun-declension/governing-verbs.cs'
import {
  adjectiveNounContract,
  GOVERNING_CASES,
  PERSONS,
  type AdjectiveNounItem,
  type GoverningVerbItem,
  type PairedNounItem,
  type Person,
} from '../../src/quizzes/adjective-noun-declension/items'
import { nounCellId, nounDeclensionContract, partsOf, type NounItem, type NounRemarkCode } from '../../src/quizzes/noun-declension'
import { verbPresentTenseContract } from '../../src/quizzes/verb-present-tense'
import { parseInput, type Join, type JoinResult } from './join'

/** A dataset the join reads: its name (the pool key), for the messages, and its items, as parsed. */
export interface InputDataset {
  readonly name: string
  readonly items: readonly unknown[]
}

export interface AdjectiveNounJoinInputs {
  /** The pairing list, as parsed: `[{ "noun", "gender", "plural-gender"?, "adjectives": [...] }, ...]`. */
  readonly pairing: unknown
  /** The noun dataset: each paired noun's cells and gender. */
  readonly nouns: InputDataset
  /** The verb dataset: the forms of the governing verbs. */
  readonly verbs: InputDataset
  readonly governingVerbs: readonly GoverningVerb[]
  /** The learned language's adjective declension generator, which every adjective must decline with. */
  readonly generator: AdjectiveDeclensionGenerator
}

/** The remark of a noun's variant that this quiz drops: the noun always ends the phrase. */
const NON_FINAL = 'non-final' satisfies NounRemarkCode
/** The remark it refuses in the instrumental plural (`INS_PL`): the dual is not designed for this quiz yet. */
const DUAL = 'dual' satisfies NounRemarkCode
const INS_PL = nounCellId('ins', 'pl')

/**
 * The dataset of adjectives with nouns, joined from the pairing, the noun and verb datasets and the governing verbs:
 * the nouns in pairing order, then the verbs in module order (see `PairedNounItem`, `GoverningVerbItem`). A noun's cells
 * are its noun dataset cells, every case, without the variants marked `non-final` and without any remark. A verb's
 * forms are the first variant of each person, unless the entry names another. Nothing is made, and every problem is
 * listed, if a pairing noun is not in the noun dataset or its gender differs there, an adjective list is empty or
 * repeats one, an adjective does not decline in some cell of its noun, a plural gender is not one the generator knows,
 * a noun's `ins-pl` has a dual variant, a governing verb is not in the verb dataset or names a variant it lacks, or a
 * case other than the vocative has no governing verb.
 */
export function joinAdjectivesWithNouns(inputs: AdjectiveNounJoinInputs): JoinResult<AdjectiveNounItem> {
  const problems: string[] = []
  const nouns = joinNouns(inputs, problems)
  const verbs = joinVerbs(inputs, problems)

  for (const caseId of GOVERNING_CASES) {
    if (!inputs.governingVerbs.some((entry) => entry.case === caseId)) problems.push(`no governing verb is followed by the case ${caseId}`)
  }

  // Whatever the join makes must satisfy the quiz's contract: a dataset holds only valid items.
  const items: AdjectiveNounItem[] = [...nouns, ...verbs]
  for (const item of items) {
    const what = item.kind === 'noun' ? `noun ${JSON.stringify(item.prompt)}` : `governing verb ${JSON.stringify(verbName(item))}`
    for (const problem of adjectiveNounContract.validateItem(item)) problems.push(`${what}: ${problem}`)
  }
  return problems.length > 0 ? { items: [], problems } : { items, problems }
}

const verbName = ({ verb, preposition }: { verb: string; preposition?: string }) => (preposition === undefined ? verb : `${verb} ${preposition}`)

/** The valid items of a dataset by prompt, and the prompts of the invalid ones (check-data says what is wrong with them). */
function byPrompt<T extends Item>(dataset: InputDataset, validate: (value: unknown) => string[]): { valid: Map<string, T>; invalid: Set<string> } {
  const valid = new Map<string, T>()
  const invalid = new Set<string>()
  for (const item of dataset.items) {
    const prompt = isRecord(item) ? item.prompt : undefined
    if (typeof prompt !== 'string') continue
    if (validate(item).length === 0) valid.set(prompt, item as T)
    else invalid.add(prompt)
  }
  return { valid, invalid }
}

function joinNouns({ pairing, nouns, generator }: AdjectiveNounJoinInputs, problems: string[]): PairedNounItem[] {
  if (!Array.isArray(pairing)) {
    problems.push('the pairing must be a list of nouns')
    return []
  }
  const { valid, invalid } = byPrompt<NounItem>(nouns, (value) => nounDeclensionContract.validateItem(value))
  const seen = new Set<string>()
  const joined: PairedNounItem[] = []

  for (const [i, entry] of pairing.entries()) {
    if (!isRecord(entry)) {
      problems.push(`pairing entry ${i + 1} must be an object with a noun, its gender and its adjectives`)
      continue
    }
    const prompt = entry.noun
    if (typeof prompt !== 'string' || prompt.trim() === '') {
      problems.push(`pairing entry ${i + 1} has no noun`)
      continue
    }
    const noun = `noun ${JSON.stringify(prompt)}`
    if (seen.has(prompt)) {
      problems.push(`${noun} is in the pairing twice`)
      continue
    }
    seen.add(prompt)

    // Every problem of this noun is listed: a check is left out only where it cannot run.
    const before = problems.length
    const item = valid.get(prompt)
    if (!item) {
      problems.push(invalid.has(prompt) ? `${noun} is not a valid item of ${nouns.name} (npm run check-data says why)` : `${noun} is not a noun of ${nouns.name}`)
    } else if (item.gender === undefined) {
      problems.push(`${noun} has no gender in ${nouns.name}`)
    } else if (entry.gender !== item.gender) {
      problems.push(`${noun} is ${JSON.stringify(entry.gender)} in the pairing but ${JSON.stringify(item.gender)} in ${nouns.name}`)
    }

    const pluralGender = entry['plural-gender']
    const knownPluralGender = pluralGender === undefined || (typeof pluralGender === 'string' && generator.genders.includes(pluralGender))
    if (!knownPluralGender) {
      problems.push(`${noun} has the plural gender ${JSON.stringify(pluralGender)}, which is not one of ${generator.genders.join(', ')}`)
    }

    const adjectives = adjectivesOf(noun, entry.adjectives, problems)

    // Without the noun there are no cells to look at.
    if (!item) continue
    const dual = item.cells.find((cell) => cell.id === INS_PL)?.acceptedForms.filter((variant) => variant.remarks?.includes(DUAL)) ?? []
    if (dual.length > 0) {
      problems.push(`${noun} has a dual variant in ${INS_PL} (${dual.map((variant) => variant.value).join(', ')}), which this quiz does not handle yet`)
    }

    // The adjectives are declined only by a gender the two agree on and a plural gender the generator knows: by any
    // other, every cell would fail for the gender, not for the adjective.
    if (item.gender === undefined || entry.gender !== item.gender || !knownPluralGender || !adjectives) continue
    const paired: PairedNounItem = {
      kind: 'noun',
      prompt,
      gender: item.gender,
      ...(typeof pluralGender === 'string' ? { pluralGender } : {}),
      adjectives,
      cells: item.cells.map(finalCell),
    }
    for (const adjective of new Set(adjectives)) {
      const problem = declensionProblem(generator, paired, adjective)
      if (problem !== undefined) problems.push(`${noun}: the adjective ${JSON.stringify(adjective)} cannot be declined in ${problem}`)
    }
    if (problems.length === before) joined.push(paired)
  }
  return joined
}

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

/** A noun dataset cell as this quiz asks it: the noun ends the phrase, so no `non-final` variant, and no remark is shown. */
function finalCell(cell: Cell): Cell {
  return { id: cell.id, acceptedForms: cell.acceptedForms.filter((variant) => !variant.remarks?.includes(NON_FINAL)).map(({ value }) => ({ value })) }
}

/** Where, and why, `adjective` does not decline with `noun`: the first cell of the noun it throws in or gives no form for. */
function declensionProblem(generator: AdjectiveDeclensionGenerator, noun: PairedNounItem, adjective: string): string | undefined {
  for (const cell of noun.cells) {
    const parts = partsOf(cell.id)
    if (!parts) continue
    try {
      const forms = generator.decline(adjective, { ...parts, gender: noun.gender, pluralGender: noun.pluralGender })
      if (!forms.some((form) => form.trim() !== '')) return `${cell.id}: it gives no form`
    } catch (error) {
      return `${cell.id}: ${error instanceof Error ? error.message : String(error)}`
    }
  }
  return undefined
}

function joinVerbs({ verbs, governingVerbs }: AdjectiveNounJoinInputs, problems: string[]): GoverningVerbItem[] {
  const { valid, invalid } = byPrompt<Item>(verbs, (value) => verbPresentTenseContract.validateItem(value))

  return governingVerbs.flatMap((entry): GoverningVerbItem[] => {
    const what = `governing verb ${JSON.stringify(verbName(entry))}`
    const item = valid.get(entry.verb)
    if (!item) {
      problems.push(invalid.has(entry.verb) ? `${what} is not a valid item of ${verbs.name} (npm run check-data says why)` : `${what} is not a verb of ${verbs.name}`)
      return []
    }
    const before = problems.length
    const forms = Object.fromEntries(
      PERSONS.map((person) => {
        const variants = item.cells.find((cell) => cell.id === person)!.acceptedForms.map((variant) => variant.value)
        const shown = entry.show?.[person]
        if (shown !== undefined && !variants.includes(shown)) {
          problems.push(`${what} shows ${JSON.stringify(shown)} for ${person}, which is not a variant of its ${person} (${variants.join(', ')})`)
        }
        return [person, shown ?? variants[0]!]
      }),
    ) as Record<Person, string>
    if (problems.length > before) return []
    return [
      {
        kind: 'verb',
        verb: entry.verb,
        ...(entry.subject === undefined ? {} : { subject: entry.subject }),
        ...(entry.preposition === undefined ? {} : { preposition: entry.preposition }),
        case: entry.case,
        forms,
      },
    ]
  })
}

const NOUNS: Pool = { language: 'cs', source: 'prirucka', quizType: 'noun-declension' }
const VERBS: Pool = { language: 'cs', source: 'prirucka', quizType: 'verb-present-tense' }
const PAIRING = 'cs/adjective-noun-declension.json'

/**
 * `npm run join:cs:adjectives`: the Czech adjectives with nouns, from `lists/cs/adjective-noun-declension.json`,
 * `cs/prirucka/noun-declension`, `cs/prirucka/verb-present-tense` and the Czech governing verbs.
 */
export const czechAdjectivesWithNouns: Join = {
  pool: { language: 'cs', source: 'language-trainer', quizType: 'adjective-noun-declension' },
  command: 'npm run join:cs:adjectives',
  datasets: [NOUNS, VERBS],
  lists: [PAIRING],
  make({ data, lists }) {
    const problems: string[] = []
    const pairing = parseInput(`lists/${PAIRING}`, lists[PAIRING], problems)
    const nouns = datasetOf(NOUNS, data, problems)
    const verbs = datasetOf(VERBS, data, problems)
    const generator = ADJECTIVE_DECLENSION_GENERATORS.cs
    if (!generator) problems.push('there is no Czech adjective declension generator')
    if (problems.length > 0 || !nouns || !verbs || !generator) return { items: [], problems }
    return joinAdjectivesWithNouns({ pairing, nouns, verbs, governingVerbs: czechGoverningVerbs, generator })
  },
}

/** The items of a dataset the join reads, or undefined, with the reason, if its file cannot be read. */
function datasetOf(pool: Pool, data: Readonly<Record<string, string>>, problems: string[]): InputDataset | undefined {
  const where = `data/${datasetPath(pool)}`
  const parsed = parseInput(where, data[datasetPath(pool)], problems)
  if (parsed === undefined) return undefined
  if (!isRecord(parsed) || !Array.isArray(parsed.items)) {
    problems.push(`${where} has no item list`)
    return undefined
  }
  return { name: poolKey(pool), items: parsed.items }
}

import type { Cell, Item } from '../../src/core/cell'
import type { Contract } from '../../src/core/contract'
import { isRecord } from '../../src/core/is-record'
import { datasetPath, poolKey, type Pool } from '../../src/datasets/pool'
import type { GoverningVerb } from '../../src/quizzes/adjective-noun-declension/governing-verbs'
import { GOVERNING_CASES, PERSONS, type GoverningVerbItem, type Person, type SentenceNounItem } from '../../src/quizzes/adjective-noun-declension/sentence-items'
import { nounCellId, nounDeclensionContract, type NounItem, type NounRemarkCode } from '../../src/quizzes/noun-declension'
import { verbPresentTenseContract } from '../../src/quizzes/verb-present-tense'
import { parseInput, type JoinResult } from './join'

// What the joins of the sentence quizzes share: they read the same pairing, noun and verb datasets and governing verbs,
// and make the same governing verb items; each makes its nouns its own way (see SentenceNounRules).

/** A dataset the join reads: its name (the pool key), for the messages, and its items, as parsed. */
export interface InputDataset {
  readonly name: string
  readonly items: readonly unknown[]
}

/** What every sentence quiz's join reads. */
export interface SentenceJoinInputs {
  /** The pairing list, as parsed: `[{ "noun", "gender", "plural-gender"?, ... }, ...]`. */
  readonly pairing: unknown
  /** The noun dataset: each paired noun's cells and gender. */
  readonly nouns: InputDataset
  /** The verb dataset: the forms of the governing verbs. */
  readonly verbs: InputDataset
  readonly governingVerbs: readonly GoverningVerb[]
}

/** How one sentence quiz makes its nouns from the pairing, beyond what they all share. */
export interface SentenceNounRules<Noun extends SentenceNounItem, Own> {
  /** What a pairing entry must be, as the problem words it: `an object with ${entry}`. */
  readonly entry: string
  /** The genders a `plural-gender` may be: those the quiz's generator or table declines by. */
  readonly genders: readonly string[]
  /** The quiz's own parts of a pairing entry (a noun's adjectives), adding every problem with them; undefined if they cannot be used. */
  own(entry: Record<string, unknown>, noun: string, problems: string[]): Own | undefined
  /** The quiz's item for a noun, from what every sentence quiz has of it and its own parts. */
  make(noun: SentenceNounItem, own: Own): Noun
  /** Every problem with the item made (`noun` names it in the messages): a cell its first blank's word has no form in. */
  problems(item: Noun, noun: string): string[]
}

/** How one sentence quiz makes its governing verb items from what they all share (see GoverningVerbItem). */
export interface SentenceVerbRules<Verb extends GoverningVerbItem> {
  /** The quiz's item for a governing verb, adding every problem with it to `problems` (`verb` names it in the messages). */
  make(item: GoverningVerbItem, verb: string, problems: string[]): Verb
}

/** The governing verb items as they are: what adjectives with nouns and demonstratives with nouns make. */
export const GOVERNING_VERBS: SentenceVerbRules<GoverningVerbItem> = { make: (item) => item }

/** The remark of a noun's variant that the sentence quizzes drop: the noun always ends the phrase. */
const NON_FINAL = 'non-final' satisfies NounRemarkCode
/** The remark they refuse in the instrumental plural (`INS_PL`): the dual is not designed for them yet. */
const DUAL = 'dual' satisfies NounRemarkCode
const INS_PL = nounCellId('ins', 'pl')

/**
 * The dataset of a sentence quiz, joined from the pairing, the noun and verb datasets and the governing verbs: the nouns
 * in pairing order (each made by `rules`, from its noun dataset cells without the variants marked `non-final` and
 * without any remark), then the verbs in module order (each made by `verbRules` from its GoverningVerbItem). A verb's
 * forms are the first variant of each person, unless the entry names another. Nothing is made, and every problem is
 * listed, if a pairing noun is not in the noun dataset or its gender differs there, a plural gender is not one of
 * `rules.genders`, a noun's `ins-pl` has a dual variant, the quiz's own checks fail (`rules.own`, `rules.problems`,
 * `verbRules.make`), a governing verb is not in the verb dataset or names a variant it lacks, a case other than the
 * vocative has no governing verb, or an item made breaks `contract`.
 */
export function joinSentenceQuiz<Noun extends SentenceNounItem, Own, Verb extends GoverningVerbItem>(
  inputs: SentenceJoinInputs,
  rules: SentenceNounRules<Noun, Own>,
  contract: Contract<Noun | Verb>,
  verbRules: SentenceVerbRules<Verb>,
): JoinResult<Noun | Verb> {
  const problems: string[] = []
  const nouns = joinNouns(inputs, rules, problems)
  const verbs = joinVerbs(inputs, verbRules, problems)

  for (const caseId of GOVERNING_CASES) {
    if (!inputs.governingVerbs.some((entry) => entry.case === caseId)) problems.push(`no governing verb is followed by the case ${caseId}`)
  }

  // Whatever the join makes must satisfy the quiz's contract: a dataset holds only valid items.
  const items: (Noun | Verb)[] = [...nouns, ...verbs]
  for (const item of items) {
    const what = item.kind === 'noun' ? `noun ${JSON.stringify(item.prompt)}` : `governing verb ${JSON.stringify(verbName(item))}`
    for (const problem of contract.validateItem(item)) problems.push(`${what}: ${problem}`)
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

function joinNouns<Noun extends SentenceNounItem, Own>({ pairing, nouns }: SentenceJoinInputs, rules: SentenceNounRules<Noun, Own>, problems: string[]): Noun[] {
  if (!Array.isArray(pairing)) {
    problems.push('the pairing must be a list of nouns')
    return []
  }
  const { valid, invalid } = byPrompt<NounItem>(nouns, (value) => nounDeclensionContract.validateItem(value))
  const seen = new Set<string>()
  const joined: Noun[] = []

  for (const [i, entry] of pairing.entries()) {
    if (!isRecord(entry)) {
      problems.push(`pairing entry ${i + 1} must be an object with ${rules.entry}`)
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
    const knownPluralGender = pluralGender === undefined || (typeof pluralGender === 'string' && rules.genders.includes(pluralGender))
    if (!knownPluralGender) {
      problems.push(`${noun} has the plural gender ${JSON.stringify(pluralGender)}, which is not one of ${rules.genders.join(', ')}`)
    }

    const own = rules.own(entry, noun, problems)

    // Without the noun there are no cells to look at.
    if (!item) continue
    const dual = item.cells.find((cell) => cell.id === INS_PL)?.acceptedForms.filter((variant) => variant.remarks?.includes(DUAL)) ?? []
    if (dual.length > 0) {
      problems.push(`${noun} has a dual variant in ${INS_PL} (${dual.map((variant) => variant.value).join(', ')}), which this quiz does not handle yet`)
    }

    // The first blank's word is declined only by a gender the two agree on and a plural gender the quiz knows: by any
    // other, every cell would fail for the gender, not for the word.
    if (item.gender === undefined || entry.gender !== item.gender || !knownPluralGender || own === undefined) continue
    const made = rules.make(
      {
        kind: 'noun',
        prompt,
        gender: item.gender,
        ...(typeof pluralGender === 'string' ? { pluralGender } : {}),
        cells: item.cells.map(finalCell),
      },
      own,
    )
    problems.push(...rules.problems(made, noun))
    if (problems.length === before) joined.push(made)
  }
  return joined
}

/** A noun dataset cell as a sentence quiz asks it: the noun ends the phrase, so no `non-final` variant, and no remark is shown. */
function finalCell(cell: Cell): Cell {
  return { id: cell.id, acceptedForms: cell.acceptedForms.filter((variant) => !variant.remarks?.includes(NON_FINAL)).map(({ value }) => ({ value })) }
}

function joinVerbs<Verb extends GoverningVerbItem>({ verbs, governingVerbs }: SentenceJoinInputs, rules: SentenceVerbRules<Verb>, problems: string[]): Verb[] {
  const { valid, invalid } = byPrompt<Item>(verbs, (value) => verbPresentTenseContract.validateItem(value))

  return governingVerbs.flatMap((entry): Verb[] => {
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
    const made: GoverningVerbItem = {
      kind: 'verb',
      verb: entry.verb,
      ...(entry.subject === undefined ? {} : { subject: entry.subject }),
      ...(entry.preposition === undefined ? {} : { preposition: entry.preposition }),
      case: entry.case,
      forms,
    }
    return [rules.make(made, what, problems)]
  })
}

/** The Czech noun dataset, which every Czech sentence quiz takes its nouns' cells and genders from. */
export const CZECH_NOUNS: Pool = { language: 'cs', source: 'prirucka', quizType: 'noun-declension' }
/** The Czech verb dataset, which every Czech sentence quiz takes its governing verbs' forms from. */
export const CZECH_VERBS: Pool = { language: 'cs', source: 'prirucka', quizType: 'verb-present-tense' }
/** The Czech pairing, below lists/: the nouns of every Czech sentence quiz, with the adjectives each may be paired with. */
export const CZECH_PAIRING = 'cs/adjective-noun-declension.json'

/** The pairing, the noun dataset and the verb dataset of a Czech sentence quiz, as read; undefined, with every problem, if one cannot be read. */
export function czechSentenceInputs(
  data: Readonly<Record<string, string>>,
  lists: Readonly<Record<string, string>>,
  problems: string[],
): Omit<SentenceJoinInputs, 'governingVerbs'> | undefined {
  const pairing = parseInput(`lists/${CZECH_PAIRING}`, lists[CZECH_PAIRING], problems)
  const nouns = datasetOf(CZECH_NOUNS, data, problems)
  const verbs = datasetOf(CZECH_VERBS, data, problems)
  return problems.length > 0 || !nouns || !verbs ? undefined : { pairing, nouns, verbs }
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

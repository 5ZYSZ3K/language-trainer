import type { Cell } from '../../core/cell'
import { splitItems } from '../adjective-noun-declension/sentence-draw'
import { GOVERNING_CASES, type GoverningCase, type SentenceNounItem } from '../adjective-noun-declension/sentence-items'
import { agreementOf, SentenceRoundPage, type SentencePageHost } from '../adjective-noun-declension/sentence-page'
import type { CellFilter } from '../noun-declension/filter'
import { drawPronounSentence, type PronounDraw } from './draw'
import type { PersonalPronounItem, PronounVerbItem } from './items'
import { acceptedPronouns } from './positions'
import type { PersonalPronounTable, PronounRemark, PronounVariant } from './tables'
import { sentenceOf, type PronounSentence } from './word-order'

/** The meter of the one field, the pronoun. There is no meter of sentences: this one already counts each of them. */
export const PRONOUN_METER = 'pronouns'

export interface PersonalPronounPageDeps extends SentencePageHost {
  readonly items: readonly PersonalPronounItem[]
  readonly table: PersonalPronounTable
}

/** One piece of the field's answer line: an accepted form, or the chip of one of its remarks. */
export type AnswerPart = { readonly kind: 'form'; readonly value: string } | { readonly kind: 'remark'; readonly code: PronounRemark }

/**
 * The page of personal pronouns without its DOM: the sentence quiz page (see SentenceRoundPage) with one field, the
 * personal pronoun in the noun's place, in every case but the vocative. A round draws the noun's position too (see
 * drawPronounSentence), which decides the pronoun's accepted forms (see acceptedPronouns), and the page shows the sentence
 * with the noun before the one with the field.
 */
export class PersonalPronounPage extends SentenceRoundPage<PronounDraw, GoverningCase> {
  private readonly nouns: SentenceNounItem[]
  private readonly verbs: PronounVerbItem[]
  private readonly table: PersonalPronounTable

  constructor({ items, table, ...deps }: PersonalPronounPageDeps) {
    super({ ...deps, cases: GOVERNING_CASES, meters: { fields: [PRONOUN_METER] } })
    const { nouns, verbs } = splitItems(items)
    this.nouns = nouns
    this.verbs = verbs
    this.table = table
  }

  /** The round on the page (see sentenceOf), or undefined when the filter leaves nothing to ask for. */
  get sentence(): PronounSentence | undefined {
    return this.draw && sentenceOf(this.draw)
  }

  /**
   * The field's answer line: nothing while it is open or once it is right; once it is wrong, every accepted form in the
   * table's order, each one with remarks followed by a chip per remark.
   */
  get answer(): readonly AnswerPart[] {
    if (!this.draw || this.fields[0]?.state !== 'wrong') return []
    return this.accepted(this.draw).flatMap((variant): AnswerPart[] => [
      { kind: 'form', value: variant.value },
      ...(variant.remarks ?? []).map((code): AnswerPart => ({ kind: 'remark', code })),
    ])
  }

  /** A new round (see drawPronounSentence). */
  protected drawRound(filter: CellFilter, previous: PronounDraw | undefined, random: () => number): PronounDraw | undefined {
    return drawPronounSentence(this.nouns, this.verbs, filter, previous?.noun, random)
  }

  /** The pronoun's cell: its accepted forms in the round's form and the noun's position. */
  protected cellsOf(draw: PronounDraw): Cell[] {
    return [{ id: 'pronoun', acceptedForms: this.accepted(draw).map(({ value }) => ({ value })) }]
  }

  private accepted({ noun, caseId, number, position }: PronounDraw): readonly PronounVariant[] {
    return acceptedPronouns(this.table, agreementOf(noun, caseId, number), position)
  }
}

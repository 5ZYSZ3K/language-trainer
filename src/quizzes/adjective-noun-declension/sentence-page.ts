import type { Cell } from '../../core/cell'
import { Round, type CellState } from '../../core/round'
import type { CaseId, GrammaticalNumber } from '../noun-declension/cells'
import { readFilter, saveFilter, type CellFilter } from '../noun-declension/filter'
import type { QuizHost, QuizSettings } from '../quiz-type'
import { FilterDraft, restrictedTo } from './filter'
import { drawSentenceOf, named, splitItems, type SentenceDraw, type SentenceRules } from './sentence-draw'
import { nounCell, type GoverningVerbItem, type SentenceNounItem } from './sentence-items'

/** Which form of the first blank's word is wanted: a case and a number, agreeing with a noun of `gender`. */
export interface AgreementForm<C extends CaseId = CaseId> {
  readonly caseId: C
  readonly number: GrammaticalNumber
  /** The noun's gender, worded as the noun dataset words it (`m. živ.`). */
  readonly gender: string
  /** The gender the noun's plural agrees in, where it differs from `gender` (`dítě` is neuter, `děti` feminine). */
  readonly pluralGender?: string
}

/** The form in `caseId` and `number` of a word that agrees with `noun`: with its gender, and its plural gender if it has one. */
export const agreementOf = <C extends CaseId>(noun: SentenceNounItem, caseId: C, number: GrammaticalNumber): AgreementForm<C> => ({
  caseId,
  number,
  gender: noun.gender,
  pluralGender: noun.pluralGender,
})

/** What fills the first blank of a quiz of two fields, and which cases it offers (see SentenceRules), with the forms it accepts. */
export interface TwoFieldSentenceRules<Noun extends SentenceNounItem, Kind extends string, C extends CaseId> extends SentenceRules<Noun, Kind, C> {
  /** Every accepted form of the first blank's word, given by its base form, in `form`: from a generator or a table. */
  acceptedForms(baseForm: string, form: AgreementForm<C>): string[]
}

/**
 * The meter of each field, in field order, and the meter of whole sentences, if the quiz has one: a quiz of one field
 * has none, since its field's meter already counts every sentence.
 */
export interface SentenceMeters {
  readonly fields: readonly string[]
  readonly sentence?: string
}

/** What the page of every sentence quiz takes from outside: the saved settings, the meters and the randomness. */
export interface SentencePageHost {
  /** The quiz's saved settings for the pool: the filter, a case and a number each (the noun quiz's). */
  readonly settings: QuizSettings
  record(meterId: string, correct: boolean): void
  /** Returns [0, 1), like Math.random. */
  readonly random: () => number
}

/** What a sentence quiz's page takes from the shell: the host's settings and recorder, and Math.random. */
export const sentencePageHost = (host: QuizHost<unknown>): SentencePageHost => ({ settings: host.settings, record: host.record, random: Math.random })

/** What the page of every sentence quiz is handed, whatever its round holds. */
export interface SentenceRoundDeps<C extends CaseId> extends SentencePageHost {
  /** The cases the quiz offers, in case order: the filter shows only their forms. */
  readonly cases: readonly C[]
  readonly meters: SentenceMeters
}

/** What the page of a sentence quiz of two fields is handed (see TwoFieldSentencePage). */
export interface TwoFieldSentencePageDeps<Noun extends SentenceNounItem, Kind extends string, C extends CaseId> extends SentencePageHost {
  readonly items: readonly (Noun | GoverningVerbItem)[]
  readonly rules: TwoFieldSentenceRules<Noun, Kind, C>
  readonly meters: SentenceMeters
}

/** What the page shows of a round, above the fields and around them. */
export type Sentence<Kind extends string, C extends CaseId> = {
  /** The noun in its base form; the first blank's word is in its base form under its kind (`adjective`, `pronoun`). */
  readonly noun: string
  readonly caseId: C
  readonly number: GrammaticalNumber
  /**
   * Before the fields: the verb form, after its subject and with its preposition, capitalised (`To je`, `Dívám se na`);
   * empty in the vocative.
   */
  readonly lead: string
  /** After the fields: a full stop, or an exclamation mark in the vocative (`___ ___!`). */
  readonly end: '.' | '!'
} & { readonly [K in Kind]: string }

/** One of the round's fields: its state and, to show once it is checked, every form it accepts. */
export interface Field {
  readonly state: CellState
  readonly acceptedForms: readonly string[]
}

const NO_EVENTS = { cellChecked: () => {}, itemCompleted: () => {} }

export const capitalised = (text: string): string => text.charAt(0).toUpperCase() + text.slice(1)

function leadOf(verb: SentenceDraw<SentenceNounItem, string, CaseId>['verb']): string {
  if (!verb) return ''
  const { subject, preposition, forms } = verb.item
  return capitalised([subject, forms[verb.person], preposition].filter((word) => word !== undefined).join(' '))
}

/**
 * The page of a sentence quiz without its DOM, whatever its round holds (`Draw`): the round on the page, what checking
 * does to its fields and the meters it records, and the filter with its dialog. What a round is, and which cells it
 * asks, is the quiz's (`drawRound`, `cellsOf`); so are the cases offered and the meters (`deps`). sentence-mount.ts draws
 * what this says, and hands it every Enter, click and closed dialog.
 */
export abstract class SentenceRoundPage<Draw, C extends CaseId> {
  private cellFilter: CellFilter
  private drawn: Draw | undefined
  /** The cells the round asks, in field order; none when there is nothing to ask. */
  private cells: Cell[] = []
  private round = new Round({ prompt: '', cells: [] }, NO_EVENTS)
  /** The ticks of the filter dialog while it is open, over the cases the quiz offers. */
  readonly filterDraft: FilterDraft

  constructor(private readonly roundDeps: SentenceRoundDeps<C>) {
    this.filterDraft = new FilterDraft(roundDeps.cases)
    // Saved settings may come from an older build: readFilter checks them (a filter of cases ticks every form). Only the
    // forms of the cases the quiz offers count.
    this.cellFilter = restrictedTo(readFilter(roundDeps.settings.get()), roundDeps.cases)
  }

  /** The cases the quiz offers, in case order. */
  get cases(): readonly C[] {
    return this.roundDeps.cases
  }

  get filter(): CellFilter {
    return this.cellFilter
  }

  /** What the page shows of the round on the page, or undefined when the filter leaves nothing to ask for. */
  abstract get sentence(): object | undefined

  /** The round's fields, in field order; none when there is nothing to ask. */
  get fields(): readonly Field[] {
    return this.cells.map((cell, i) => ({ state: this.round.state(i), acceptedForms: cell.acceptedForms.map((variant) => variant.value) }))
  }

  /** True once every field is checked, and from the start when there is nothing to ask: then only a new sentence is left. */
  get complete(): boolean {
    return this.round.complete
  }

  /** A new sentence, drawn at random (see drawRound). The one on the page is left as it is, unfinished if it was. */
  start(): void {
    this.drawn = this.drawRound(this.cellFilter, this.drawn, this.roundDeps.random)
    this.cells = this.drawn === undefined ? [] : this.cellsOf(this.drawn)
    // A round with nothing to ask is complete from the start, so nothing can be checked or recorded in it.
    this.round = new Round({ prompt: '', cells: this.cells }, NO_EVENTS)
  }

  /**
   * Enter in field `index`, holding `input`: checks that field (an empty one is not checked) and gives the field to go
   * to, the next open one after it or else the first open one (undefined: none is open). Once every field is checked,
   * Enter starts the next sentence instead, and gives its first field.
   */
  enter(index: number, input: string): number | undefined {
    if (this.complete) {
      this.start()
      return this.cells.length > 0 ? 0 : undefined
    }
    this.checking(() => this.round.checkCell(index, input))
    const open = this.cells.map((_, i) => i).filter((i) => this.round.state(i) === 'open')
    return open.find((i) => i > index) ?? open[0]
  }

  /** "Check all": checks every open field, an empty one as wrong; `inputs[i]` belongs to field i. */
  checkAll(inputs: readonly string[]): void {
    this.checking(() => this.round.checkAll(inputs))
  }

  /** Opens the filter dialog's draft on the filter in use. */
  openFilter(): void {
    this.filterDraft.open(this.cellFilter)
  }

  /**
   * The filter dialog closed (Done, Esc or a click outside): applies its ticks, if they changed, saves them for the pool
   * and starts a new sentence. Says whether anything changed.
   */
  closeFilter(): boolean {
    const chosen = this.filterDraft.close()
    if (!chosen) return false
    this.cellFilter = chosen
    this.roundDeps.settings.set(saveFilter(chosen))
    this.start()
    return true
  }

  /** The round on the page, as drawn; undefined when the filter leaves nothing to ask for. */
  protected get draw(): Draw | undefined {
    return this.drawn
  }

  /** A new round, drawn at random after `previous` (the one on the page, if any); undefined when `filter` leaves nothing to ask. */
  protected abstract drawRound(filter: CellFilter, previous: Draw | undefined, random: () => number): Draw | undefined

  /** The cells `draw` asks, one per field, in field order. */
  protected abstract cellsOf(draw: Draw): Cell[]

  /** Runs a check and records the meter of each field it checked, then the sentence's, if it completed the sentence. */
  private checking(check: () => void): void {
    if (this.complete) return
    const { fields, sentence } = this.roundDeps.meters
    const before = this.fields.map((field) => field.state)
    check()
    const after = this.fields.map((field) => field.state)
    after.forEach((state, i) => {
      if (before[i] === 'open' && state !== 'open') this.roundDeps.record(fields[i]!, state === 'correct')
    })
    if (this.complete && sentence !== undefined) this.roundDeps.record(sentence, after.every((state) => state === 'correct'))
  }
}

/**
 * The page of a sentence quiz of two fields without its DOM (see SentenceRoundPage): a word in the first blank and the
 * noun in the second, after the verb form. What fills the first blank, the cases offered and the meters are the quiz's
 * (`deps.rules`, `deps.meters`).
 */
export class TwoFieldSentencePage<Noun extends SentenceNounItem, Kind extends string, C extends CaseId> extends SentenceRoundPage<SentenceDraw<Noun, Kind, C>, C> {
  private readonly nouns: Noun[]
  private readonly verbs: GoverningVerbItem[]

  constructor(private readonly deps: TwoFieldSentencePageDeps<Noun, Kind, C>) {
    super({ ...deps, cases: deps.rules.cases })
    const { nouns, verbs } = splitItems(deps.items)
    this.nouns = nouns
    this.verbs = verbs
  }

  /** What fills the first blank (`adjective`, `pronoun`). */
  get kind(): Kind {
    return this.deps.rules.kind
  }

  /** The round on the page, or undefined when the filter leaves nothing to ask for. */
  get sentence(): Sentence<Kind, C> | undefined {
    if (!this.draw) return undefined
    const { noun, caseId, number, verb } = this.draw
    return { ...named(this.kind, this.draw[this.kind]), noun: noun.prompt, caseId, number, lead: leadOf(verb), end: verb ? '.' : '!' }
  }

  /** A new round (see drawSentenceOf). */
  protected drawRound(filter: CellFilter, previous: SentenceDraw<Noun, Kind, C> | undefined, random: () => number) {
    return drawSentenceOf(this.deps.rules, this.nouns, this.verbs, filter, previous?.noun, random)
  }

  /** The first blank's cell (its forms from the quiz's rules) and the noun's (its cell of the case and number). */
  protected cellsOf(draw: SentenceDraw<Noun, Kind, C>): Cell[] {
    const { noun, caseId, number } = draw
    const forms = this.deps.rules.acceptedForms(draw[this.kind], agreementOf(noun, caseId, number))
    return [{ id: this.kind, acceptedForms: forms.map((value) => ({ value })) }, nounCell(noun, caseId, number)]
  }
}

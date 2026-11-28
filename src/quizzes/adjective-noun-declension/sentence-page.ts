import type { Cell } from '../../core/cell'
import { Round, type CellState } from '../../core/round'
import { nounCellId, type CaseId, type GrammaticalNumber } from '../noun-declension/cells'
import { readFilter, saveFilter, type CellFilter } from '../noun-declension/filter'
import type { QuizSettings } from '../quiz-type'
import { FilterDraft, restrictedTo } from './filter'
import { drawSentenceOf, named, splitItems, type SentenceDraw, type SentenceRules } from './sentence-draw'
import type { GoverningVerbItem, SentenceNounItem } from './sentence-items'

/** Which form of the first blank's word is wanted: a case and a number, agreeing with a noun of `gender`. */
export interface AgreementForm<C extends CaseId = CaseId> {
  readonly caseId: C
  readonly number: GrammaticalNumber
  /** The noun's gender, worded as the noun dataset words it (`m. živ.`). */
  readonly gender: string
  /** The gender the noun's plural agrees in, where it differs from `gender` (`dítě` is neuter, `děti` feminine). */
  readonly pluralGender?: string
}

/** What fills a sentence quiz's first blank, and which cases it offers (see SentenceRules), with the forms it accepts. */
export interface SentenceQuizRules<Noun extends SentenceNounItem, Kind extends string, C extends CaseId> extends SentenceRules<Noun, Kind, C> {
  /** Every accepted form of the first blank's word, given by its base form, in `form`: from a generator or a table. */
  acceptedForms(baseForm: string, form: AgreementForm<C>): string[]
}

/** The meter of each field, in field order (the first blank's word, then the noun), and the meter of whole sentences. */
export interface SentenceMeters {
  readonly fields: readonly [string, string]
  readonly sentence: string
}

export interface SentenceQuizPageDeps<Noun extends SentenceNounItem, Kind extends string, C extends CaseId> {
  readonly items: readonly (Noun | GoverningVerbItem)[]
  readonly rules: SentenceQuizRules<Noun, Kind, C>
  readonly meters: SentenceMeters
  /** The quiz's saved settings for the pool: the filter, a case and a number each (the noun quiz's). */
  readonly settings: QuizSettings
  record(meterId: string, correct: boolean): void
  /** Returns [0, 1), like Math.random. */
  readonly random: () => number
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

/** One of the two fields: its state and, to show once it is checked, every form it accepts. */
export interface Field {
  readonly state: CellState
  readonly acceptedForms: readonly string[]
}

const NO_EVENTS = { cellChecked: () => {}, itemCompleted: () => {} }

const capitalised = (text: string): string => text.charAt(0).toUpperCase() + text.slice(1)

function leadOf(verb: SentenceDraw<SentenceNounItem, string, CaseId>['verb']): string {
  if (!verb) return ''
  const { subject, preposition, forms } = verb.item
  return capitalised([subject, forms[verb.person], preposition].filter((word) => word !== undefined).join(' '))
}

/**
 * The page of a sentence quiz without its DOM: the round on the page, what checking does to it and the meters it
 * records, and the filter with its dialog. What fills the first blank, the cases offered and the meters are the quiz's
 * (`deps.rules`, `deps.meters`). sentence-mount.ts draws what this says, and hands it every Enter, click and closed
 * dialog.
 */
export class SentenceQuizPage<Noun extends SentenceNounItem, Kind extends string, C extends CaseId> {
  private readonly nouns: Noun[]
  private readonly verbs: GoverningVerbItem[]
  private cellFilter: CellFilter
  private draw: SentenceDraw<Noun, Kind, C> | undefined
  /** The two cells the round asks, the first blank's and the noun's; none when there is nothing to ask. */
  private cells: Cell[] = []
  private round = new Round({ prompt: '', cells: [] }, NO_EVENTS)
  /** The ticks of the filter dialog while it is open, over the cases the quiz offers. */
  readonly filterDraft: FilterDraft

  constructor(private readonly deps: SentenceQuizPageDeps<Noun, Kind, C>) {
    const { nouns, verbs } = splitItems(deps.items)
    this.nouns = nouns
    this.verbs = verbs
    this.filterDraft = new FilterDraft(deps.rules.cases)
    // Saved settings may come from an older build: readFilter checks them (a filter of cases ticks every form). Only the
    // forms of the cases the quiz offers count.
    this.cellFilter = restrictedTo(readFilter(deps.settings.get()), deps.rules.cases)
  }

  /** What fills the first blank (`adjective`, `pronoun`). */
  get kind(): Kind {
    return this.deps.rules.kind
  }

  /** The cases the quiz offers, in case order. */
  get cases(): readonly C[] {
    return this.deps.rules.cases
  }

  get filter(): CellFilter {
    return this.cellFilter
  }

  /** The round on the page, or undefined when the filter leaves nothing to ask for. */
  get sentence(): Sentence<Kind, C> | undefined {
    if (!this.draw) return undefined
    const { noun, caseId, number, verb } = this.draw
    return { ...named(this.kind, this.draw[this.kind]), noun: noun.prompt, caseId, number, lead: leadOf(verb), end: verb ? '.' : '!' }
  }

  /** The first blank's field and the noun's, in that order; none when there is nothing to ask. */
  get fields(): readonly Field[] {
    return this.cells.map((cell, i) => ({ state: this.round.state(i), acceptedForms: cell.acceptedForms.map((variant) => variant.value) }))
  }

  /** True once both fields are checked, and from the start when there is nothing to ask: then only a new sentence is left. */
  get complete(): boolean {
    return this.round.complete
  }

  /** A new sentence, drawn at random (see drawSentenceOf). The one on the page is left as it is, unfinished if it was. */
  start(): void {
    this.draw = drawSentenceOf(this.deps.rules, this.nouns, this.verbs, this.cellFilter, this.draw?.noun, this.deps.random)
    this.cells = this.draw ? this.cellsOf(this.draw) : []
    // A round with nothing to ask is complete from the start, so nothing can be checked or recorded in it.
    this.round = new Round({ prompt: this.draw?.noun.prompt ?? '', cells: this.cells }, NO_EVENTS)
  }

  /**
   * Enter in field `index`, holding `input`: checks that field (an empty one is not checked) and gives the field to go
   * to, the next open one after it or else the first open one (undefined: none is open). Once both fields are checked,
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
    this.deps.settings.set(saveFilter(chosen))
    this.start()
    return true
  }

  /** Runs a check and records the meter of each field it checked, then the sentence's, if it completed the sentence. */
  private checking(check: () => void): void {
    if (this.complete) return
    const { fields, sentence } = this.deps.meters
    const before = this.fields.map((field) => field.state)
    check()
    const after = this.fields.map((field) => field.state)
    after.forEach((state, i) => {
      if (before[i] === 'open' && state !== 'open') this.deps.record(fields[i]!, state === 'correct')
    })
    if (this.complete) this.deps.record(sentence, after.every((state) => state === 'correct'))
  }

  /** The first blank's cell (its forms from the quiz's rules) and the noun's (its cell of the case and number). */
  private cellsOf(draw: SentenceDraw<Noun, Kind, C>): Cell[] {
    const { noun, caseId, number } = draw
    const forms = this.deps.rules.acceptedForms(draw[this.kind], { caseId, number, gender: noun.gender, pluralGender: noun.pluralGender })
    const nounCell = noun.cells.find((cell) => cell.id === nounCellId(caseId, number))!
    return [{ id: this.kind, acceptedForms: forms.map((value) => ({ value })) }, nounCell]
  }
}

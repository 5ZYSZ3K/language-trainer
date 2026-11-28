import type { Cell } from '../../core/cell'
import { Round, type CellState } from '../../core/round'
import { nounCellId, type CaseId, type GrammaticalNumber } from '../noun-declension/cells'
import { readFilter, saveFilter, type CellFilter } from '../noun-declension/filter'
import type { QuizSettings } from '../quiz-type'
import { drawSentence, drawSentenceOn, splitItems, type Draw } from './draw'
import { FilterDraft } from './filter'
import type { AdjectiveDeclensionGenerator } from './generators'
import type { AdjectiveNounItem, GoverningVerbItem, PairedNounItem } from './items'

/** The meter of each field, in field order (the adjective, then the noun), and the meter of whole sentences. */
export const FIELD_METERS = ['adjectives', 'nouns'] as const
export const SENTENCE_METER = 'sentences'

export interface SentencePageDeps {
  readonly items: readonly AdjectiveNounItem[]
  readonly generator: AdjectiveDeclensionGenerator
  /** The quiz's saved settings for the pool: the filter, a case and a number each (the noun quiz's). */
  readonly settings: QuizSettings
  record(meterId: string, correct: boolean): void
  /** Returns [0, 1), like Math.random. */
  readonly random: () => number
}

/** What the page shows of a round, above the fields and around them. */
export interface Sentence {
  /** The adjective and the noun in their base forms. */
  readonly adjective: string
  readonly noun: string
  readonly caseId: CaseId
  readonly number: GrammaticalNumber
  /**
   * Before the fields: the verb form, after its subject and with its preposition, capitalised (`To je`, `Dívám se na`);
   * empty in the vocative.
   */
  readonly lead: string
  /** After the fields: a full stop, or an exclamation mark in the vocative (`___ ___!`). */
  readonly end: '.' | '!'
}

/** One of the two fields: its state and, to show once it is checked, every form it accepts. */
export interface Field {
  readonly state: CellState
  readonly acceptedForms: readonly string[]
}

const NO_EVENTS = { cellChecked: () => {}, itemCompleted: () => {} }

const capitalised = (text: string): string => text.charAt(0).toUpperCase() + text.slice(1)

function leadOf(verb: Draw['verb']): string {
  if (!verb) return ''
  const { subject, preposition, forms } = verb.item
  return capitalised([subject, forms[verb.person], preposition].filter((word) => word !== undefined).join(' '))
}

/**
 * The quiz page without its DOM: the round on the page, what checking does to it and the meters it records, and the
 * filter with its dialog. `mount.ts` draws what this says, and hands it every Enter, click and closed dialog.
 */
export class SentencePage {
  /** The pool's nouns, in dataset order: what Go to noun looks the typed word up in. */
  readonly nouns: readonly PairedNounItem[]
  private readonly verbs: GoverningVerbItem[]
  private cellFilter: CellFilter
  private draw: Draw | undefined
  /** The two cells the round asks, the adjective's and the noun's; none when there is nothing to ask. */
  private cells: Cell[] = []
  private round = new Round({ prompt: '', cells: [] }, NO_EVENTS)
  /** The ticks of the filter dialog while it is open. */
  readonly filterDraft = new FilterDraft()

  constructor(private readonly deps: SentencePageDeps) {
    const { nouns, verbs } = splitItems(deps.items)
    this.nouns = nouns
    this.verbs = verbs
    // Saved settings may come from an older build: readFilter checks them (a filter of cases ticks every form).
    this.cellFilter = readFilter(deps.settings.get())
  }

  get filter(): CellFilter {
    return this.cellFilter
  }

  /** The round on the page, or undefined when the filter leaves nothing to ask for. */
  get sentence(): Sentence | undefined {
    if (!this.draw) return undefined
    const { noun, adjective, caseId, number, verb } = this.draw
    return { adjective, noun: noun.prompt, caseId, number, lead: leadOf(verb), end: verb ? '.' : '!' }
  }

  /** The adjective's field and the noun's, in that order; none when there is nothing to ask. */
  get fields(): readonly Field[] {
    return this.cells.map((cell, i) => ({ state: this.round.state(i), acceptedForms: cell.acceptedForms.map((variant) => variant.value) }))
  }

  /** True once both fields are checked, and from the start when there is nothing to ask: then only a new sentence is left. */
  get complete(): boolean {
    return this.round.complete
  }

  /**
   * A new sentence: on `noun` (Go to noun), or on a random noun if none is given (see drawSentence); the rest is drawn
   * the same either way (see drawSentenceOn). The one on the page is left as it is, unfinished if it was.
   */
  start(noun?: PairedNounItem): void {
    this.draw = noun
      ? drawSentenceOn(noun, this.verbs, this.cellFilter, this.deps.random)
      : drawSentence(this.nouns, this.verbs, this.cellFilter, this.draw?.noun, this.deps.random)
    this.cells = this.draw ? cellsOf(this.draw, this.deps.generator) : []
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
    const before = this.fields.map((field) => field.state)
    check()
    const after = this.fields.map((field) => field.state)
    after.forEach((state, i) => {
      if (before[i] === 'open' && state !== 'open') this.deps.record(FIELD_METERS[i]!, state === 'correct')
    })
    if (this.complete) this.deps.record(SENTENCE_METER, after.every((state) => state === 'correct'))
  }
}

/** The adjective's cell (its forms from the generator) and the noun's (its cell of the case and number). */
function cellsOf({ noun, adjective, caseId, number }: Draw, generator: AdjectiveDeclensionGenerator): Cell[] {
  const forms = generator.decline(adjective, { caseId, number, gender: noun.gender, pluralGender: noun.pluralGender })
  const nounCell = noun.cells.find((cell) => cell.id === nounCellId(caseId, number))!
  return [{ id: 'adjective', acceptedForms: forms.map((value) => ({ value })) }, nounCell]
}

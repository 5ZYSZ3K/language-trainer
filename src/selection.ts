import type { Pool } from './datasets/pool'
import type { Language } from './languages'
import type { QuizType } from './quizzes'
import { findById } from './registry'
import type { Source } from './sources'

/**
 * What a selector would show, as a pure function of the registries and a state. Order of choices: learned
 * language, then source, then quiz type. `choose` settles on one quiz of it; the shell draws the selector from the rest.
 */

export interface Registries {
  readonly languages: readonly Language[]
  readonly sources: readonly Source[]
  readonly quizTypes: readonly QuizType<unknown>[]
}

export interface SelectionState {
  /** Language id. */
  readonly language: string
  /** Source id; ignored if that source has nothing for the language. */
  readonly sourceId?: string
  /** "Also show quizzes from other sources": off by default and never remembered. */
  readonly includeOtherSources: boolean
}

/** One quiz of one source. Items are drawn only from its pool's dataset, never mixed across sources. */
export interface QuizChoice {
  readonly pool: Pool
  readonly quizType: QuizType<unknown>
}

export interface SourceChoice {
  readonly source: Source
  /** The quiz types this source provides for the chosen language, in quiz registry order. */
  readonly quizzes: readonly QuizChoice[]
}

export interface Selection {
  /** The languages at least one source provides something for, in registry order. */
  readonly languages: readonly Language[]
  /** The chosen language; undefined if it is not among `languages`. */
  readonly language: Language | undefined
  /** Every source that provides something for the language, untrusted ones included: trusted first, then by name. */
  readonly sources: readonly SourceChoice[]
  /** The chosen source, else the first trusted one of `sources`; undefined if there is none and the user must choose. */
  readonly selected: SourceChoice | undefined
  /** With `includeOtherSources`: the other sources' quizzes, grouped by source, in the order of `sources`. Otherwise empty. */
  readonly others: readonly SourceChoice[]
}

const provides = (source: Source, language: Language) => source.provides.filter((entry) => entry.language === language.id)

const availableLanguages = ({ languages, sources }: Registries) =>
  languages.filter((language) => sources.some((source) => provides(source, language).length > 0))

export function select(registries: Registries, state: SelectionState): Selection {
  const { sources: allSources, quizTypes } = registries
  const languages = availableLanguages(registries)
  const language = findById(languages, state.language)
  if (!language) return { languages, language, sources: [], selected: undefined, others: [] }

  const choice = (source: Source): SourceChoice => ({
    source,
    quizzes: quizTypes
      .filter((quizType) => provides(source, language).some((entry) => entry.quizType === quizType.id))
      .map((quizType) => ({ pool: { language: language.id, source: source.id, quizType: quizType.id }, quizType })),
  })
  const rank = (source: Source) => (source.trust === 'trusted' ? 0 : 1)
  const sources = allSources
    .filter((source) => provides(source, language).length > 0)
    .sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name))
    .map(choice)

  const selected =
    sources.find((candidate) => candidate.source.id === state.sourceId) ??
    sources.find((candidate) => candidate.source.trust === 'trusted')
  const others = state.includeOtherSources ? sources.filter((candidate) => candidate !== selected) : []
  return { languages, language, sources, selected, others }
}

/** What `choose` settles on: the chosen quiz, and everything a selector needs to show around it. */
export interface Choice {
  /** The language, source and quiz that were chosen. */
  readonly language: Language
  readonly source: SourceChoice
  readonly quiz: QuizChoice
  /** The choices on offer for the chosen language. */
  readonly selection: Selection
}

/**
 * The pool to open, given a previous choice. Whatever part of `saved` is still on offer is kept: the language, then
 * (within it) the source, then (within that) the quiz. A part that is missing or no longer registered falls back to the
 * default of its level, so an old or hand-edited choice can never leave the page without a pool. Undefined only if
 * nothing at all is registered.
 */
export function choose(registries: Registries, saved: Partial<Pool> = {}): Choice | undefined {
  const languages = availableLanguages(registries)
  const language = languages.find((candidate) => candidate.id === saved.language) ?? languages[0]
  if (!language) return undefined
  const selection = select(registries, { language: language.id, sourceId: saved.source, includeOtherSources: false })
  const source = selection.selected
  const quiz = source?.quizzes.find((candidate) => candidate.quizType.id === saved.quizType) ?? source?.quizzes[0]
  return source && quiz ? { language, source, quiz, selection } : undefined
}

/** The pool the page opens with when nothing was chosen before: the first available language, its default source, that source's first quiz. */
export const defaultPool = (registries: Registries): Pool | undefined => choose(registries)?.quiz.pool

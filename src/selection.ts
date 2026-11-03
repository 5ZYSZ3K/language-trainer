import type { Pool } from './datasets/pool'
import type { Language } from './languages'
import type { QuizType } from './quizzes'
import type { Source } from './sources'

/**
 * What a selector would show, as a pure function of the registries and a state. Order of choices: learned
 * language, then source, then quiz type. The page has no selector yet; `defaultPool` is its only user today.
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
  const language = languages.find((candidate) => candidate.id === state.language)
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

/** The pool the page opens with: the first available language, its default source, that source's first quiz. */
export function defaultPool(registries: Registries): Pool | undefined {
  const [first] = availableLanguages(registries)
  if (!first) return undefined
  return select(registries, { language: first.id, includeOtherSources: false }).selected?.quizzes[0]?.pool
}

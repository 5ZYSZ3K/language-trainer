import type { GoverningCase, Person } from './items'

/**
 * One governing verb of a learned language: a verb, with at most one preposition, that is always followed by one case.
 * Only the join and the build read these (each learned language has its own module, `governing-verbs.<id>.ts`); the page
 * gets the verbs from the dataset.
 */
export interface GoverningVerb {
  /** A prompt of the verb dataset. */
  readonly verb: string
  readonly case: GoverningCase
  /** One that never changes its form (Czech: not `v`, `s`, `k` or `z`, which become `ve`, `se`, `ke`, `ze`). */
  readonly preposition?: string
  /** The variant a sentence shows for a person, where the verb dataset's first variant is the wrong one. */
  readonly show?: Readonly<Partial<Record<Person, string>>>
}

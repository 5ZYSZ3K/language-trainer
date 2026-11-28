import type { PairedNounItem, SentenceNounItem } from '../adjective-noun-declension/items'
import * as adjectives from '../adjective-noun-declension/test-support'

// Small items of demonstratives with nouns, as the join makes them, for the tests of the draw and the page: the nouns
// of adjectives with nouns' tests without their adjectives and their vocative cells, and the same governing verbs.

export { být, dívatSeNa, otherVerbs, pomáhat, seeded } from '../adjective-noun-declension/test-support'

const withoutVocative = ({ adjectives: _adjectives, cells, ...noun }: PairedNounItem): SentenceNounItem => ({
  ...noun,
  cells: cells.filter((cell) => !cell.id.startsWith('voc-')),
})

export const advokát = withoutVocative(adjectives.advokát)
/** Plural only. */
export const dveře = withoutVocative(adjectives.dveře)
/** Singular only. */
export const zdraví = withoutVocative(adjectives.zdraví)

/** Neuter, but its plural is feminine: to dítě, ty děti. */
export const dítě: SentenceNounItem = {
  kind: 'noun',
  prompt: 'dítě',
  gender: 's.',
  pluralGender: 'ž.',
  cells: [
    { id: 'nom-sg', acceptedForms: [{ value: 'dítě' }] },
    { id: 'dat-sg', acceptedForms: [{ value: 'dítěti' }] },
    { id: 'nom-pl', acceptedForms: [{ value: 'děti' }] },
    { id: 'dat-pl', acceptedForms: [{ value: 'dětem' }] },
  ],
}

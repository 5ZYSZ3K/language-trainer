import { REPOSITORY_URL } from '../config'
import type { Source } from './source'

/**
 * This site's own rules, written by its author and not checked against an authority: hence `unverified`, which the
 * page says wherever one of its quizzes is open. No adapter makes its datasets: the numerals ranges are written by
 * hand, and the adjectives with nouns, the demonstratives with nouns and the personal pronouns are joined (their
 * adjective and pronoun forms come from the site's own rules).
 */
export const languageTrainer: Source = {
  id: 'language-trainer',
  name: 'Language trainer',
  url: REPOSITORY_URL,
  trust: 'unverified',
  provides: [
    { language: 'cs', quizType: 'numerals', delivery: { kind: 'bundled' }, manual: true },
    { language: 'cs', quizType: 'adjective-noun-declension', delivery: { kind: 'bundled' }, manual: true },
    { language: 'cs', quizType: 'demonstrative-noun-declension', delivery: { kind: 'bundled' }, manual: true },
    { language: 'cs', quizType: 'personal-pronoun-declension', delivery: { kind: 'bundled' }, manual: true },
  ],
}

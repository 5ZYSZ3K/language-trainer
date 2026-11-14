import { REPOSITORY_URL } from '../config'
import type { Source } from './source'

/**
 * This site's own rules, written by its author and not checked against an authority: hence `unverified`, which the
 * page says wherever one of its quizzes is open. Its datasets are hand-written.
 */
export const languageTrainer: Source = {
  id: 'language-trainer',
  name: 'Language trainer',
  url: REPOSITORY_URL,
  trust: 'unverified',
  provides: [{ language: 'cs', quizType: 'numerals', delivery: { kind: 'bundled' }, manual: true }],
}

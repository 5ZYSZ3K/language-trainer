import { verbPresentTense } from './verb-present-tense'
import type { QuizType } from './quiz-type'

export type { Meter, QuizHost, QuizInstance, QuizType } from './quiz-type'

/** The quiz types. To add one: create its folder and add it here. */
export const QUIZ_TYPES: readonly QuizType<unknown>[] = [verbPresentTense]

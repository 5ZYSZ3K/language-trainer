import { describe, expect, it } from 'vitest'
import { declineAnAdjective, type DeclineProps } from './declension-of-adjectives_with_nouns'

// The owner's demo calls, in their order, with what the script printed for each before they became this test.
const demo: [DeclineProps, string[]][] = [
  [{ adjective: 'inteligentní', grammarCase: 'genitiv', grammarNumber: 'singular', grammarGender: 's.' }, ['inteligentního']],
  [{ adjective: 'chytrý', grammarCase: 'lokál', grammarNumber: 'plural', grammarGender: 'm. živ.' }, ['chytrých']],
  [{ adjective: { value: 'šik', indeclinable: true }, grammarCase: 'vokativ', grammarNumber: 'singular', grammarGender: 'm. živ.' }, ['šik']],
  [{ adjective: { value: 'šik', indeclinable: true }, grammarCase: 'vokativ', grammarNumber: 'singular', grammarGender: 'm. živ.' }, ['šik']],
  [{ adjective: 'dobrý', grammarCase: 'vokativ', grammarNumber: 'plural', grammarGender: 'm. živ.' }, ['dobří']],
  [
    { adjective: 'ambiciózní', grammarCase: 'instrumentál', grammarNumber: 'plural', grammarGender: 's.', pluralGrammarGender: 'ž.' },
    ['ambiciózními'],
  ],
  [{ adjective: 'dlouhý', grammarCase: 'instrumentál', grammarNumber: 'plural', grammarGender: 'ž.', dual: true }, ['dlouhýma']],
  [{ adjective: 'otcův', grammarCase: 'akuzativ', grammarNumber: 'singular', grammarGender: 'm. neživ.' }, ['otcův']],
  [{ adjective: 'otcův', grammarCase: 'nominativ', grammarNumber: 'plural', grammarGender: 'm. živ.' }, ['otcovi']],
  [{ adjective: 'matčin', grammarCase: 'lokál', grammarNumber: 'singular', grammarGender: 'ž.' }, ['matčině']],
  [{ adjective: 'otcův', grammarCase: 'lokál', grammarNumber: 'singular', grammarGender: 'm. neživ.' }, ['otcově', 'otcovu']],
]

describe('declineAnAdjective, the Czech adjective declension generator', () => {
  it.each(demo.map(([props, expected], i) => [i + 1, props, expected] as const))('demo call %i gives what the script printed', (_n, props, expected) => {
    expect(declineAnAdjective(props)).toEqual(expected)
  })
})

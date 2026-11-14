import { numberToCzechNumeral } from './cs'
import type { NumeralGenerator } from './versions'

/**
 * The numeral generator of each learned language, by language id. A pool of the numerals quiz needs one for its
 * language (a test checks that every provided pool has one); without it the quiz shows no exercise.
 */
export const NUMERAL_GENERATORS: Readonly<Partial<Record<string, NumeralGenerator>>> = {
  cs: numberToCzechNumeral,
}

import type { Meter, QuizType } from '../quiz-type'
import { mountNumerals } from './mount'
import { numberRangeContract, type NumberRange } from './ranges'
import { numeralsTexts, type NumeralsTextKey } from './texts'

export { NUMERAL_GENERATORS } from './generators'
export { NUMBER_LIMIT, numberRangeContract, pickInRange, pickNumber, SPREADS, type NumberRange, type Spread } from './ranges'

const meters: readonly Meter<NumeralsTextKey>[] = [{ id: 'numbers', label: 'meter.numbers' }]

/**
 * Write a number in words. The items are ranges of numbers (a hand-written dataset); the accepted versions of each
 * number come from the language's numeral generator.
 */
export const numerals: QuizType<NumberRange> = {
  id: 'numerals',
  contract: numberRangeContract,
  meters,
  texts: numeralsTexts,
  mount: mountNumerals,
}

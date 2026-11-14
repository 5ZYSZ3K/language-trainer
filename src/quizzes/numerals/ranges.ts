import type { Contract } from '../../core/contract'
import { isRecord } from '../../core/is-record'

/** How a number is drawn inside its range: every number equally likely, or every order of magnitude equally likely. */
export const SPREADS = ['uniform', 'log'] as const
export type Spread = (typeof SPREADS)[number]

/** The numbers a range may hold are below this one (the numeral generators stop at 999 999 999 999). */
export const NUMBER_LIMIT = 10 ** 12

/**
 * One item of the numerals quiz: a range of whole numbers. Each round picks a range (all equally likely), then a
 * number inside it according to its `spread`.
 */
export interface NumberRange {
  /** Unique within the dataset, e.g. `0-100`. */
  id: string
  /** The smallest number of the range, inclusive. */
  min: number
  /** The largest number of the range, inclusive. */
  max: number
  spread: Spread
}

const isWholeNumber = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value)

/**
 * What the quiz needs of an item: a non-empty `id`, whole numbers with 0 ≤ min ≤ max < 10¹², and a `spread` of
 * `uniform` or `log`; a `log` range must start at 1 or more (there is no logarithm of 0). Other properties are ignored.
 */
export const numberRangeContract: Contract<NumberRange> = {
  validateItem(value) {
    if (!isRecord(value)) return ['item must be an object']
    const problems: string[] = []
    if (typeof value.id !== 'string' || value.id.trim() === '') problems.push('missing id')

    const { min, max, spread } = value
    if (!isWholeNumber(min) || min < 0) problems.push('min must be a whole number, 0 or more')
    if (!isWholeNumber(max) || max >= NUMBER_LIMIT) problems.push(`max must be a whole number below ${NUMBER_LIMIT}`)
    if (isWholeNumber(min) && isWholeNumber(max) && min > max) problems.push('min must not be greater than max')

    if (!(SPREADS as readonly unknown[]).includes(spread)) problems.push(`spread must be one of ${SPREADS.join(', ')}`)
    else if (spread === 'log' && isWholeNumber(min) && min < 1) problems.push('a log spread needs min of 1 or more')
    return problems
  },

  keyOf: (item) => item.id,
}

/** A number of `range`, drawn as its spread says. `random` returns [0, 1). */
export function pickInRange(range: NumberRange, random: () => number): number {
  const { min, max } = range
  const drawn =
    range.spread === 'uniform'
      ? min + Math.floor(random() * (max - min + 1))
      : // Log-uniform over [min, max + 1), so that max itself can come up, then rounded down to a whole number.
        Math.floor(Math.exp(Math.log(min) + random() * (Math.log(max + 1) - Math.log(min))))
  // Floating point can land a hair outside the range at its very ends.
  return Math.min(max, Math.max(min, drawn))
}

/** How often a new number is drawn when it equals the previous one, before the repeat is accepted. */
const ATTEMPTS = 20

/**
 * The next number to ask: a range picked uniformly (so each range comes up equally often), then a number in it. Never
 * `previous` again, unless the ranges leave nothing else (then after a few attempts the repeat is accepted).
 */
export function pickNumber(ranges: readonly NumberRange[], previous: number | undefined, random: () => number): number {
  if (ranges.length === 0) throw new Error('nothing to pick from')
  let drawn = previous
  for (let attempt = 0; attempt < ATTEMPTS && drawn === previous; attempt++) {
    const range = ranges[Math.floor(random() * ranges.length)]!
    drawn = pickInRange(range, random)
  }
  return drawn!
}

import { describe, expect, it } from 'vitest'
import { numberRangeContract, pickInRange, pickNumber, type NumberRange } from './ranges'

/** A seeded pseudo-random sequence in [0, 1), so that the statistics below are the same on every run. */
function seeded(seed: number): () => number {
  let state = seed
  return () => (state = (state * 1103515245 + 12345) % 2147483648) / 2147483648
}

/** Always the same value, for the ends of a range. */
const fixed = (value: number) => () => value
const JUST_BELOW_ONE = 1 - Number.EPSILON

const range = (min: number, max: number, spread: NumberRange['spread'], id = `${min}-${max}`): NumberRange => ({ id, min, max, spread })

describe('numberRangeContract', () => {
  const problems = (value: unknown) => numberRangeContract.validateItem(value)

  it('accepts ranges with whole numbers in order, below a trillion, and a known spread', () => {
    expect(problems(range(0, 100, 'uniform'))).toEqual([])
    expect(problems(range(5, 5, 'uniform'))).toEqual([])
    expect(problems(range(1, 999999999999, 'log'))).toEqual([])
  })

  it('reports what is wrong with an item', () => {
    expect(problems(null)).toEqual(['item must be an object'])
    expect(problems({ ...range(0, 1, 'uniform'), id: ' ' })).toEqual(['missing id'])
    expect(problems(range(-1, 5, 'uniform'))).toEqual(['min must be a whole number, 0 or more'])
    expect(problems(range(1.5, 5, 'uniform'))).toEqual(['min must be a whole number, 0 or more'])
    expect(problems(range(0, 1e12, 'uniform'))).toEqual(['max must be a whole number below 1000000000000'])
    expect(problems({ ...range(0, 1, 'uniform'), max: '1' })).toEqual(['max must be a whole number below 1000000000000'])
    expect(problems(range(10, 5, 'uniform'))).toEqual(['min must not be greater than max'])
    expect(problems({ ...range(0, 1, 'uniform'), spread: 'normal' })).toEqual(['spread must be one of uniform, log'])
    expect(problems(range(0, 100, 'log'))).toEqual(['a log spread needs min of 1 or more'])
  })

  it('identifies a range by its id', () => {
    expect(numberRangeContract.keyOf(range(0, 100, 'uniform', 'small'))).toBe('small')
  })
})

describe('pickInRange', () => {
  it('reaches both ends of a range, whichever the spread', () => {
    for (const spread of ['uniform', 'log'] as const) {
      const r = range(101, 2000, spread)
      expect(pickInRange(r, fixed(0)), spread).toBe(101)
      expect(pickInRange(r, fixed(JUST_BELOW_ONE)), spread).toBe(2000)
    }
    expect(pickInRange(range(7, 7, 'log'), fixed(0.5))).toBe(7)
  })

  it('draws every number of a uniform range about equally often, 0 included', () => {
    const random = seeded(1)
    const counts = new Array<number>(11).fill(0)
    for (let i = 0; i < 22000; i++) counts[pickInRange(range(0, 10, 'uniform'), random)]!++
    for (const count of counts) expect(count).toBeGreaterThan(1700)
  })

  it('draws every order of magnitude of a log range about equally often', () => {
    const random = seeded(2)
    const digits = new Map<number, number>()
    const draws = 60000
    for (let i = 0; i < draws; i++) {
      const length = String(pickInRange(range(1000001, 999999999999, 'log'), random)).length
      digits.set(length, (digits.get(length) ?? 0) + 1)
    }
    expect([...digits.keys()].sort((a, b) => a - b)).toEqual([7, 8, 9, 10, 11, 12])
    for (const count of digits.values()) expect(count / draws).toBeCloseTo(1 / 6, 1)
  })

  it('only draws whole numbers inside the range', () => {
    const random = seeded(3)
    for (const r of [range(0, 100, 'uniform'), range(101, 2000, 'log'), range(2001, 1000000, 'log'), range(1000001, 999999999999, 'log')]) {
      for (let i = 0; i < 2000; i++) {
        const n = pickInRange(r, random)
        expect(Number.isSafeInteger(n) && n >= r.min && n <= r.max, `${r.id}: ${n}`).toBe(true)
      }
    }
  })
})

describe('pickNumber', () => {
  const ranges = [range(0, 100, 'uniform'), range(101, 2000, 'log'), range(2001, 1000000, 'log'), range(1000001, 999999999999, 'log')]
  const rangeOf = (n: number) => ranges.findIndex((r) => n >= r.min && n <= r.max)

  it('picks each range equally often', () => {
    const random = seeded(4)
    const counts = [0, 0, 0, 0]
    const draws = 40000
    for (let i = 0; i < draws; i++) counts[rangeOf(pickNumber(ranges, undefined, random))]!++
    for (const count of counts) expect(count / draws).toBeCloseTo(0.25, 1)
  })

  it('never asks the same number twice in a row', () => {
    const random = seeded(5)
    let previous: number | undefined
    for (let i = 0; i < 5000; i++) {
      const next = pickNumber([range(0, 3, 'uniform')], previous, random)
      expect(next).not.toBe(previous)
      previous = next
    }
  })

  it('accepts a repeat when the ranges hold only that number', () => {
    expect(pickNumber([range(5, 5, 'uniform')], 5, Math.random)).toBe(5)
  })

  it('refuses to pick from no ranges', () => {
    expect(() => pickNumber([], undefined, Math.random)).toThrow()
  })
})

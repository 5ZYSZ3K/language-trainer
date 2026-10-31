import { describe, expect, it } from 'vitest'
import { pickNext } from './pick'

const items = ['a', 'b', 'c', 'd']

describe('pickNext', () => {
  it('picks uniformly across the items when there is no previous one', () => {
    const picked = [0, 0.26, 0.51, 0.99].map((r) => pickNext(items, undefined, () => r))
    expect(picked).toEqual(['a', 'b', 'c', 'd'])
  })

  it('never picks the previous item, and is uniform over the rest', () => {
    const picked = [0, 0.34, 0.67, 0.99].map((r) => pickNext(items, 'b', () => r))
    expect(picked).toEqual(['a', 'c', 'd', 'd'])
    expect(picked).not.toContain('b')
  })

  it('repeats the only item when there is just one', () => {
    expect(pickNext(['only'], 'only', () => 0.5)).toBe('only')
  })

  it('refuses to pick from nothing', () => {
    expect(() => pickNext([], undefined, () => 0.5)).toThrow()
  })
})

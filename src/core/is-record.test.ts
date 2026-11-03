import { describe, expect, it } from 'vitest'
import { isRecord } from './is-record'

describe('isRecord', () => {
  it('accepts plain objects, empty ones included', () => {
    expect(isRecord({})).toBe(true)
    expect(isRecord({ a: 1 })).toBe(true)
  })

  it.each([null, undefined, [], [1], 'text', 7, true])('rejects %j', (value) => {
    expect(isRecord(value)).toBe(false)
  })
})

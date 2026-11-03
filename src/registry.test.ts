import { describe, expect, it } from 'vitest'
import { findById } from './registry'

describe('findById', () => {
  const entries = [{ id: 'cs', name: 'Czech' }, { id: 'de', name: 'German' }]

  it('finds the entry with that id in a registry list', () => {
    expect(findById(entries, 'de')).toBe(entries[1])
  })

  it('gives undefined for an id nobody registered', () => {
    expect(findById(entries, 'fr')).toBeUndefined()
    expect(findById([], 'cs')).toBeUndefined()
  })
})

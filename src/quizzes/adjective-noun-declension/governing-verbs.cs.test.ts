import { describe, expect, it } from 'vitest'
import { czechGoverningVerbs } from './governing-verbs.cs'

describe('the Czech governing verbs', () => {
  it('have each verb, or verb with its preposition, once', () => {
    const keys = czechGoverningVerbs.map(({ verb, preposition }) => `${verb} ${preposition ?? ''}`)
    expect(keys.filter((key, i) => keys.indexOf(key) !== i)).toEqual([])
  })

  it('use no preposition that changes its form before some words (v, s, k, z become ve, se, ke, ze)', () => {
    const changing = czechGoverningVerbs.filter(({ preposition }) => preposition !== undefined && ['v', 's', 'k', 'z'].includes(preposition))
    expect(changing).toEqual([])
  })

  it('frame the nominative as to je / to jsou: být after to, which alone takes only the nominative, showing je, not jest', () => {
    expect(czechGoverningVerbs.filter((entry) => entry.case === 'nom')).toEqual([{ verb: 'být', subject: 'to', case: 'nom', show: { '3sg': 'je' } }])
  })
})

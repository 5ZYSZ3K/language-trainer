import { describe, expect, it } from 'vitest'
import { numberToCzechNumeral } from './cs'
import { isRemarkCode, parseRemark } from './versions'

const values = (n: number) => numberToCzechNumeral(n).map((version) => version.value)

/** A seeded pseudo-random sequence in [0, 1), so that the sample below is the same on every run. */
function seeded(seed: number): () => number {
  let state = seed
  return () => (state = (state * 1103515245 + 12345) % 2147483648) / 2147483648
}

/** Numbers from every magnitude: all of 0–3000, then random ones up to a thousand, a million and a billion billions. */
const SAMPLE = (() => {
  const random = seeded(7)
  const numbers = Array.from({ length: 3001 }, (_, n) => n)
  for (const [min, max] of [[3001, 1e6], [1e6, 1e9], [1e9, 1e12 - 1]] as const) {
    for (let i = 0; i < 300; i++) numbers.push(min + Math.floor(random() * (max - min + 1)))
  }
  return numbers
})()

describe('numberToCzechNumeral', () => {
  it('writes 0 as nula, with no remarks', () => {
    expect(numberToCzechNumeral(0)).toEqual([{ value: 'nula', remarks: [] }])
  })

  it('gives 1 in every gender, the feminine one also as the counting form', () => {
    expect(numberToCzechNumeral(1)).toEqual([
      { value: 'jeden', remarks: ['masculine'] },
      { value: 'jedna', remarks: ['feminine', 'counting-form'] },
      { value: 'jedno', remarks: ['neuter'] },
    ])
  })

  it('has one version for a number without variants', () => {
    expect(numberToCzechNumeral(14)).toEqual([{ value: 'čtrnáct', remarks: [] }])
    expect(numberToCzechNumeral(2000)).toEqual([{ value: 'dva tisíce', remarks: [] }])
  })

  it('accepts the inverted form of 21–99, in both spellings for a final 1', () => {
    expect(values(25)).toEqual(['dvacet pět', 'pětadvacet'])
    expect(values(21)).toEqual(['dvacet jeden', 'dvacet jedna', 'dvacet jedno', 'jedenadvacet', 'jednadvacet'])
  })

  it('counts 1100–1999 in hundreds too, as a less common form', () => {
    expect(numberToCzechNumeral(1550)).toContainEqual({ value: 'patnáct set padesát', remarks: ['less-commonly-used'] })
  })

  it('marks a version that mixes inverted and standard order, and prefixes remarks with the part they are about', () => {
    expect(numberToCzechNumeral(21375)).toContainEqual({
      value: 'jedenadvacet tisíc tři sta sedmdesát pět',
      remarks: ['tisíc:inverted-form', 'mixed-form'],
    })
  })

  it('accepts the spelling milión, as less common', () => {
    expect(numberToCzechNumeral(2000000)).toContainEqual({ value: 'dva milióny', remarks: ['milión:less-commonly-used'] })
  })

  it('rejects what it cannot write: negative, fractional, a trillion or more', () => {
    for (const n of [-1, 1.5, 1e12, 1e13]) expect(() => numberToCzechNumeral(n), String(n)).toThrow()
  })

  it('gives every number of a wide sample at least one version, all different and none empty', () => {
    for (const n of SAMPLE) {
      const written = values(n)
      expect(written.length, String(n)).toBeGreaterThan(0)
      expect(new Set(written).size, String(n)).toBe(written.length)
      expect(written.every((value) => value.trim() === value && value !== '' && !value.includes('  ')), String(n)).toBe(true)
    }
  })

  it('only uses remark codes the quiz has texts for, about the parts tisíc, milion, milión and miliarda', () => {
    const parts = new Set(['tisíc', 'milion', 'milión', 'miliarda'])
    for (const n of SAMPLE) {
      for (const { remarks } of numberToCzechNumeral(n)) {
        for (const remark of remarks) {
          const { code, part } = parseRemark(remark)
          expect(isRemarkCode(code), `${n}: ${remark}`).toBe(true)
          if (part !== undefined) expect(parts.has(part), `${n}: ${remark}`).toBe(true)
        }
      }
    }
  })

  // The generator's output as it was when the quiz was added (the numbers its author tried it on). A change here is a
  // change of the rules: check it against the author's intent, then update the snapshot.
  it.each([
    1, 14, 101, 125, 1984, 2000, 2137, 21375, 23000, 213758, 2137589, 21000000, 22000000, 101000000, 220000001, 2200000014,
    22000000014, 101000000000,
  ])('writes %i as it did when the quiz was added', (n) => {
    expect(numberToCzechNumeral(n)).toMatchSnapshot()
  })
})

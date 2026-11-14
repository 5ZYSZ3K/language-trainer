import { describe, expect, it } from 'vitest'
import { findVersion, legendOf, parseRemark, sortVersions, type NumeralVersion } from './versions'

const version = (value: string, ...remarks: string[]): NumeralVersion => ({ value, remarks })

describe('parseRemark', () => {
  it('splits off the part of the number a remark is about', () => {
    expect(parseRemark('tisíc:inverted-form')).toEqual({ part: 'tisíc', code: 'inverted-form' })
    expect(parseRemark('mixed-form')).toEqual({ code: 'mixed-form' })
  })
})

describe('sortVersions', () => {
  it('lists versions without remarks first, then by number of remarks, keeping the order of ties', () => {
    const versions = [version('a', 'x', 'y'), version('b'), version('c', 'x'), version('d'), version('e', 'y')]
    expect(sortVersions(versions).map((v) => v.value)).toEqual(['b', 'd', 'c', 'e', 'a'])
    expect(versions.map((v) => v.value)).toEqual(['a', 'b', 'c', 'd', 'e'])
  })
})

describe('findVersion', () => {
  const versions = [version('dvacet jedna'), version('jednadvacet', 'inverted-form')]

  it('finds the version typed, forgiving case and whitespace only', () => {
    expect(findVersion('  Dvacet   JEDNA ', versions)).toBe(versions[0])
    expect(findVersion('jednadvacet', versions)).toBe(versions[1])
    expect(findVersion('dvacet jedná', versions)).toBeUndefined()
    expect(findVersion('', versions)).toBeUndefined()
  })
})

describe('legendOf', () => {
  it('lists the codes shown, known ones in legend order and unknown ones after, and notes parts', () => {
    const legend = legendOf([version('a', 'tisíc:inverted-form', 'mixed-form'), version('b', 'surprise', 'masculine'), version('c', 'inverted-form')])
    expect(legend).toEqual({ codes: ['masculine', 'inverted-form', 'mixed-form', 'surprise'], hasParts: true })
  })

  it('is empty for versions without remarks', () => {
    expect(legendOf([version('čtrnáct')])).toEqual({ codes: [], hasParts: false })
  })
})

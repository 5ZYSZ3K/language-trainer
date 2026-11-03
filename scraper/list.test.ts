import { describe, expect, it } from 'vitest'
import { parseList } from './list'

describe('parseList', () => {
  it('reads comma-separated infinitives, reflexives included, in order', () => {
    expect(parseList('bavit, bát se, dát si,být')).toEqual(['bavit', 'bát se', 'dát si', 'být'])
  })

  it('tolerates line breaks, stray spaces and a trailing comma', () => {
    expect(parseList('  bavit ,\n bát   se ,\r\n\n běhat,\n')).toEqual(['bavit', 'bát se', 'běhat'])
  })

  it('gives an empty list for an empty file', () => {
    expect(parseList('\n')).toEqual([])
  })
})

import { describe, expect, it } from 'vitest'
import { parseVerbList } from './verb-list'

describe('parseVerbList', () => {
  it('reads comma-separated infinitives, reflexives included, in order', () => {
    expect(parseVerbList('bavit, bát se, dát si,být')).toEqual(['bavit', 'bát se', 'dát si', 'být'])
  })

  it('tolerates line breaks, stray spaces and a trailing comma', () => {
    expect(parseVerbList('  bavit ,\n bát   se ,\r\n\n běhat,\n')).toEqual(['bavit', 'bát se', 'běhat'])
  })

  it('gives an empty list for an empty file', () => {
    expect(parseVerbList('\n')).toEqual([])
  })
})

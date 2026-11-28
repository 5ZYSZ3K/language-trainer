import { describe, expect, it } from 'vitest'
import { drawSentenceOf, splitItems, type SentenceDraw } from '../adjective-noun-declension/sentence-draw'
import type { GoverningCase, SentenceNounItem } from '../adjective-noun-declension/sentence-items'
import { allCells, cellsOfCase, type CellFilter } from '../noun-declension/filter'
import { demonstrativeRules } from './page'
import { DEMONSTRATIVE_TABLES } from './tables'
import { advokát, být, dítě, dívatSeNa, dveře, otherVerbs, pomáhat, seeded, zdraví } from './test-support'

// The draw is the one every sentence quiz shares (tested with adjectives with nouns); this is what its rules make of it.

const rules = demonstrativeRules(DEMONSTRATIVE_TABLES.cs!)
const { nouns, verbs } = splitItems([advokát, dveře, zdraví, dítě, být, pomáhat, dívatSeNa, ...otherVerbs])

function draws(filter: CellFilter, count = 600, from = nouns) {
  const random = seeded(1)
  const drawn: SentenceDraw<SentenceNounItem, 'pronoun', GoverningCase>[] = []
  for (let i = 0; i < count; i++) {
    const draw = drawSentenceOf(rules, from, verbs, filter, drawn.at(-1)?.noun, random)
    if (!draw) break
    drawn.push(draw)
  }
  return drawn
}
const formsOf = (drawn: { caseId: string; number: string }[]) => new Set(drawn.map((draw) => `${draw.caseId}-${draw.number}`))

describe('the draw of demonstratives with nouns', () => {
  it('offers every case but the vocative', () => {
    expect(rules.cases).toEqual(['nom', 'gen', 'dat', 'acc', 'loc', 'ins'])
  })

  it('never draws the vocative: with every form ticked, it draws the other 12', () => {
    expect(formsOf(draws(allCells()))).toEqual(
      new Set(['nom-sg', 'gen-sg', 'dat-sg', 'acc-sg', 'loc-sg', 'ins-sg', 'nom-pl', 'gen-pl', 'dat-pl', 'acc-pl', 'loc-pl', 'ins-pl']),
    )
  })

  it('draws nothing when only the vocative is ticked', () => {
    expect(drawSentenceOf(rules, nouns, verbs, new Set(cellsOfCase('voc')), undefined, seeded(1))).toBeUndefined()
  })

  it('draws only the forms the filter ticks, and each of them, on the nouns that have them', () => {
    const filter = new Set(['gen-sg', 'dat-pl', 'ins-pl', 'voc-sg'])
    const drawn = draws(filter)
    expect(formsOf(drawn)).toEqual(new Set(['gen-sg', 'dat-pl', 'ins-pl']))
    expect(formsOf(drawn.filter((draw) => draw.noun === zdraví))).toEqual(new Set(['gen-sg']))
    expect(formsOf(drawn.filter((draw) => draw.noun === dveře))).toEqual(new Set(['dat-pl', 'ins-pl']))
  })

  it('puts ten in the first blank, whatever the noun’s gender', () => {
    expect(new Set(draws(allCells()).map((draw) => draw.pronoun))).toEqual(new Set(['ten']))
  })
})

import { describe, expect, it } from 'vitest'
import { nounCaseIds, type CaseId } from '../noun-declension/cells'
import { drawSentence, splitItems, type Draw } from './draw'
import { advokát, být, dívatSeNa, dveře, otherVerbs, pomáhat, seeded, zdraví } from './test-support'

const all = new Set<CaseId>(nounCaseIds)
const items = [advokát, dveře, zdraví, být, pomáhat, dívatSeNa, ...otherVerbs]
const { nouns, verbs } = splitItems(items)

/** `count` rounds in a row, each drawn after the one before, as the page does. */
function draws(filter: ReadonlySet<CaseId>, count = 300, from = nouns, seed = 1): Draw[] {
  const random = seeded(seed)
  const drawn: Draw[] = []
  for (let i = 0; i < count; i++) {
    const draw = drawSentence(from, verbs, filter, drawn.at(-1)?.noun, random)
    if (!draw) break
    drawn.push(draw)
  }
  return drawn
}

describe('splitItems', () => {
  it('parts the dataset into its nouns and its governing verbs, each in dataset order', () => {
    expect(nouns).toEqual([advokát, dveře, zdraví])
    expect(verbs).toEqual([být, pomáhat, dívatSeNa, ...otherVerbs])
  })
})

describe('drawSentence', () => {
  it('draws only the cases the filter has ticked, and every one of them', () => {
    const drawn = draws(new Set<CaseId>(['gen', 'ins']))
    expect(new Set(drawn.map((draw) => draw.caseId))).toEqual(new Set(['gen', 'ins']))
  })

  it('draws a number the noun has in that case: dveře always plural, zdraví always singular, advokát both', () => {
    const drawn = draws(all, 600)
    const numbersOf = (noun: unknown) => new Set(drawn.filter((draw) => draw.noun === noun).map((draw) => draw.number))
    expect(numbersOf(dveře)).toEqual(new Set(['pl']))
    expect(numbersOf(zdraví)).toEqual(new Set(['sg']))
    expect(numbersOf(advokát)).toEqual(new Set(['sg', 'pl']))
  })

  it('draws one of the noun’s own adjectives', () => {
    for (const draw of draws(all)) expect(draw.noun.adjectives).toContain(draw.adjective)
    expect(new Set(draws(all).filter((draw) => draw.noun === advokát).map((draw) => draw.adjective))).toEqual(new Set(['dobrý', 'chytrý']))
  })

  it('never draws the same noun twice in a row, unless there is only one', () => {
    const drawn = draws(all)
    expect(drawn.filter((draw, i) => i > 0 && draw.noun === drawn[i - 1]!.noun)).toEqual([])
    expect(draws(all, 5, [dveře]).map((draw) => draw.noun)).toEqual([dveře, dveře, dveře, dveře, dveře])
  })

  it('draws a governing verb of the case, in any person and number', () => {
    const drawn = draws(new Set<CaseId>(['dat', 'acc']), 600)
    for (const draw of drawn) expect(draw.verb?.item.case).toBe(draw.caseId)
    expect(new Set(drawn.filter((draw) => draw.caseId === 'acc').map((draw) => draw.verb?.item))).toEqual(new Set([dívatSeNa, otherVerbs[3]]))
    expect(new Set(drawn.map((draw) => draw.verb?.person))).toEqual(new Set(['1sg', '2sg', '3sg', '1pl', '2pl', '3pl']))
  })

  it('in the nominative, uses být and makes its number follow the noun’s: jsem dobrý advokát, jsme dobří advokáti', () => {
    const drawn = draws(new Set<CaseId>(['nom']), 600)
    for (const draw of drawn) {
      expect(draw.verb?.item).toBe(být)
      expect(draw.verb?.person.endsWith(draw.number)).toBe(true)
    }
    // Only the person is drawn.
    expect(new Set(drawn.map((draw) => draw.verb?.person.slice(0, 1)))).toEqual(new Set(['1', '2', '3']))
  })

  it('in the vocative, draws no verb', () => {
    const drawn = draws(new Set<CaseId>(['voc']))
    expect(drawn.length).toBe(300)
    for (const draw of drawn) expect(draw.verb).toBeUndefined()
  })

  it('draws nothing when the filter has nothing ticked, or only cases that no governing verb is followed by', () => {
    expect(drawSentence(nouns, verbs, new Set(), undefined, seeded(1))).toBeUndefined()
    expect(drawSentence(nouns, [být], new Set<CaseId>(['dat', 'ins']), undefined, seeded(1))).toBeUndefined()
    expect(drawSentence([], verbs, all, undefined, seeded(1))).toBeUndefined()
  })
})

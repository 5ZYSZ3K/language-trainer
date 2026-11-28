import { describe, expect, it } from 'vitest'
import type { CaseId } from '../noun-declension/cells'
import { allCells, cellsOfCase, type CellFilter } from '../noun-declension/filter'
import { drawSentence, splitItems, type Draw } from './draw'
import { advokát, být, dívatSeNa, dveře, otherVerbs, pomáhat, seeded, zdraví } from './test-support'

const all = allCells()
const items = [advokát, dveře, zdraví, být, pomáhat, dívatSeNa, ...otherVerbs]
const { nouns, verbs } = splitItems(items)

/** A filter with both cells of each of `caseIds` ticked, and nothing else. */
const casesTicked = (...caseIds: CaseId[]): CellFilter => new Set(caseIds.flatMap(cellsOfCase))
/** The case and the number of a draw, as a cell id: `gen-sg`. */
const formOf = (draw: Draw) => `${draw.caseId}-${draw.number}`

/** `count` rounds in a row, each drawn after the one before, as the page does. */
function draws(filter: CellFilter, count = 300, from = nouns, seed = 1): Draw[] {
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
  it('draws only the forms the filter has ticked, a case and a number each, and every one of them', () => {
    const drawn = draws(new Set(['gen-sg', 'dat-sg', 'dat-pl', 'ins-pl']), 600, [advokát])
    expect(new Set(drawn.map(formOf))).toEqual(new Set(['gen-sg', 'dat-sg', 'dat-pl', 'ins-pl']))
  })

  it('draws a ticked form only on a noun that has it: dveře only in the plural, zdraví only in the singular', () => {
    const filter = new Set(['gen-sg', 'ins-pl'])
    const drawn = draws(filter, 600)
    const formsOf = (noun: unknown) => new Set(drawn.filter((draw) => draw.noun === noun).map(formOf))
    expect(formsOf(advokát)).toEqual(new Set(['gen-sg', 'ins-pl']))
    expect(formsOf(dveře)).toEqual(new Set(['ins-pl']))
    expect(formsOf(zdraví)).toEqual(new Set(['gen-sg']))
  })

  it('never draws a noun none of whose forms is ticked', () => {
    const drawn = draws(new Set(['gen-sg', 'loc-sg']))
    expect(new Set(drawn.map((draw) => draw.noun))).toEqual(new Set([advokát, zdraví]))
  })

  it('draws the case first, uniformly among those with a ticked form, then a ticked number of it', () => {
    // Genitive and instrumental half the time each, the genitive's two numbers a quarter each: not a third per form.
    const drawn = draws(new Set(['gen-sg', 'gen-pl', 'ins-sg']), 4000, [advokát])
    const share = (form: string) => drawn.filter((draw) => formOf(draw) === form).length / drawn.length
    expect(share('ins-sg')).toBeCloseTo(0.5, 1)
    expect(share('gen-sg')).toBeCloseTo(0.25, 1)
    expect(share('gen-pl')).toBeCloseTo(0.25, 1)
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
    const drawn = draws(casesTicked('dat', 'acc'), 600)
    for (const draw of drawn) expect(draw.verb?.item.case).toBe(draw.caseId)
    expect(new Set(drawn.filter((draw) => draw.caseId === 'acc').map((draw) => draw.verb?.item))).toEqual(new Set([dívatSeNa, otherVerbs[3]]))
    expect(new Set(drawn.map((draw) => draw.verb?.person))).toEqual(new Set(['1sg', '2sg', '3sg', '1pl', '2pl', '3pl']))
  })

  it('in the nominative, uses to + být in the third person, its number following the noun’s: to je dobrý advokát, to jsou dobří advokáti', () => {
    const drawn = draws(casesTicked('nom'), 600)
    for (const draw of drawn) {
      expect(draw.verb?.item).toBe(být)
      expect(draw.verb?.person).toBe(`3${draw.number}`)
    }
    // Nothing about the verb is drawn: its number is the noun's, and both occur.
    expect(new Set(drawn.map((draw) => draw.verb?.person))).toEqual(new Set(['3sg', '3pl']))
  })

  it('puts a verb with a subject in the third person in any case, since the subject is', () => {
    const toPomáhat = { ...pomáhat, subject: 'to' }
    const random = seeded(1)
    const persons = Array.from({ length: 300 }, () => drawSentence(nouns, [toPomáhat], casesTicked('dat'), undefined, random)?.verb?.person)
    expect(new Set(persons)).toEqual(new Set(['3sg', '3pl']))
  })

  it('in the vocative, draws no verb', () => {
    const drawn = draws(casesTicked('voc'))
    expect(drawn.length).toBe(300)
    for (const draw of drawn) expect(draw.verb).toBeUndefined()
  })

  it('draws nothing when the filter has nothing ticked, only forms no noun has, or only cases that no governing verb is followed by', () => {
    expect(drawSentence(nouns, verbs, new Set(), undefined, seeded(1))).toBeUndefined()
    expect(drawSentence([dveře], verbs, new Set(['gen-sg', 'ins-sg']), undefined, seeded(1))).toBeUndefined()
    expect(drawSentence(nouns, [být], casesTicked('dat', 'ins'), undefined, seeded(1))).toBeUndefined()
    expect(drawSentence([], verbs, all, undefined, seeded(1))).toBeUndefined()
  })
})

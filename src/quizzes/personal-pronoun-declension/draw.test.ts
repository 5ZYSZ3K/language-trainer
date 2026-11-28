import { describe, expect, it } from 'vitest'
import type { CaseId } from '../noun-declension/cells'
import { allCells, cellsOfCase, type CellFilter } from '../noun-declension/filter'
import { drawPronounSentence, type PronounDraw } from './draw'
import { advokát, bátSe, bojovatProti, být, bydletU, děkovat, dítě, dívatSeNa, dveře, hýbat, mluvitO, pomáhat, seeded, verbs, věřit, vidět, zdraví } from './test-support'

const nouns = [advokát, dveře, zdraví, dítě]

/** A filter with both forms of each of `caseIds` ticked, and nothing else. */
const casesTicked = (...caseIds: CaseId[]): CellFilter => new Set(caseIds.flatMap(cellsOfCase))

/** `count` rounds in a row, each drawn after the one before, as the page does. */
function draws(filter: CellFilter, count = 600, from = nouns, seed = 1): PronounDraw[] {
  const random = seeded(seed)
  const drawn: PronounDraw[] = []
  for (let i = 0; i < count; i++) {
    const draw = drawPronounSentence(from, verbs, filter, drawn.at(-1)?.noun, random)
    if (!draw) break
    drawn.push(draw)
  }
  return drawn
}

const positionsOf = (drawn: readonly PronounDraw[]) => new Set(drawn.map((draw) => draw.position))
const share = (drawn: readonly PronounDraw[], test: (draw: PronounDraw) => boolean) => drawn.filter(test).length / drawn.length

describe('drawPronounSentence', () => {
  it('never draws the vocative: with every form ticked, it draws the other 12; with only the vocative, nothing', () => {
    const forms = new Set(draws(allCells(), 1200).map((draw) => `${draw.caseId}-${draw.number}`))
    expect(forms).toEqual(new Set(['nom-sg', 'gen-sg', 'dat-sg', 'acc-sg', 'loc-sg', 'ins-sg', 'nom-pl', 'gen-pl', 'dat-pl', 'acc-pl', 'loc-pl', 'ins-pl']))
    expect(drawPronounSentence(nouns, verbs, casesTicked('voc'), undefined, seeded(1))).toBeUndefined()
  })

  it('draws only the forms the filter ticks, on the nouns that have them', () => {
    const drawn = draws(new Set(['gen-sg', 'dat-pl']))
    expect(new Set(drawn.map((draw) => `${draw.caseId}-${draw.number}`))).toEqual(new Set(['gen-sg', 'dat-pl']))
    expect(new Set(drawn.filter((draw) => draw.noun === dveře).map((draw) => draw.number))).toEqual(new Set(['pl']))
    expect(new Set(drawn.filter((draw) => draw.noun === zdraví).map((draw) => draw.number))).toEqual(new Set(['sg']))
  })

  it('puts the nominative only after the verb, never at the start: To je on, To jsou oni', () => {
    const drawn = draws(casesTicked('nom'))
    expect(positionsOf(drawn)).toEqual(new Set(['after-verb']))
    for (const draw of drawn) expect(draw.verb).toEqual({ item: být, person: `3${draw.number}` })
  })

  it('puts the locative only after a preposition, the only place its verbs allow', () => {
    const drawn = draws(casesTicked('loc'))
    expect(positionsOf(drawn)).toEqual(new Set(['after-preposition']))
    for (const draw of drawn) expect(draw.verb.item).toBe(mluvitO)
  })

  it('puts the instrumental after the verb or at the start: its verbs have no preposition', () => {
    expect(positionsOf(draws(casesTicked('ins')))).toEqual(new Set(['after-verb', 'start']))
  })

  it('puts the genitive, the dative and the accusative in all three positions', () => {
    for (const caseId of ['gen', 'dat', 'acc'] as const) {
      expect(positionsOf(draws(casesTicked(caseId))), caseId).toEqual(new Set(['after-verb', 'after-preposition', 'start']))
    }
  })

  it('only allows the positions the case’s verbs allow: with no verb of the dative with a preposition, none after one', () => {
    const plain = verbs.filter((verb) => verb !== bojovatProti)
    const random = seeded(1)
    const positions = Array.from({ length: 300 }, () => drawPronounSentence([advokát], plain, casesTicked('dat'), undefined, random)!.position)
    expect(new Set(positions)).toEqual(new Set(['after-verb', 'start']))
  })

  it('draws a verb of the case that fits the position: a preposition after one, none after the verb, neither one nor a subject at the start', () => {
    const drawn = draws(casesTicked('nom', 'gen', 'dat', 'acc'), 1200)
    for (const draw of drawn) expect(draw.verb.item.case).toBe(draw.caseId)
    const verbsAt = (position: string) => new Set(drawn.filter((draw) => draw.position === position).map((draw) => draw.verb.item))
    expect(verbsAt('after-preposition')).toEqual(new Set([bydletU, bojovatProti, dívatSeNa]))
    expect(verbsAt('after-verb')).toEqual(new Set([být, bátSe, pomáhat, věřit, děkovat, vidět]))
    expect(verbsAt('start')).toEqual(new Set([bátSe, pomáhat, věřit, děkovat, vidět]))
    expect(verbsAt('start').has(hýbat)).toBe(false)
  })

  it('draws the position uniformly before the verb: a third of dative sentences are after a preposition, though one verb in four has one', () => {
    const drawn = draws(casesTicked('dat'), 3000)
    expect(share(drawn, (draw) => draw.position === 'after-preposition')).toBeCloseTo(1 / 3, 1)
    expect(share(drawn, (draw) => draw.position === 'start')).toBeCloseTo(1 / 3, 1)
  })

  it('after a preposition, starts the sentence with it half the time; in any other position, never', () => {
    const drawn = draws(allCells(), 3000)
    const afterPreposition = drawn.filter((draw) => draw.position === 'after-preposition')
    expect(share(afterPreposition, (draw) => draw.prepositionFirst)).toBeCloseTo(0.5, 1)
    expect(drawn.filter((draw) => draw.position !== 'after-preposition' && draw.prepositionFirst)).toEqual([])
  })

  it('never puts first the preposition of a verb with a subject, which comes first', () => {
    const toJeProti = { ...bojovatProti, subject: 'to' }
    const random = seeded(1)
    const drawn = Array.from({ length: 200 }, () => drawPronounSentence([advokát], [toJeProti], casesTicked('dat'), undefined, random)!)
    expect(new Set(drawn.map((draw) => draw.position))).toEqual(new Set(['after-preposition']))
    expect(drawn.filter((draw) => draw.prepositionFirst)).toEqual([])
  })

  it('draws a person and number for the verb, in any person but after a subject', () => {
    const drawn = draws(casesTicked('dat'))
    expect(new Set(drawn.map((draw) => draw.verb.person))).toEqual(new Set(['1sg', '2sg', '3sg', '1pl', '2pl', '3pl']))
  })

  it('never draws the same noun twice in a row, unless there is only one', () => {
    const drawn = draws(allCells())
    expect(drawn.filter((draw, i) => i > 0 && draw.noun === drawn[i - 1]!.noun)).toEqual([])
    expect(draws(allCells(), 3, [dveře]).map((draw) => draw.noun)).toEqual([dveře, dveře, dveře])
  })

  it('draws nothing when the filter has nothing ticked, or there is no noun', () => {
    expect(drawPronounSentence(nouns, verbs, new Set(), undefined, seeded(1))).toBeUndefined()
    expect(drawPronounSentence([], verbs, allCells(), undefined, seeded(1))).toBeUndefined()
  })
})

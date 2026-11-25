import { describe, expect, it } from 'vitest'
import type { Cell } from '../../core/cell'
import { Round } from '../../core/round'
import { nounDeclension } from './index'
import { answerLine, explanationOf, hasSharedExplanation, NOUN_REMARK_CODES } from './remarks'

// What the page shows of remarks, without a DOM (this suite runs without one): the mount draws each checked cell's
// answer line from answerLine(), and fills the dialog an ⓘ opens from explanationOf(). Test data only.

const NO_EVENTS = { cellChecked: () => {}, itemCompleted: () => {} }

const manzelNomPl: Cell = { id: 'nom-pl', acceptedForms: [{ value: 'manželé' }, { value: 'manželové', remarks: ['meaning'] }] }
const manzelGenPl: Cell = { id: 'gen-pl', acceptedForms: [{ value: 'manželů' }] }
const manzel = {
  prompt: 'manžel',
  explanation: { en: '<em>manželové</em> are married men, <em>manželé</em> couples.', cs: '<em>manželové</em> jsou ženatí muži, <em>manželé</em> páry.' },
  cells: [{ id: 'nom-sg', acceptedForms: [{ value: 'manžel' }] }, manzelNomPl, manzelGenPl],
}

describe('the codes', () => {
  it('have a shared explanation for dual and non-final, and none for meaning', () => {
    expect(NOUN_REMARK_CODES.filter(hasSharedExplanation)).toEqual(['dual', 'non-final'])
  })
})

describe("a cell's answer line", () => {
  it('shows nothing while the cell is open, and once it is checked, the variants with a chip per remark and an ⓘ', () => {
    const round = new Round({ prompt: manzel.prompt, cells: [manzelNomPl, manzelGenPl] }, NO_EVENTS)
    expect(answerLine(manzelNomPl, round.state(0))).toEqual([])

    round.checkCell(0, 'manželé')
    expect(answerLine(manzelNomPl, round.state(0))).toEqual([
      { kind: 'form', value: 'manželé' },
      { kind: 'form', value: 'manželové' },
      { kind: 'remark', code: 'meaning' },
      { kind: 'explain', variant: { value: 'manželové', remarks: ['meaning'] } },
    ])
  })

  it('shows them for a wrong answer too', () => {
    const round = new Round({ prompt: manzel.prompt, cells: [manzelNomPl] }, NO_EVENTS)
    round.checkCell(0, 'manželi')
    expect(round.state(0)).toBe('wrong')
    expect(answerLine(manzelNomPl, round.state(0)).filter((part) => part.kind !== 'form')).toEqual([
      { kind: 'remark', code: 'meaning' },
      { kind: 'explain', variant: { value: 'manželové', remarks: ['meaning'] } },
    ])
  })

  it('gives plain variants neither chips nor an ⓘ', () => {
    expect(answerLine(manzelGenPl, 'correct')).toEqual([{ kind: 'form', value: 'manželů' }])
    const pan: Cell = { id: 'dat-sg', acceptedForms: [{ value: 'pánovi' }, { value: 'pánu' }] }
    expect(answerLine(pan, 'wrong')).toEqual([
      { kind: 'form', value: 'pánovi' },
      { kind: 'form', value: 'pánu' },
    ])
  })

  it('puts the chips and the ⓘ right after their own variant, one ⓘ for all of its remarks', () => {
    const cell: Cell = {
      id: 'ins-pl',
      acceptedForms: [{ value: 'nohama', remarks: ['dual', 'non-final'] }, { value: 'nohami' }, { value: 'x', remarks: ['meaning'] }],
    }
    expect(answerLine(cell, 'correct')).toEqual([
      { kind: 'form', value: 'nohama' },
      { kind: 'remark', code: 'dual' },
      { kind: 'remark', code: 'non-final' },
      { kind: 'explain', variant: { value: 'nohama', remarks: ['dual', 'non-final'] } },
      { kind: 'form', value: 'nohami' },
      { kind: 'form', value: 'x' },
      { kind: 'remark', code: 'meaning' },
      { kind: 'explain', variant: { value: 'x', remarks: ['meaning'] } },
    ])
  })
})

describe('what the ⓘ opens', () => {
  const texts = nounDeclension.texts
  const noha = { en: '<em>nohama</em> is said of legs, <em>nohami</em> of a table’s.', cs: '<em>nohama</em> o končetinách, <em>nohami</em> o stole.' }

  it('the shared explanation alone, for non-final on a noun without its own explanation', () => {
    expect(explanationOf(['non-final'], undefined, 'en')).toEqual([texts.en['remark-explanation.non-final']])
  })

  it("the noun's own explanation alone, for meaning", () => {
    expect(explanationOf(['meaning'], manzel.explanation, 'en')).toEqual([manzel.explanation.en])
  })

  it("the shared explanation and then the noun's own, for dual on a noun with its own explanation", () => {
    expect(explanationOf(['dual'], noha, 'en')).toEqual([texts.en['remark-explanation.dual'], noha.en])
  })

  it('every shared explanation of the variant, in its order, before the noun’s own', () => {
    expect(explanationOf(['non-final', 'meaning', 'dual'], noha, 'en')).toEqual([
      texts.en['remark-explanation.non-final'],
      texts.en['remark-explanation.dual'],
      noha.en,
    ])
  })

  it('in the UI language, as the HTML it is written in', () => {
    expect(explanationOf(['dual'], noha, 'cs')).toEqual([texts.cs['remark-explanation.dual'], noha.cs])
    expect(explanationOf(['dual'], noha, 'cs')[1]).toBe('<em>nohama</em> o končetinách, <em>nohami</em> o stole.')
    expect(texts.cs['remark-explanation.dual']).not.toBe(texts.en['remark-explanation.dual'])
  })
})

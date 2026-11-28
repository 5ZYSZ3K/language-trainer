import { nounCell, type GoverningCase } from '../adjective-noun-declension/sentence-items'
import { capitalised } from '../adjective-noun-declension/sentence-page'
import type { GrammaticalNumber } from '../noun-declension/cells'
import type { PronounDraw } from './draw'

/** What the page shows of a round: the noun above the sentence, the sentence with the noun, and the words around the field. */
export interface PronounSentence {
  /** The noun in its base form, shown above the sentence with the case and number. */
  readonly noun: string
  readonly caseId: GoverningCase
  readonly number: GrammaticalNumber
  /** The sentence with the noun in its form, capitalised, with a full stop: `Pomáhám advokátovi.`, `Advokáta se bojím.` */
  readonly withNoun: string
  /** The same sentence's words before the field in the noun's place, capitalised (`Pomáhám`, `Na`); empty at the start. */
  readonly lead: string
  /** Its words after the field, before the full stop (`se bojím`, `mluvím`); empty when the noun ends the sentence. */
  readonly tail: string
}

const joined = (words: readonly (string | undefined)[]): string => words.filter((word) => word !== undefined).join(' ')

/**
 * The sentence of `draw`. When the noun follows the verb: the subject, the verb form, the reflexive particle, the
 * preposition, the noun (`To je advokát.`, `Bojím se advokáta.`, `Dívám se na advokáta.`). When the noun, or its
 * preposition, starts the sentence: the preposition, the noun, the reflexive particle, which is always second, the verb
 * form (`Advokáta se bojím.`, `Na advokáta se dívám.`, `O advokátovi mluvím.`). The noun is in the first variant of its
 * cell (`pánovi`, not `pánu`); the first word is capitalised and a full stop ends the sentence.
 */
export function sentenceOf({ noun, caseId, number, position, prepositionFirst, verb }: PronounDraw): PronounSentence {
  const { subject, preposition, reflexive, forms } = verb.item
  const form = forms[verb.person]
  const nounFirst = position === 'start' || prepositionFirst
  const before = nounFirst ? [preposition] : [subject, form, reflexive, preposition]
  const after = nounFirst ? [reflexive, form] : []
  const nounForm = nounCell(noun, caseId, number).acceptedForms[0]!.value
  return {
    noun: noun.prompt,
    caseId,
    number,
    withNoun: `${capitalised(joined([...before, nounForm, ...after]))}.`,
    lead: capitalised(joined(before)),
    tail: joined(after),
  }
}

import type { GoverningCase } from '../adjective-noun-declension/sentence-items'
import type { PronounVerbItem } from './items'

// Small items of personal pronouns, as the join makes them, for the tests of the draw and the page: the nouns of
// demonstratives with nouns' tests, and governing verbs of every kind the position needs: with a subject, with a
// preposition, reflexive, and plain.

export { advokát, dítě, dveře, seeded, zdraví } from '../demonstrative-noun-declension/test-support'

const verb = (name: string, caseId: GoverningCase, forms: string[], parts: Partial<PronounVerbItem> = {}): PronounVerbItem => ({
  kind: 'verb',
  verb: name,
  ...parts,
  case: caseId,
  forms: { '1sg': forms[0]!, '2sg': forms[1]!, '3sg': forms[2]!, '1pl': forms[3]!, '2pl': forms[4]!, '3pl': forms[5]! },
})

/** The nominative's verb: after `to`, so always in the third person, and never with the noun at the start. */
export const být = verb('být', 'nom', ['jsem', 'jsi', 'je', 'jsme', 'jste', 'jsou'], { subject: 'to' })
export const bátSe = verb('bát se', 'gen', ['bojím', 'bojíš', 'bojí', 'bojíme', 'bojíte', 'bojí'], { reflexive: 'se' })
export const bydletU = verb('bydlet', 'gen', ['bydlím', 'bydlíš', 'bydlí', 'bydlíme', 'bydlíte', 'bydlí'], { preposition: 'u' })
export const pomáhat = verb('pomáhat', 'dat', ['pomáhám', 'pomáháš', 'pomáhá', 'pomáháme', 'pomáháte', 'pomáhají'])
export const věřit = verb('věřit', 'dat', ['věřím', 'věříš', 'věří', 'věříme', 'věříte', 'věří'])
export const děkovat = verb('děkovat', 'dat', ['děkuji', 'děkuješ', 'děkuje', 'děkujeme', 'děkujete', 'děkují'])
export const bojovatProti = verb('bojovat', 'dat', ['bojuji', 'bojuješ', 'bojuje', 'bojujeme', 'bojujete', 'bojují'], { preposition: 'proti' })
export const vidět = verb('vidět', 'acc', ['vidím', 'vidíš', 'vidí', 'vidíme', 'vidíte', 'vidí'])
export const dívatSeNa = verb('dívat se', 'acc', ['dívám', 'díváš', 'dívá', 'díváme', 'díváte', 'dívají'], { preposition: 'na', reflexive: 'se' })
/** The locative's only verbs have a preposition. */
export const mluvitO = verb('mluvit', 'loc', ['mluvím', 'mluvíš', 'mluví', 'mluvíme', 'mluvíte', 'mluví'], { preposition: 'o' })
/** The instrumental's verbs have neither a preposition nor a subject. */
export const hýbat = verb('hýbat', 'ins', ['hýbu', 'hýbeš', 'hýbe', 'hýbeme', 'hýbete', 'hýbou'])

/** A governing verb of every case, as the Czech module has them. */
export const verbs: PronounVerbItem[] = [být, bátSe, bydletU, pomáhat, věřit, děkovat, bojovatProti, vidět, dívatSeNa, mluvitO, hýbat]

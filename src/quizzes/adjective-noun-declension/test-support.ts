import type { GoverningCase, GoverningVerbItem, PairedNounItem } from './items'

// Small items of adjectives with nouns, as the join makes them, for the tests of the draw and the page.

const cells = (forms: Record<string, string | string[]>) =>
  Object.entries(forms).map(([id, values]) => ({ id, acceptedForms: [values].flat().map((value) => ({ value })) }))

export const advokát: PairedNounItem = {
  kind: 'noun',
  prompt: 'advokát',
  gender: 'm. živ.',
  adjectives: ['dobrý', 'chytrý'],
  cells: cells({
    'nom-sg': 'advokát',
    'gen-sg': 'advokáta',
    'dat-sg': 'advokátovi',
    'acc-sg': 'advokáta',
    'voc-sg': 'advokáte',
    'loc-sg': 'advokátovi',
    'ins-sg': 'advokátem',
    'nom-pl': 'advokáti',
    'gen-pl': 'advokátů',
    'dat-pl': 'advokátům',
    'acc-pl': 'advokáty',
    'voc-pl': 'advokáti',
    'loc-pl': 'advokátech',
    'ins-pl': 'advokáty',
  }),
}

/** Plural only. */
export const dveře: PairedNounItem = {
  kind: 'noun',
  prompt: 'dveře',
  gender: 'ž.',
  adjectives: ['dřevěný'],
  cells: cells({ 'nom-pl': 'dveře', 'gen-pl': 'dveří', 'dat-pl': 'dveřím', 'acc-pl': 'dveře', 'voc-pl': 'dveře', 'loc-pl': 'dveřích', 'ins-pl': 'dveřmi' }),
}

/** Singular only. */
export const zdraví: PairedNounItem = {
  kind: 'noun',
  prompt: 'zdraví',
  gender: 's.',
  adjectives: ['dobrý'],
  cells: cells({ 'nom-sg': 'zdraví', 'gen-sg': 'zdraví', 'dat-sg': 'zdraví', 'acc-sg': 'zdraví', 'voc-sg': 'zdraví', 'loc-sg': 'zdraví', 'ins-sg': 'zdravím' }),
}

const verb = (name: string, caseId: GoverningCase, stem: string, preposition?: string): GoverningVerbItem => ({
  kind: 'verb',
  verb: name,
  ...(preposition === undefined ? {} : { preposition }),
  case: caseId,
  forms: { '1sg': `${stem}1sg`, '2sg': `${stem}2sg`, '3sg': `${stem}3sg`, '1pl': `${stem}1pl`, '2pl': `${stem}2pl`, '3pl': `${stem}3pl` },
})

export const být: GoverningVerbItem = {
  kind: 'verb',
  verb: 'být',
  case: 'nom',
  forms: { '1sg': 'jsem', '2sg': 'jsi', '3sg': 'je', '1pl': 'jsme', '2pl': 'jste', '3pl': 'jsou' },
}
export const pomáhat: GoverningVerbItem = {
  kind: 'verb',
  verb: 'pomáhat',
  case: 'dat',
  forms: { '1sg': 'pomáhám', '2sg': 'pomáháš', '3sg': 'pomáhá', '1pl': 'pomáháme', '2pl': 'pomáháte', '3pl': 'pomáhají' },
}
export const dívatSeNa: GoverningVerbItem = {
  kind: 'verb',
  verb: 'dívat se',
  preposition: 'na',
  case: 'acc',
  forms: { '1sg': 'dívám se', '2sg': 'díváš se', '3sg': 'dívá se', '1pl': 'díváme se', '2pl': 'díváte se', '3pl': 'dívají se' },
}
/** One more governing verb for each of the other cases, with made-up forms. */
export const otherVerbs: GoverningVerbItem[] = [verb('bát se', 'gen', 'gen'), verb('mluvit', 'loc', 'loc', 'o'), verb('stát se', 'ins', 'ins'), verb('vidět', 'acc', 'acc')]

/** A repeatable stand-in for Math.random: the same seed gives the same numbers in [0, 1). */
export function seeded(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

import type { GoverningVerb } from './governing-verbs'

/**
 * The Czech governing verbs, settled with the owner (#11), in the order of the cases. Each verb is a prompt of
 * `cs/prirucka/verb-present-tense`. Run `npm run join:cs:adjectives` after changing them.
 */
export const czechGoverningVerbs: readonly GoverningVerb[] = [
  { verb: 'být', case: 'nom', show: { '3sg': 'je' } },

  { verb: 'bát se', case: 'gen' },
  { verb: 'ptát se', case: 'gen' },
  { verb: 'všimnout si', case: 'gen' },
  { verb: 'účastnit se', case: 'gen' },
  { verb: 'jít', preposition: 'do', case: 'gen' },
  { verb: 'bydlet', preposition: 'u', case: 'gen' },

  { verb: 'pomáhat', case: 'dat' },
  { verb: 'věřit', case: 'dat' },
  { verb: 'děkovat', case: 'dat' },
  { verb: 'rozumět', case: 'dat' },
  { verb: 'telefonovat', case: 'dat' },
  { verb: 'radit', case: 'dat' },
  { verb: 'smát se', case: 'dat' },

  { verb: 'vidět', case: 'acc' },
  { verb: 'mít', case: 'acc' },
  { verb: 'hledat', case: 'acc' },
  { verb: 'potřebovat', case: 'acc' },
  { verb: 'znát', case: 'acc' },
  { verb: 'milovat', case: 'acc' },
  { verb: 'navštěvovat', case: 'acc' },
  { verb: 'čekat', preposition: 'na', case: 'acc' },
  { verb: 'dívat se', preposition: 'na', case: 'acc' },
  { verb: 'myslet', preposition: 'na', case: 'acc' },
  { verb: 'zajímat se', preposition: 'o', case: 'acc' },

  { verb: 'mluvit', preposition: 'o', case: 'loc' },
  { verb: 'vědět', preposition: 'o', case: 'loc' },
  { verb: 'slyšet', preposition: 'o', case: 'loc' },
  { verb: 'číst', preposition: 'o', case: 'loc' },
  { verb: 'psát', preposition: 'o', case: 'loc' },
  { verb: 'pracovat', preposition: 'na', case: 'loc' },
  { verb: 'trvat', preposition: 'na', case: 'loc' },

  { verb: 'chlubit se', case: 'ins' },
  { verb: 'stát se', case: 'ins' },
  { verb: 'mávat', case: 'ins' },
  { verb: 'hýbat', case: 'ins' },
  { verb: 'pohybovat', case: 'ins' },
  { verb: 'jít', preposition: 'za', case: 'ins' },
  { verb: 'žít', preposition: 'mezi', case: 'ins' },
]

import type { AdjectiveNounTextKey } from './texts.en'

// A draft for the owner to review: judging Czech is the owner's call.
export const cs: Record<AdjectiveNounTextKey, string> = {
  title: 'Trénink přídavných jmen s podstatnými jmény',
  name: 'Přídavná jména s podstatnými jmény',
  intro: 'Doplňte přídavné a podstatné jméno v tvaru, který věta potřebuje, a potom odpovědi zkontrolujte. Tlačítkem Filtry můžete procvičovat jen některé pády.',
  empty: 'Zatím tu nejsou žádná podstatná jména k procvičování.',

  'case.nom': '1. pád – nominativ',
  'case.gen': '2. pád – genitiv',
  'case.dat': '3. pád – dativ',
  'case.acc': '4. pád – akuzativ',
  'case.voc': '5. pád – vokativ',
  'case.loc': '6. pád – lokál',
  'case.ins': '7. pád – instrumentál',
  'number.sg': 'jednotné číslo',
  'number.pl': 'množné číslo',
  form: '{case}, {number}',
  'field.adjective': 'Přídavné jméno',
  'field.noun': 'Podstatné jméno',
  nothing: 'Současné filtry nenechávají nic k procvičení.',
  next: 'Další věta',

  'filters.open': 'Filtry',
  'filters.title': 'Pády k procvičování',
  'filters.hint': 'Zaškrtněte pády, na které se chcete nechat ptát.',
  'filters.selectAll': 'Vybrat vše',
  'filters.clearAll': 'Zrušit výběr',
  'filters.done': 'Hotovo',

  'meter.adjectives': 'Správné tvary přídavných jmen',
  'meter.nouns': 'Správné tvary podstatných jmen',
  'meter.sentences': 'Zcela správné věty',
}

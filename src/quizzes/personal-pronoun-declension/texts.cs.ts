import type { PersonalPronounTextKey } from './texts.en'

// A draft for the owner to review: judging Czech is the owner's call.
export const cs: Record<PersonalPronounTextKey, string> = {
  title: 'Trénink osobních zájmen',
  name: 'Osobní zájmena',
  intro: 'Nahraďte podstatné jméno osobním zájmenem v tvaru, který věta potřebuje, a potom odpověď zkontrolujte. Tlačítkem Filtry můžete procvičovat jen některé tvary.',
  empty: 'Zatím tu nejsou žádná podstatná jména k procvičování.',

  'case.nom': '1. pád – nominativ',
  'case.gen': '2. pád – genitiv',
  'case.dat': '3. pád – dativ',
  'case.acc': '4. pád – akuzativ',
  'case.loc': '6. pád – lokál',
  'case.ins': '7. pád – instrumentál',
  'number.sg': 'jednotné číslo',
  'number.pl': 'množné číslo',
  form: '{case}, {number}',
  'field.pronoun': 'Osobní zájmeno',
  nothing: 'Současné filtry nenechávají nic k procvičení.',
  next: 'Další věta',

  'filters.open': 'Filtry',
  'filters.title': 'Tvary k procvičování',
  'filters.hint': 'Zaškrtněte tvary, na které se chcete nechat ptát. Nadpis řádku nebo sloupce přepne celý řádek nebo sloupec.',
  'filters.number.sg': 'Jednotné číslo',
  'filters.number.pl': 'Množné číslo',
  'filters.selectAll': 'Vybrat vše',
  'filters.clearAll': 'Zrušit výběr',
  'filters.done': 'Hotovo',

  'remark.less-commonly-used': 'méně časté',
  'remark.unstressed-not-sentence-initial': 'nepřízvučné',
  'remark.ijp-animate-only': 'IJP: jen životné',

  'meter.pronouns': 'Správná zájmena',
}

import type { NounDeclensionTextKey } from './texts.en'

export const cs: Record<NounDeclensionTextKey, string> = {
  title: 'Trénink skloňování českých podstatných jmen',
  name: 'Podstatná jména: skloňování',
  intro: 'Doplňte tvary podstatného jména ve všech pádech a potom odpovědi zkontrolujte. Tlačítkem Filtry můžete procvičovat jen některé tvary.',
  empty: 'Zatím tu nejsou žádná podstatná jména k procvičování.',

  'prompt.label': 'Vyskloňujte',
  'case.nom': '1. pád – nominativ',
  'case.gen': '2. pád – genitiv',
  'case.dat': '3. pád – dativ',
  'case.acc': '4. pád – akuzativ',
  'case.voc': '5. pád – vokativ',
  'case.loc': '6. pád – lokál',
  'case.ins': '7. pád – instrumentál',
  'number.sg': 'Jednotné číslo',
  'number.pl': 'Množné číslo',
  'given.label': 'zadáno',
  'answer.label': 'Všechny správné tvary:',
  next: 'Další podstatné jméno',

  'filters.open': 'Filtry',
  'filters.title': 'Tvary k procvičování',
  'filters.hint': 'Zaškrtněte tvary, na které se chcete nechat ptát. Nadpis řádku nebo sloupce přepne celý řádek nebo sloupec.',
  'filters.selectAll': 'Vybrat vše',
  'filters.clearAll': 'Zrušit výběr',
  'filters.done': 'Hotovo',

  'meter.cells': 'Správné tvary',
  'meter.items': 'Zcela správná podstatná jména',
}

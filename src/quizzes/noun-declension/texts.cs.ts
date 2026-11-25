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
  nothing: 'Současné filtry nenechávají nic k procvičení.',
  'given.label': 'zadáno',
  'answer.label': 'Všechny správné tvary:',
  next: 'Další podstatné jméno',
  'goTo.label': 'Přejít na podstatné jméno:',
  'goTo.notFound': 'Podstatné jméno „{word}“ v seznamu není.',

  'remark.dual': 'duál',
  'remark.non-final': 'před dalším jménem',
  'remark.meaning': 'jiný význam',
  'remark-explanation.dual':
    'Tvar dvojného čísla (duálu), který se v češtině zachoval u párových věcí, především částí těla (<em>rukama</em>, <em>nohama</em>, <em>očima</em>). Má-li podstatné jméno oba tvary, duálový se obvykle užívá o části těla a běžný tvar množného čísla v ostatních významech.',
  'remark-explanation.non-final':
    'Tvar podstatného jména, za kterým ve spojení následuje další jméno, například titulu před příjmením: ve 3. a 6. pádě jednotného čísla má koncovku <em>-ovi</em> jen poslední jméno a jména před ním mají <em>-u</em> (<em>panu doktoru Novákovi</em>).',
  'explanation.open': 'Vysvětlit tento tvar',
  'explanation.close': 'Zavřít',

  'filters.open': 'Filtry',
  'filters.title': 'Tvary k procvičování',
  'filters.hint': 'Zaškrtněte tvary, na které se chcete nechat ptát. Nadpis řádku nebo sloupce přepne celý řádek nebo sloupec.',
  'filters.selectAll': 'Vybrat vše',
  'filters.clearAll': 'Zrušit výběr',
  'filters.done': 'Hotovo',

  'meter.cells': 'Správné tvary',
  'meter.items': 'Zcela správná podstatná jména',
}

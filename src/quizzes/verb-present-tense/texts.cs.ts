import type { VerbPresentTextKey } from './texts.en'

export const cs: Record<VerbPresentTextKey, string> = {
  title: 'Trénink časování českých sloves',
  intro: 'Doplňte všech šest tvarů přítomného času a potom odpovědi zkontrolujte.',
  empty: 'Zatím tu nejsou žádná slovesa k procvičování.',

  'prompt.label': 'Vyčasujte',
  'cell.1sg': 'já (1. os. j. č.)',
  'cell.1pl': 'my (1. os. mn. č.)',
  'cell.2sg': 'ty (2. os. j. č.)',
  'cell.2pl': 'vy (2. os. mn. č.)',
  'cell.3sg': 'on / ona / ono (3. os. j. č.)',
  'cell.3pl': 'oni / ony / ona (3. os. mn. č.)',
  next: 'Další sloveso',
  'help.reflexive': 'U zvratných sloves pište i částici (se / si), např. bojím se.',

  'meter.cells': 'Správné tvary',
  'meter.items': 'Zcela správná slovesa',
}

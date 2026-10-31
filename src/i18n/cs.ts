import type { TranslationKey } from './en'

export const cs: Record<TranslationKey, string> = {
  'app.title': 'Trénink časování českých sloves',
  'app.intro': 'Doplňte všech šest tvarů přítomného času a potom odpovědi zkontrolujte.',
  'prompt.label': 'Vyčasujte',
  'language.label': 'Jazyk',
  'language.switchLabel': 'CZ',

  'verbPresent.1sg': 'já (1. os. j. č.)',
  'verbPresent.1pl': 'my (1. os. mn. č.)',
  'verbPresent.2sg': 'ty (2. os. j. č.)',
  'verbPresent.2pl': 'vy (2. os. mn. č.)',
  'verbPresent.3sg': 'on / ona / ono (3. os. j. č.)',
  'verbPresent.3pl': 'oni / ony / ona (3. os. mn. č.)',

  'cell.check': 'Zkontrolovat',
  'checkAll': 'Zkontrolovat vše',
  'next': 'Další sloveso',

  'chars.label': 'Vložit speciální znak',
  'help.title': 'Zkratky při psaní',
  'help.acute': "' po samohlásce dá čárku: á é í ó ú ý",
  'help.caron': '^ po písmenu dá háček: č ď ě ň ř š ť ž',
  'help.ring': 'u@ dá ů',
  'help.reflexive': 'U zvratných sloves pište i částici (se / si), např. bojím se.',

  'scores.title': 'Skóre',
  'scores.cells': 'Správné tvary',
  'scores.items': 'Zcela správná slovesa',
  'scores.reset': 'Vynulovat skóre',
  'scores.resetConfirm': 'Opravdu vynulovat všechna skóre? Tuto akci nelze vrátit.',

  'status.loading': 'Načítání…',
  'status.loadError': 'Nepodařilo se načíst data cvičení. Pokud aplikaci spouštíte lokálně, nejdřív spusťte „npm run scrape“.',
  'status.empty': 'Zatím tu nejsou žádná slovesa k procvičování.',
}

import type { TranslationKey } from './en'

export const cs: Record<TranslationKey, string> = {
  'language.label': 'Jazyk',
  'language.switchLabel': 'CZ',

  'selector.language': 'Učený jazyk',
  'selector.source': 'Zdroj',
  'selector.quiz': 'Cvičení',

  'scores.title': 'Skóre',
  'scores.reset': 'Vynulovat skóre',
  'scores.resetConfirm': 'Opravdu vynulovat všechna skóre? Tuto akci nelze vrátit.',

  'status.loading': 'Načítání…',
  'status.loadError': 'Nepodařilo se načíst data cvičení. Pokud aplikaci spouštíte lokálně, nejdřív spusťte „npm run scrape:cs:verbs“ nebo „npm run scrape:cs:nouns“.',
}

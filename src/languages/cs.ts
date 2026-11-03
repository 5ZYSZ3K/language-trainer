import type { Language } from './language'

export const cs: Language = {
  id: 'cs',
  htmlLang: 'cs',
  specialChars: [...'áéíóúýčďěňřšťžů'],
  shortcuts: {
    "'": { a: 'á', e: 'é', i: 'í', o: 'ó', u: 'ú', y: 'ý' },
    '^': { c: 'č', d: 'ď', e: 'ě', n: 'ň', r: 'ř', s: 'š', t: 'ť', z: 'ž' },
    '@': { u: 'ů' },
  },
  texts: {
    en: {
      name: 'Czech',
      shortcutHelp: [
        "' after a vowel gives an acute: á é í ó ú ý",
        '^ after a letter gives a háček: č ď ě ň ř š ť ž',
        'u@ gives ů',
      ],
    },
    cs: {
      name: 'čeština',
      shortcutHelp: [
        "' po samohlásce dá čárku: á é í ó ú ý",
        '^ po písmenu dá háček: č ď ě ň ř š ť ž',
        'u@ dá ů',
      ],
    },
  },
}

import type { Source } from './source'

export const prirucka: Source = {
  id: 'prirucka',
  name: 'Internetová jazyková příručka',
  url: 'https://prirucka.ujc.cas.cz/',
  trust: 'trusted',
  provides: [{ language: 'cs', quizType: 'verb-present-tense', delivery: { kind: 'bundled' } }],
}

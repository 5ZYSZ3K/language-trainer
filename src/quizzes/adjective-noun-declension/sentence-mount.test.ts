import { describe, expect, it } from 'vitest'
import type { CaseId } from '../noun-declension/cells'
import { ADJECTIVE_DECLENSION_GENERATORS } from './generators'
import type { PairedNounItem } from './items'
import { SentencePage } from './page'
import { twoFieldView } from './sentence-mount'
import { t } from './texts'

const labels = (html: string) => [...html.matchAll(/data-i18n-label="([^"]*)"/g)].map((match) => match[1])

describe('the round of a sentence quiz of two fields', () => {
  it('labels the first field by what fills it, and the second by the noun', () => {
    const page = new SentencePage({
      items: [],
      generator: ADJECTIVE_DECLENSION_GENERATORS.cs!,
      settings: { get: () => undefined, set: () => {} },
      record: () => {},
      random: () => 0,
    })
    expect(labels(twoFieldView(page, t).html)).toEqual(['field.adjective', 'field.noun'])
  })

  it('without a page, which shows no round, gives the first field no label key rather than one without its kind', () => {
    expect(labels(twoFieldView<PairedNounItem, 'adjective', CaseId>(undefined, t).html)).toEqual(['field.noun'])
  })
})

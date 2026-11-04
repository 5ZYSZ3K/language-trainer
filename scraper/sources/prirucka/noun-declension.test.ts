import { describe, expect, it } from 'vitest'
import { nounDeclensionCellIds, nounDeclensionContract } from '../../../src/quizzes/noun-declension'
import { ParseError, type HttpGet } from '../../harness/types'
import { nounPageScraper } from './noun-declension'
import { fixture, SITE } from './test-support'

/** Cells as an object of id -> acceptedForms, for compact assertions. */
const formsById = (html: string, word: string) =>
  Object.fromEntries(nounPageScraper.parse(html, word).map((cell) => [cell.id, cell.acceptedForms]))

/** A fake site: known URLs return their page, anything else returns an empty body. */
function fakeSite(pages: Record<string, string>, failOn?: RegExp) {
  const urls: string[] = []
  const get: HttpGet = async (url) => {
    urls.push(url)
    if (failOn?.test(url)) throw new Error('HTTP 500')
    return pages[url] ?? ''
  }
  return { get, urls }
}

describe('nounPageScraper.fetchPage', () => {
  it('searches for the noun and returns the page, with no further requests', async () => {
    const { get, urls } = fakeSite({ [`${SITE}?slovo=p%C3%A1n`]: fixture('pan') })
    await expect(nounPageScraper.fetchPage('pán', get)).resolves.toBe(fixture('pan'))
    expect(urls).toEqual([`${SITE}?slovo=p%C3%A1n`])
  })

  it('follows the link of the one noun entry when the word has several entries ("stát": a noun and a verb)', async () => {
    const { get, urls } = fakeSite({
      [`${SITE}?slovo=st%C3%A1t`]: fixture('stat-disambiguation'),
      [`${SITE}?id=st%C3%A1t`]: fixture('stat-noun'),
    })
    await expect(nounPageScraper.fetchPage('stát', get)).resolves.toBe(fixture('stat-noun'))
    expect(urls).toEqual([`${SITE}?slovo=st%C3%A1t`, `${SITE}?id=st%C3%A1t`])
  })

  it('refuses a word with several noun entries, without asking for any of them', async () => {
    // "vedoucí" is a man in charge, a woman in charge and an adjective: two nouns, and nothing says which is wanted.
    const { get, urls } = fakeSite({ [`${SITE}?slovo=vedouc%C3%AD`]: fixture('vedouci-disambiguation') })
    await expect(nounPageScraper.fetchPage('vedoucí', get)).rejects.toThrow(ParseError)
    await expect(nounPageScraper.fetchPage('vedoucí', get)).rejects.toThrow('2 noun entries')
    expect(urls).toEqual([`${SITE}?slovo=vedouc%C3%AD`, `${SITE}?slovo=vedouc%C3%AD`])
  })

  it('returns a list of entries that has no noun in it as it is, so that parse reports the real problem', async () => {
    const { get, urls } = fakeSite({ [`${SITE}?slovo=st%C3%A1t`]: fixture('stat-disambiguation').replace(', m. neživ.', ', přídavné jméno') })
    const html = await nounPageScraper.fetchPage('stát', get)
    expect(urls).toHaveLength(1)
    expect(() => nounPageScraper.parse(html, 'stát')).toThrow(ParseError)
  })

  it('does not hide a failed search', async () => {
    const { get } = fakeSite({}, /slovo=/)
    await expect(nounPageScraper.fetchPage('pán', get)).rejects.toThrow('HTTP 500')
  })
})

describe('nounPageScraper.parse', () => {
  it('reads all fourteen forms of a regular noun, singular first, in the order of the cells', () => {
    const cells = nounPageScraper.parse(fixture('dat-si-noun'), 'pusa')
    expect(cells.map((cell) => cell.id)).toEqual(nounDeclensionCellIds)
    expect(formsById(fixture('dat-si-noun'), 'pusa')).toEqual({
      'nom-sg': ['pusa'],
      'gen-sg': ['pusy'],
      'dat-sg': ['puse'],
      'acc-sg': ['pusu'],
      'voc-sg': ['puso'],
      'loc-sg': ['puse'],
      'ins-sg': ['pusou'],
      'nom-pl': ['pusy'],
      'gen-pl': ['pus'],
      'dat-pl': ['pusám'],
      'acc-pl': ['pusy'],
      'voc-pl': ['pusy'],
      'loc-pl': ['pusách'],
      'ins-pl': ['pusami'],
    })
  })

  it('accepts every listed variant of a form, and ignores the footnote markers', () => {
    const forms = formsById(fixture('pan'), 'pán')
    expect(forms['dat-sg']).toEqual(['pánovi', 'pánu'])
    expect(forms['loc-sg']).toEqual(['pánovi', 'pánu'])
    expect(forms['nom-pl']).toEqual(['pánové', 'páni'])
    expect(forms['voc-sg']).toEqual(['pane'])
  })

  it('leaves out the cells of a number the noun does not have ("dveře" has no singular)', () => {
    const cells = nounPageScraper.parse(fixture('dvere'), 'dveře')
    expect(cells.map((cell) => cell.id)).toEqual(['nom-pl', 'gen-pl', 'dat-pl', 'acc-pl', 'voc-pl', 'loc-pl', 'ins-pl'])
    expect(cells[0]).toEqual({ id: 'nom-pl', acceptedForms: ['dveře'] })
    expect(cells.at(-1)).toEqual({ id: 'ins-pl', acceptedForms: ['dveřmi'] })
  })

  it('leaves out the cells of a number the noun does not have the other way round ("zdraví" has no plural)', () => {
    const cells = nounPageScraper.parse(fixture('zdravi'), 'zdraví')
    expect(cells.map((cell) => cell.id)).toEqual(['nom-sg', 'gen-sg', 'dat-sg', 'acc-sg', 'voc-sg', 'loc-sg', 'ins-sg'])
    expect(cells.at(-1)).toEqual({ id: 'ins-sg', acceptedForms: ['zdravím'] })
  })

  it('reads an irregular noun as the site lists it ("kuře": kuřete, kuřata)', () => {
    const forms = formsById(fixture('kure'), 'kuře')
    expect(forms['gen-sg']).toEqual(['kuřete'])
    expect(forms['nom-pl']).toEqual(['kuřata'])
    expect(forms['ins-pl']).toEqual(['kuřaty'])
  })

  it('matches the heading of a capitalised noun as it is written ("Čech") and keeps its variants', () => {
    const forms = formsById(fixture('cech'), 'Čech')
    expect(forms['nom-sg']).toEqual(['Čech'])
    expect(forms['nom-pl']).toEqual(['Čechové', 'Češi'])
    expect(forms['loc-pl']).toEqual(['Češích'])
    expect(() => nounPageScraper.parse(fixture('cech'), 'čech')).toThrow(ParseError)
  })

  it('reads the noun entry that was reached by following the link ("stát")', () => {
    const forms = formsById(fixture('stat-noun'), 'stát')
    expect(forms['voc-sg']).toEqual(['státe'])
    expect(forms['loc-sg']).toEqual(['státě', 'státu'])
  })

  it('leaves out a cell that holds only a dash', () => {
    const html = fixture('pan').replace('>pánech<', '>–<')
    expect(formsById(html, 'pán')).not.toHaveProperty('loc-pl')
  })

  it('makes items the contract accepts', () => {
    for (const [name, word] of [['pan', 'pán'], ['dvere', 'dveře'], ['dat-si-noun', 'pusa'], ['zdravi', 'zdraví'], ['kure', 'kuře'], ['cech', 'Čech'], ['stat-noun', 'stát']] as const) {
      const item = { prompt: word, cells: nounPageScraper.parse(fixture(name), word) }
      expect(nounDeclensionContract.validateItem(item), word).toEqual([])
    }
  })

  it.each([
    ['bavit', 'a verb page, which names no gender', 'bavit'],
    ['pan', "another noun's entry", 'hrad'],
    ['hnat-se-no-entry', 'a page without that headword', 'hnát'],
  ])('refuses %s (%s)', (name, _what, word) => {
    expect(() => nounPageScraper.parse(fixture(name), word)).toThrow(ParseError)
  })

  it('refuses an entry that has no table, and does not read the table of the entry after it', () => {
    const noTable = `<div id='content'><div>
      <div class='hlavicka'><h2 class='ks'><strong>kakao</strong></h2></div>
      <p class='polozky'>rod: s.</p>
      <div class='hlavicka'><h2 class='ks'><strong>pusa</strong></h2></div>
      <p class='polozky'>rod: ž.</p>
      <table class='para'><tr><td>1. pád</td><td>pusa</td><td>pusy</td></tr></table></div></div>`
    expect(() => nounPageScraper.parse(noTable, 'kakao')).toThrow('no declension table')
    expect(Object.keys(formsById(noTable, 'pusa'))).toEqual(['nom-sg', 'nom-pl'])
  })
})

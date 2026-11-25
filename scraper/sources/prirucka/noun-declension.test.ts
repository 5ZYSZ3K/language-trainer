import { describe, expect, it } from 'vitest'
import { nounDeclensionCellIds, nounDeclensionContract } from '../../../src/quizzes/noun-declension'
import { ParseError, type HttpGet } from '../../harness/types'
import { nounPageScraper } from './noun-declension'
import { fixture, SITE } from './test-support'

/** Cells as an object of id -> the values of their variants, for compact assertions. */
const formsById = (html: string, word: string) =>
  Object.fromEntries(nounPageScraper.parse(html, word).item.cells.map((cell) => [cell.id, cell.acceptedForms.map((variant) => variant.value)]))

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
    const { cells } = nounPageScraper.parse(fixture('dat-si-noun'), 'pusa').item
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

  it('gives each listed form as a variant of its own, a value and nothing else', () => {
    expect(nounPageScraper.parse(fixture('pan'), 'pán').item.cells[2]).toStrictEqual({
      id: 'dat-sg',
      acceptedForms: [{ value: 'pánovi' }, { value: 'pánu' }],
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
    const { cells } = nounPageScraper.parse(fixture('dvere'), 'dveře').item
    expect(cells.map((cell) => cell.id)).toEqual(['nom-pl', 'gen-pl', 'dat-pl', 'acc-pl', 'voc-pl', 'loc-pl', 'ins-pl'])
    expect(cells[0]).toEqual({ id: 'nom-pl', acceptedForms: [{ value: 'dveře' }] })
    expect(cells.at(-1)).toEqual({ id: 'ins-pl', acceptedForms: [{ value: 'dveřmi' }] })
  })

  it('leaves out the cells of a number the noun does not have the other way round ("zdraví" has no plural)', () => {
    const { cells } = nounPageScraper.parse(fixture('zdravi'), 'zdraví').item
    expect(cells.map((cell) => cell.id)).toEqual(['nom-sg', 'gen-sg', 'dat-sg', 'acc-sg', 'voc-sg', 'loc-sg', 'ins-sg'])
    expect(cells.at(-1)).toEqual({ id: 'ins-sg', acceptedForms: [{ value: 'zdravím' }] })
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

  it.each([
    ['pan', 'pán', 'm. živ.'],
    ['stat-noun', 'stát', 'm. neživ.'],
    ['dat-si-noun', 'pusa', 'ž.'],
    ['kure', 'kuře', 's.'],
  ])('reads the gender of "%2$s" as the site words it', (name, word, gender) => {
    expect(nounPageScraper.parse(fixture(name), word).item.gender).toBe(gender)
  })

  it('reads the gender of the entry asked for, not of the one after it', () => {
    const twoEntries = `<div id='content'><div>
      <div class='hlavicka'><h2 class='ks'><strong>kakao</strong></h2></div>
      <p class='polozky'>rod: s.</p>
      <table class='para'><tr><td>1. pád</td><td>kakao</td><td></td></tr><tr><td>2. pád</td><td>kakaa</td><td></td></tr></table>
      <div class='hlavicka'><h2 class='ks'><strong>pusa</strong></h2></div>
      <p class='polozky'>rod: ž.</p>
      <table class='para'><tr><td>1. pád</td><td>pusa</td><td>pusy</td></tr></table></div></div>`
    expect(nounPageScraper.parse(twoEntries, 'kakao').item.gender).toBe('s.')
    expect(nounPageScraper.parse(twoEntries, 'pusa').item.gender).toBe('ž.')
  })

  it('leaves out a cell that holds only a dash', () => {
    const html = fixture('pan').replace('>pánech<', '>–<')
    expect(formsById(html, 'pán')).not.toHaveProperty('loc-pl')
  })

  it('makes items the contract accepts, with the word as their prompt', () => {
    for (const [name, word] of [['pan', 'pán'], ['dvere', 'dveře'], ['dat-si-noun', 'pusa'], ['zdravi', 'zdraví'], ['kure', 'kuře'], ['cech', 'Čech'], ['stat-noun', 'stát']] as const) {
      const { item } = nounPageScraper.parse(fixture(name), word)
      expect(item.prompt, word).toBe(word)
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

describe('nounPageScraper.parse: source material', () => {
  const material = (name: string, word: string) => nounPageScraper.parse(fixture(name), word).material!

  it('keeps every line of the entry under its own label, with its HTML and the articles its markers lead to ("noha")', () => {
    const { lines } = material('noha', 'noha')
    expect(lines.map(({ label, footnotes }) => [label, footnotes])).toEqual([
      ['dělení', ['135']],
      ['rod', []],
      ['příklady', []],
      ['poznámky k heslu', []],
    ])
    expect(lines[1]!.html).toBe('ž.')
    expect(lines[3]!.html).toBe(
      've významu ‚končetina‘ se ve 2. a 6. pádě mn. č. užívá spíše tvar <em>nohou</em>, v 7. pádě mn. č. výhradně tvar <em>nohama</em>',
    )
  })

  it('keeps the HTML of a line with its markers and links, and each article once, in order ("manžel")', () => {
    const { lines } = material('manzel', 'manžel')
    expect(lines.map(({ label, footnotes }) => [label, footnotes])).toEqual([
      ['dělení', ['135']],
      ['rod', []],
      ['příbuzná slova', ['699']],
      ['příklady', ['600', '710']],
      ['poznámky k heslu', []],
    ])
    expect(lines[0]!.html).toMatch(/^man-žel<sup><a [^>]*onclick="bref_baleni\(&quot;bref1&quot;, &quot;135&quot;\); return false">1<\/a><\/sup>$/)
    expect(lines[2]!.html).toContain('>manželka</a>')
  })

  it.each([
    ['noha', 'noha', { 'ins-pl': ['202'] }],
    ['manzel', 'manžel', { 'nom-sg': ['220'], 'dat-sg': ['224'], 'voc-sg': ['225'], 'loc-sg': ['224'], 'nom-pl': ['226'], 'loc-pl': ['228'] }],
    ['bratr', 'bratr', { 'dat-sg': ['224'], 'voc-sg': ['225'], 'loc-sg': ['224'], 'nom-pl': ['226'], 'gen-pl': ['227'], 'loc-pl': ['228'] }],
  ])('keeps the articles each cell of "%2$s" leads to, by cell id, the given cell included', (name, word, cellFootnotes) => {
    expect(material(name, word).cellFootnotes).toEqual(cellFootnotes)
  })

  it.each([
    ['noha', 'noha', ['135', '202']],
    ['manzel', 'manžel', ['135', '220', '224', '225', '226', '228', '600', '699', '710']],
    ['bratr', 'bratr', ['135', '186', '224', '225', '226', '227', '228']],
  ])('holds the text of every article the lines and cells of "%2$s" lead to, and no other', (name, word, ids) => {
    expect(Object.keys(material(name, word).articles).sort()).toEqual(ids)
  })

  it('gives an article as its block holds it: the heading, then the text', () => {
    const article = material('manzel', 'manžel').articles['224']!
    expect(article).toMatch(/^<h1>Skloňování mužských životných jmen – konkurence krátkých a dlouhých tvarů ve 3\. \(6\.\) p\. j\. č\.<\/h1>/)
    expect(article).toContain('<h2 id="nadpis_2"><a id="ref_id_77_2"></a>Koncovka <em>‑ovi</em></h2>')
    expect(material('noha', 'noha').articles['135']).toMatch(/^<h1>Dělení slov na konci řádku<\/h1>/)
  })

  it('gives an article the same text whichever word it was read from', () => {
    // 224 is the 3rd block on the page of "manžel" and the 2nd on that of "bratr".
    const fromManzel = material('manzel', 'manžel').articles
    const fromBratr = material('bratr', 'bratr').articles
    for (const id of ['135', '224', '225', '226', '228']) expect(fromManzel[id], id).toBe(fromBratr[id])
    expect(material('noha', 'noha').articles['135']).toBe(fromManzel['135'])
  })

  it('leaves out of an article what only belongs to its page: the links that fold it, and the print-only rule', () => {
    for (const article of Object.values(material('manzel', 'manžel').articles)) {
      expect(article).not.toMatch(/bref|Skrýt|class="(screen|print)|nadpis\d/)
      expect(article).not.toMatch(/<p><\/p>$/)
      expect(article).toBe(article.trim())
    }
  })

  it('keeps the entry of each dictionary the page quotes, by its id, without the title', () => {
    const { dictionaryEntries } = material('noha', 'noha')
    expect(Object.keys(dictionaryEntries)).toEqual(['ssc', 'ssjc'])
    expect(dictionaryEntries.ssc).toMatch(/^<b class="ssc">noha, <\/b>-y <small class="ssc">ž <\/small>/)
    expect(dictionaryEntries.ssjc).toMatch(/^<b class="red head">noha, <\/b>/)
    for (const entry of Object.values(dictionaryEntries)) expect(entry).not.toMatch(/<b>SSJ?Č<\/b>/)
  })

  it('has no dictionary entries, and no articles, where the page has none (a trimmed page)', () => {
    expect(material('pan', 'pán').dictionaryEntries).toEqual({})
    expect(material('pan', 'pán').articles).toEqual({})
  })

  it('leaves a marker whose article is not on the page out of its line and cell, and warns about each article once', () => {
    // The saved page of "pán" is trimmed: its markers lead to articles that are not in it.
    const { material, warnings } = nounPageScraper.parse(fixture('pan'), 'pán')
    const pan = material!
    expect(pan.lines.map(({ label, footnotes }) => [label, footnotes])).toEqual([
      ['dělení', []],
      ['rod', []],
      ['příbuzná slova', []],
    ])
    expect(pan.lines[0]!.html).toContain('bref_baleni') // the line's HTML stays as the site has it
    expect(pan.cellFootnotes).toEqual({})
    expect(warnings).toEqual(
      ['135', '699', '400', '224', '225', '226'].map((id) => `footnote ${id} leads to an article that is not on the page; it is left out`),
    )
  })

  /** A noun with no plural whose table has a marker where a plural form would be, and a cell past the plural. No saved page has either. */
  const marked = (cell: string, extraCell = '') => `<div id='content'><div>
      <div class='hlavicka'><h2 class='ks'><strong>zdraví</strong></h2></div>
      <p class='polozky'>rod: s.</p>
      <table class='para'>
        <tr><td>1. pád</td><td>zdraví</td><td>${cell}</td>${extraCell}</tr>
        <tr><td>2. pád</td><td>zdraví</td><td></td></tr>
      </table>
      <div id='bref1' class='sbaleno castb'><h1>Číslo podstatných jmen</h1><p>Text.</p></div></div></div>`
  const marker = `<sup><a href='javascript:' onclick='bref_baleni("bref1", "202"); return false'>1</a></sup>`

  it.each([
    ['a dash', `–${marker}`],
    ['nothing', marker],
  ])('keeps the articles of a cell that holds %s and a marker, by its cell id, though the item has no such cell', (_what, cell) => {
    const { item, material, warnings } = nounPageScraper.parse(marked(cell), 'zdraví')
    expect(item.cells.map((c) => c.id)).toEqual(['nom-sg', 'gen-sg'])
    expect(material!.cellFootnotes).toEqual({ 'nom-pl': ['202'] })
    expect(Object.keys(material!.articles)).toEqual(['202'])
    expect(warnings).toEqual([])
  })

  it('leaves out a marker in a row of the cells but in no cell, with a warning, as for an article that is missing', () => {
    const { material, warnings } = nounPageScraper.parse(marked('', `<td>${marker}</td>`), 'zdraví')
    expect(material!.cellFootnotes).toEqual({})
    expect(material!.articles).toEqual({})
    expect(warnings).toEqual(['footnote 202 is in the row "1. pád" but in no cell of it; it is left out'])
  })

  it('warns about nothing on a full page', () => {
    for (const [name, word] of [['noha', 'noha'], ['manzel', 'manžel'], ['bratr', 'bratr']] as const) {
      expect(nounPageScraper.parse(fixture(name), word).warnings, word).toEqual([])
    }
  })
})

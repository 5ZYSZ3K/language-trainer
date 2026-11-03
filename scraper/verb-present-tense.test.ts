import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { ParseError, type HttpGet } from './exercise'
import { isServerBusy, verbPresentTense } from './verb-present-tense'

const fixture = (name: string) =>
  readFileSync(new URL(`./fixtures/${name}.html`, import.meta.url), 'utf8')

/** Cells as [id, acceptedForms] pairs, for compact assertions. */
const forms = (html: string, prompt: string) =>
  verbPresentTense.parse(html, prompt).map((c) => [c.id, c.acceptedForms])

const SITE = 'https://prirucka.ujc.cas.cz/'

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

describe('VerbPresentTense.fetchPage', () => {
  it('searches for the verb and returns the page, with no further requests', async () => {
    const { get, urls } = fakeSite({ [`${SITE}?slovo=bavit`]: fixture('bavit') })
    await expect(verbPresentTense.fetchPage('bavit', get)).resolves.toBe(fixture('bavit'))
    expect(urls).toEqual([`${SITE}?slovo=bavit`])
  })

  it('url-encodes the search, spaces and diacritics included', async () => {
    const { get, urls } = fakeSite({})
    await verbPresentTense.fetchPage('bát se', get)
    expect(urls[0]).toBe(`${SITE}?slovo=b%C3%A1t%20se`)
  })

  it('follows the "sloveso" link when the word has several entries', async () => {
    const verbPage = fixture('bavit')
    const { get, urls } = fakeSite({
      [`${SITE}?slovo=st%C3%A1t`]: fixture('stat-disambiguation'),
      [`${SITE}?id=st%C3%A1t_1`]: verbPage,
    })
    await expect(verbPresentTense.fetchPage('stát', get)).resolves.toBe(verbPage)
    expect(urls).toEqual([`${SITE}?slovo=st%C3%A1t`, `${SITE}?id=st%C3%A1t_1`])
  })

  describe('reflexive verbs the site has no entry for', () => {
    // "bavit si" stands in for "dát si": the site answers with an unrelated page (the noun "pusa" fixture)
    // and has the plain verb under its own name (the "bavit" fixture).
    it('falls back to the plain verb, which parse then completes with the particle', async () => {
      const { get, urls } = fakeSite({
        [`${SITE}?slovo=bavit%20si`]: fixture('dat-si-noun'),
        [`${SITE}?slovo=bavit`]: fixture('bavit'),
      })
      const html = await verbPresentTense.fetchPage('bavit si', get)
      expect(html).toBe(fixture('bavit'))
      expect(urls).toEqual([`${SITE}?slovo=bavit%20si`, `${SITE}?slovo=bavit`])
      expect(forms(html, 'bavit si')[0]).toEqual(['1sg', ['bavím si']])
    })

    it('does not search twice when the first page is already the entry', async () => {
      const { get, urls } = fakeSite({ [`${SITE}?slovo=b%C3%A1t%20se`]: fixture('bat-se') })
      await verbPresentTense.fetchPage('bát se', get)
      expect(urls).toEqual([`${SITE}?slovo=b%C3%A1t%20se`])
    })

    it('does not search twice for a verb without a particle', async () => {
      const { get, urls } = fakeSite({ [`${SITE}?slovo=hnat`]: fixture('dat-si-noun') })
      await verbPresentTense.fetchPage('hnat', get)
      expect(urls).toEqual([`${SITE}?slovo=hnat`])
    })

    it('returns the first page when the plain verb has no entry either, so parse reports the real problem', async () => {
      const { get } = fakeSite({ [`${SITE}?slovo=${encodeURIComponent('nechtít se')}`]: fixture('nechtit-se-other-entry') })
      const html = await verbPresentTense.fetchPage('nechtít se', get)
      expect(html).toBe(fixture('nechtit-se-other-entry'))
      expect(() => verbPresentTense.parse(html, 'nechtít se')).toThrow(ParseError)
    })
  })

  it('does not hide a failed search', async () => {
    const { get } = fakeSite({}, /slovo=/)
    await expect(verbPresentTense.fetchPage('bavit', get)).rejects.toThrow('HTTP 500')
  })
})

describe('isServerBusy', () => {
  it('recognises the "another request is still being evaluated" page, and only that', () => {
    expect(isServerBusy(fixture('server-busy'))).toBe(true)
    expect(isServerBusy(fixture('bavit'))).toBe(false)
    expect(isServerBusy(fixture('hnat-se-no-entry'))).toBe(false)
  })
})

describe('VerbPresentTense.parse', () => {
  it('reads the six present-tense forms of a regular verb', () => {
    expect(forms(fixture('bavit'), 'bavit')).toEqual([
      ['1sg', ['bavím']],
      ['1pl', ['bavíme']],
      ['2sg', ['bavíš']],
      ['2pl', ['bavíte']],
      ['3sg', ['baví']],
      ['3pl', ['baví']],
    ])
  })

  it('accepts every listed variant of a form', () => {
    const cells = Object.fromEntries(forms(fixture('moct'), 'moct') as [string, string[]][])
    expect(cells['1sg']).toEqual(['mohu', 'můžu'])
    expect(cells['3pl']).toEqual(['mohou', 'můžou'])
    expect(cells['2sg']).toEqual(['můžeš'])
  })

  describe('parenthesised parts, which the site uses for optional words ("bání (se)")', () => {
    // No real present-tense cell has one in the pages we hold, so the real "bavit" markup is edited here.
    const withCell = (from: string, to: string) => fixture('bavit').replace(`>${from}<`, `>${to}<`)
    const first = (html: string) => (forms(html, 'bavit')[0] as [string, string[]])[1]

    it('accepts the form with and without an optional word', () => {
      expect(first(withCell('bavím', 'bavím (se)'))).toEqual(['bavím se', 'bavím'])
    })

    it('accepts an optional ending written inside the word', () => {
      expect(first(withCell('bavím', 'bavím(e)'))).toEqual(['bavíme', 'bavím'])
    })

    it('expands each comma-separated variant on its own, without duplicates', () => {
      expect(first(withCell('bavím', 'bavím (si), bavím'))).toEqual(['bavím si', 'bavím'])
    })
  })

  it('drops suffix-only clitics such as "-s", which are not words one can type on their own', () => {
    const cells = Object.fromEntries(forms(fixture('byt'), 'být') as [string, string[]][])
    expect(cells['2sg']).toEqual(['jsi'])
    expect(cells['3sg']).toEqual(['jest', 'je'])
  })

  it('ignores the homonym digits in the heading ("být1,2")', () => {
    expect(forms(fixture('byt'), 'být')[0]).toEqual(['1sg', ['jsem']])
  })

  it('keeps the particle when the entry is the reflexive verb itself ("bát se")', () => {
    expect(forms(fixture('bat-se'), 'bát se')[0]).toEqual(['1sg', ['bojím se']])
  })

  it('adds the particle to every form when the site only has the plain verb ("myslet si")', () => {
    const cells = Object.fromEntries(forms(fixture('myslet-si'), 'myslet si') as [string, string[]][])
    expect(cells['1sg']).toEqual(['myslím si'])
    expect(cells['3pl']).toEqual(['myslí si', 'myslejí si'])
  })

  it.each([
    ['dat-si-noun', 'dát si', 'the site returns the noun "pusa"'],
    ['nechtit-se-other-entry', 'nechtít se', 'the site returns the entry for "chtít"'],
    ['hnat-se-no-entry', 'hnát se', 'the site has no such headword'],
  ])('refuses a page that is not the verb\'s own entry (%s: %#)', (name, prompt) => {
    expect(() => verbPresentTense.parse(fixture(name), prompt)).toThrow(ParseError)
  })
})

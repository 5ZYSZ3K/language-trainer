import * as cheerio from 'cheerio'
import type { Cell } from '../../../src/core/cell'
import { verbPresentCellIds } from '../../../src/quizzes/verb-present-tense'
import { ParseError, type HttpGet } from '../../harness/types'
import { cellText, collapse, expandVariants, SITE } from './page'

export { isServerBusy } from './page'

/** "bát se" -> { base: "bát", particle: "se" }; a verb without a particle gives neither. */
function splitReflexive(prompt: string): { base?: string; particle?: string } {
  const [, base, particle] = /^(.+) (se|si)$/.exec(collapse(prompt)) ?? []
  return { base, particle }
}

/**
 * "myslet si" is listed as plain "myslet", while "bát se" has its own entry that includes the particle,
 * so an entry may be headed by either the prompt or its base.
 */
function acceptableHeadings(prompt: string): Set<string> {
  const { base } = splitReflexive(prompt)
  return new Set([collapse(prompt), ...(base ? [base] : [])])
}

function hasEntry(html: string, prompt: string): boolean {
  const $ = cheerio.load(html)
  const headings = acceptableHeadings(prompt)
  return $('div.hlavicka h2 strong')
    .toArray()
    .some((el) => headings.has(collapse($(el).text())))
}

/** On a "choose an entry" page, the link to the entry that is the verb itself, if there is exactly one. */
function verbEntryLink(html: string, prompt: string): string | undefined {
  const $ = cheerio.load(html)
  const headings = acceptableHeadings(prompt)
  const links = $('span.odsazeno')
    .filter((_, el) => /,\s*sloveso\b/.test($(el).text()))
    .find('a')
    .filter((_, a) => headings.has(collapse($(a).text())))
  if (links.length > 1) throw new ParseError(`"${prompt}" has ${links.length} verb entries and I cannot tell which is meant`)
  const href = links.first().attr('href')
  return href ? new URL(href, SITE).href : undefined
}

/** Searches for a word and, if it has several entries, follows the one that is the verb. */
async function fetchEntryPage(word: string, get: HttpGet): Promise<string> {
  const html = await get(`${SITE}?slovo=${encodeURIComponent(word)}`)
  const entry = verbEntryLink(html, word)
  return entry ? get(entry) : html
}

/** How to get the cells of one verb from prirucka. */
export interface VerbPageScraper {
  /** Fetch the page that describes `prompt`, following any disambiguation. */
  fetchPage(prompt: string, get: HttpGet): Promise<string>
  /** Turn a fetched page into cells, in the quiz type's cell order. Throws ParseError if it is not the right page. */
  parse(html: string, prompt: string): Cell[]
}

export const verbPageScraper: VerbPageScraper = {
  async fetchPage(prompt, get) {
    const page = await fetchEntryPage(prompt, get)
    const { base, particle } = splitReflexive(prompt)
    if (!base || !particle || hasEntry(page, prompt)) return page

    // The site has no entry for "dát si" (it answers with something unrelated) but does for "dát".
    // parse() adds the particle to the plain verb's forms.
    const plain = await fetchEntryPage(base, get)
    return hasEntry(plain, base) ? plain : page
  },

  parse(html, prompt) {
    const $ = cheerio.load(html)
    const headings = acceptableHeadings(prompt)
    const { particle } = splitReflexive(prompt)

    // Headings carry homonym digits in a <sup> outside the <strong>, so reading the <strong> skips them.
    const entry = $('div.hlavicka')
      .filter((_, el) => headings.has(collapse($(el).find('h2 strong').text())))
      .first()
    if (!entry.length) throw new ParseError(`no dictionary entry named "${prompt}"`)

    const byId = new Map<string, string[]>()
    entry
      .nextAll('table.para')
      .first()
      .find('tr')
      .each((_, tr) => {
        const tds = $(tr).children('td')
        const person = /^([123])\. osoba$/.exec(collapse($(tds[0]).text()))?.[1] as '1' | '2' | '3' | undefined
        if (!person) return
        byId.set(`${person}sg`, expandVariants(cellText($, tds[1]!)))
        byId.set(`${person}pl`, expandVariants(cellText($, tds[2]!)))
      })
    const withParticle = (form: string) => (particle && !form.endsWith(` ${particle}`) ? `${form} ${particle}` : form)
    return verbPresentCellIds.map((id): Cell => ({ id, acceptedForms: (byId.get(id) ?? []).map(withParticle) }))
  },
}

import * as cheerio from 'cheerio'
import type { Cell } from '../../../src/core/cell'
import { nounCaseIds, nounDeclensionCellIds, nounNumbers, nounCellId } from '../../../src/quizzes/noun-declension'
import { ParseError, type HttpGet } from '../../harness/types'
import { cellText, collapse, expandVariants, SITE } from './page'

/** How the site starts the gender of a noun, in an entry ("rod: m. živ.") and on a "choose an entry" page ("stát, m. neživ."). */
const GENDER = /^(?:m|ž|s)\./

/** A lone dash would mean "no such form"; the site leaves such cells empty, but a dash must never become a form to type. */
const isNoForm = (variant: string) => /^[-–—]+$/.test(variant)

/** On a "choose an entry" page, the link to the entry that is the noun itself, if there is exactly one. */
function nounEntryLink(html: string, word: string): string | undefined {
  const $ = cheerio.load(html)
  const links = $('span.odsazeno')
    .filter((_, el) => /,\s*(?:m|ž|s)\.(?:\s|$)/.test(collapse($(el).text())))
    .find('a')
    .filter((_, a) => collapse($(a).text()) === collapse(word))
  if (links.length > 1) throw new ParseError(`"${word}" has ${links.length} noun entries and I cannot tell which is meant`)
  const href = links.first().attr('href')
  return href ? new URL(href, SITE).href : undefined
}

/** What a noun's page tells: its gender as the site words it, and its forms. */
export interface NounPage {
  /** From the entry's "rod:" line, e.g. "m. živ.", "m. neživ.", "ž.", "s.". */
  gender: string
  /** In the quiz type's cell order. */
  cells: Cell[]
}

/** How to get the gender and the cells of one noun from prirucka. */
export interface NounPageScraper {
  /** Fetch the page that describes `word`, following any disambiguation to its one noun entry. */
  fetchPage(word: string, get: HttpGet): Promise<string>
  /** Turn a fetched page into the noun's gender and cells. Throws ParseError if it is not the right page. */
  parse(html: string, word: string): NounPage
}

export const nounPageScraper: NounPageScraper = {
  /**
   * Searches for the word and, if it has several entries, follows the one that is a noun. A word with no noun entry
   * (or several) is left to `parse` (or reported here) as a failure of that word alone.
   */
  async fetchPage(word, get) {
    const html = await get(`${SITE}?slovo=${encodeURIComponent(word)}`)
    const entry = nounEntryLink(html, word)
    return entry ? get(entry) : html
  },

  parse(html, word) {
    const $ = cheerio.load(html)

    // Headings carry homonym digits in a <sup> outside the <strong>, so reading the <strong> skips them.
    const entry = $('div.hlavicka')
      .filter((_, el) => collapse($(el).find('h2 strong').text()) === collapse(word))
      .first()
    if (!entry.length) throw new ParseError(`no dictionary entry named "${word}"`)

    // Everything that belongs to this entry: up to the next heading, so another entry's table is never read.
    const body = entry.nextUntil('div.hlavicka')
    const gender = body
      .filter('p.polozky')
      .toArray()
      .map((p) => /^rod:\s*(.+)$/.exec(collapse($(p).text()))?.[1])
      .find((value) => value !== undefined)
    if (!gender || !GENDER.test(gender)) throw new ParseError(`"${word}" is not a noun entry: it names no gender`)

    const table = body.filter('table.para').first()
    if (!table.length) throw new ParseError(`"${word}" has no declension table`)

    const byId = new Map<string, string[]>()
    table.find('tr').each((_, tr) => {
      const tds = $(tr).children('td')
      const number = /^([1-7])\. pád$/.exec(collapse($(tds[0]).text()))?.[1]
      if (!number) return
      const caseId = nounCaseIds[Number(number) - 1]!
      nounNumbers.forEach((grammaticalNumber, column) => {
        const cell = tds[column + 1]
        if (cell) byId.set(nounCellId(caseId, grammaticalNumber), expandVariants(cellText($, cell)).filter((form) => !isNoForm(form)))
      })
    })

    // Only the forms that exist: an empty cell (no plural, no singular) is simply not an item cell.
    const cells = nounDeclensionCellIds.flatMap((id): Cell[] => {
      const acceptedForms = byId.get(id) ?? []
      return acceptedForms.length > 0 ? [{ id, acceptedForms }] : []
    })
    return { gender, cells }
  },
}

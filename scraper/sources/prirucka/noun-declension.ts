import * as cheerio from 'cheerio'
import type { Cell } from '../../../src/core/cell'
import { nounCaseIds, nounDeclensionCellIds, nounNumbers, nounCellId, type NounItem } from '../../../src/quizzes/noun-declension'
import { ParseError } from '../../harness/types'
import type { EntryScraper } from '../../list-driven'
import { cellFootnotesOf, cellText, collapse, entryBody, entryMaterial, expandVariants, footnoteIds, SITE } from './page'

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

/** A row of the declension table: "1. pád" to "7. pád". */
const CASE_ROW = /^([1-7])\. pád$/

/** How to get one noun from prirucka: its item (gender and cells) and its source material. */
export const nounPageScraper: EntryScraper<NounItem> = {
  /**
   * Searches for the word and, if it has several entries, follows the one that is a noun. A word with no noun entry
   * (or several) is left to `parse` (or reported here) as a failure of that word alone.
   */
  async fetchPage(word, get) {
    const html = await get(`${SITE}?slovo=${encodeURIComponent(word)}`)
    const entry = nounEntryLink(html, word)
    return entry ? get(entry) : html
  },

  /**
   * The noun's item, with its gender as the entry's "rod:" line words it ("m. živ.", "m. neživ.", "ž.", "s.") and its
   * cells in the quiz type's order, and its source material. The warnings name each footnote that is left out.
   */
  parse(html, word) {
    const $ = cheerio.load(html)

    // Headings carry homonym digits in a <sup> outside the <strong>, so reading the <strong> skips them.
    const entry = $('div.hlavicka')
      .filter((_, el) => collapse($(el).find('h2 strong').text()) === collapse(word))
      .first()
    if (!entry.length) throw new ParseError(`no dictionary entry named "${word}"`)

    // Everything that belongs to this entry: up to the next heading, so another entry's table is never read.
    const body = entryBody(entry)
    const gender = body
      .filter('p.polozky')
      .toArray()
      .map((p) => /^rod:\s*(.+)$/.exec(collapse($(p).text()))?.[1])
      .find((value) => value !== undefined)
    if (!gender || !GENDER.test(gender)) throw new ParseError(`"${word}" is not a noun entry: it names no gender`)

    const table = body.filter('table.para').first()
    if (!table.length) throw new ParseError(`"${word}" has no declension table`)

    const byId = new Map<string, string[]>()
    const footnotesById = new Map<string, string[]>()
    const strayMarkers: string[] = []
    table.find('tr').each((_, tr) => {
      const [header, ...values] = $(tr).children('td').toArray()
      const row = collapse($(header).text())
      const number = CASE_ROW.exec(row)?.[1]
      if (!number) return
      const caseId = nounCaseIds[Number(number) - 1]!
      values.forEach((cell, column) => {
        const grammaticalNumber = nounNumbers[column]
        if (!grammaticalNumber) {
          // Past the singular and the plural, the table gives a cell no id, so its markers have nowhere to go.
          for (const id of footnoteIds($, cell)) strayMarkers.push(`footnote ${id} is in the row "${row}" but in no cell of it; it is left out`)
          return
        }
        const id = nounCellId(caseId, grammaticalNumber)
        byId.set(id, expandVariants(cellText($, cell)).filter((form) => !isNoForm(form)))
        footnotesById.set(id, footnoteIds($, cell))
      })
    })

    // Only the forms that exist: an empty cell (no plural, no singular) is simply not an item cell. Its markers are
    // kept all the same.
    const cells = nounDeclensionCellIds.flatMap((id): Cell[] => {
      const forms = byId.get(id) ?? []
      return forms.length > 0 ? [{ id, acceptedForms: forms.map((value) => ({ value })) }] : []
    })
    const cellFootnotes = cellFootnotesOf(nounDeclensionCellIds, footnotesById)
    const { material, warnings } = entryMaterial($, body, { table, isCellRow: (header) => CASE_ROW.test(header), cellFootnotes })
    return { item: { prompt: word, gender, cells }, material, warnings: [...warnings, ...strayMarkers] }
  },
}

/**
 * What the pages of prirucka.ujc.cas.cz have in common, whatever the entry is: where the site is, how its tables
 * are read, what an entry says beyond its forms, and how the site says that it is busy. The verb and noun parsers
 * are built on these.
 */
import * as cheerio from 'cheerio'
import { articleIdsOf, type EntryMaterial, type SourceLine } from '../../harness/source-material'

export const SITE = 'https://prirucka.ujc.cas.cz/'

export type El = Parameters<cheerio.CheerioAPI>[0]

/** A node of the parsed page (cheerio does not export the type by name). */
type PageNode = Extract<Parameters<typeof cheerio.load>[0], { type: unknown }>

type Selection = cheerio.Cheerio<PageNode>

export const collapse = (s: string) => s.replace(/\s+/g, ' ').trim()

/** Everything that belongs to an entry: what follows its heading, up to the next heading. */
export function entryBody(entry: Selection): Selection {
  return entry.nextUntil('div.hlavicka')
}

/**
 * A footnote marker: `bref_baleni("bref4", "226")` names the hidden block on this page that holds the article
 * (`bref4`) and the site's own id of the article (`226`), which is the same on every page. The list of links at the
 * bottom of the page and the blocks themselves leave the id unquoted.
 */
const MARKER = /bref_baleni\(\s*"(bref\d+)"\s*,\s*"?(\d+)"?\s*\)/

/** The footnote markers under `el`, in order: the block each one opens and the id of its article. */
function markersIn($: cheerio.CheerioAPI, el: El): { block: string; article: string }[] {
  return $(el)
    .find('sup a[onclick*="bref_baleni"]')
    .toArray()
    .flatMap((a) => {
      const [, block, article] = MARKER.exec($(a).attr('onclick') ?? '') ?? []
      return block && article ? [{ block, article }] : []
    })
}

/**
 * The ids of the articles the footnote markers under `el` lead to, each once, in order. Call it on a line or a table
 * cell only: the list at the bottom of the page repeats every marker of the entry.
 */
export function footnoteIds($: cheerio.CheerioAPI, el: El): string[] {
  return [...new Set(markersIn($, el).map((marker) => marker.article))]
}

/**
 * The ids of the articles each cell's markers lead to, by cell id in the order of `cellIds`, given `footnoteIds` of
 * the table cell at each id's place. A cell without a marker is left out; one without a form is not, since its
 * marker still leads somewhere.
 */
export function cellFootnotesOf(cellIds: readonly string[], footnotesById: ReadonlyMap<string, string[]>): Record<string, string[]> {
  return Object.fromEntries(cellIds.flatMap((id) => (footnotesById.get(id)?.length ? [[id, footnotesById.get(id)!]] : [])))
}

/** `<p class='polozky'>příklady: …</p>`: the label is the plain text before the first colon, the rest is the line's HTML. */
function polozkyLine($: cheerio.CheerioAPI, p: El): SourceLine {
  const html = $(p).html() ?? ''
  const label = /^([^:]+):/.exec(collapse($(p).text()))?.[1]?.trim()
  const prefix = /^\s*[^:<]*:\s*/.exec(html)
  return label !== undefined && prefix
    ? { label, html: html.slice(prefix[0].length).trim(), footnotes: footnoteIds($, p) }
    : { label: '', html: html.trim(), footnotes: footnoteIds($, p) }
}

export interface MaterialOptions {
  /** The entry's table, the one the adapter reads its cells from. */
  table: Selection
  /** Whether a row of the table holds cells of the quiz, by its header ("1. pád"); every other row with a header is a line. */
  isCellRow(header: string): boolean
  /** The ids of the articles each cell's markers lead to, by cell id (see `cellFootnotesOf`). */
  cellFootnotes: Record<string, string[]>
}

/**
 * What the entry says besides its forms, and a warning for each marker whose article is not on the page.
 *
 * The lines are the entry's `p.polozky` lines and, at the table's place, its rows that are not cells of the quiz
 * (a verb's *přechodník*, *příčestí*, …), each labelled with its header and holding the HTML of its value cells. An
 * article is the block a marker opens, wherever it is on the page, tidied so that it reads the same from every word:
 * without its "Skrýt" links and print-only rule, with its heading ids numbered as on no page in particular. A marker
 * whose block is missing is left out of its line or cell. The dictionary entries are the hidden `dict_<id>` blocks,
 * without their title.
 */
export function entryMaterial(
  $: cheerio.CheerioAPI,
  body: Selection,
  { table, isCellRow, cellFootnotes }: MaterialOptions,
): { material: EntryMaterial; warnings: string[] } {
  const rows = table.find('tr').toArray()
  const lines = body.toArray().flatMap((el): SourceLine[] => {
    if ($(el).is('p.polozky')) return [polozkyLine($, el)]
    if (el !== table.get(0)) return []
    return rows.flatMap((tr) => {
      const [header, ...values] = $(tr).children('td').toArray()
      const label = header ? collapse($(header).text()) : ''
      if (label === '' || isCellRow(label)) return []
      const footnotes = [...new Set(values.flatMap((td) => footnoteIds($, td)))]
      return [{ label, html: values.map((td) => $.html(td)).join(''), footnotes }]
    })
  })

  // Where each article is on this page. The markers of the lines and of the table's cells are enough: nothing else
  // in the entry leads to an article.
  const blocks = new Map<string, string>()
  for (const el of [...body.filter('p.polozky').toArray(), ...table.find('td').toArray()]) {
    for (const { block, article } of markersIn($, el)) if (!blocks.has(article)) blocks.set(article, block)
  }

  const articles: Record<string, string> = {}
  const warnings: string[] = []
  for (const id of articleIdsOf({ lines, cellFootnotes })) {
    const blockId = blocks.get(id)
    const block = blockId === undefined ? undefined : $(`div#${blockId}`)
    if (block && block.length > 0) articles[id] = articleHtml($, block)
    else warnings.push(`footnote ${id} leads to an article that is not on the page; it is left out`)
  }

  const found = (ids: string[]) => ids.filter((id) => id in articles)
  const material: EntryMaterial = {
    lines: lines.map((line) => ({ ...line, footnotes: found(line.footnotes) })),
    cellFootnotes: Object.fromEntries(
      Object.entries(cellFootnotes).flatMap(([cell, ids]) => (found(ids).length > 0 ? [[cell, found(ids)]] : [])),
    ),
    dictionaryEntries: dictionaryEntries($),
    articles,
  }
  return { material, warnings }
}

/**
 * The article in a `bref<n>` block, the same whichever page it is read from: the block numbers its heading ids after
 * its place on the page (`nadpis3_1`), and holds "Skrýt" links to itself (`.screen`) and a print-only rule.
 */
function articleHtml($: cheerio.CheerioAPI, block: Selection): string {
  const article = block.clone()
  article.find('.screen, div.print').remove()
  article.children('p').filter((_, p) => ($(p).html() ?? '').trim() === '').remove()
  return (article.html() ?? '').replace(/nadpis\d+_/g, 'nadpis_').trim()
}

/** The hidden `dict_<id>` blocks of the page, by id: each one's entries, without the title that only names the dictionary. */
function dictionaryEntries($: cheerio.CheerioAPI): Record<string, string> {
  return Object.fromEntries(
    $('div[id^="dict_"]')
      .toArray()
      .map((div) => [
        ($(div).attr('id') ?? '').slice('dict_'.length),
        $(div)
          .children()
          .slice(1)
          .toArray()
          .map((entry) => ($(entry).html() ?? '').trim())
          .join('\n'),
      ]),
  )
}

/** Text of a table cell without its footnote markers (<sup>). */
export function cellText($: cheerio.CheerioAPI, td: El): string {
  return $(td).clone().find('sup').remove().end().text()
}

/** "bavím (se)" -> ["bavím (se)" with the group opened, then without]; every (...) is an optional part. */
function expandOptionalParts(variant: string): string[] {
  const group = /\(([^()]*)\)/.exec(variant)
  if (!group) return [variant]
  const [whole, inner] = [group[0], group[1]!]
  const before = variant.slice(0, group.index)
  const after = variant.slice(group.index + whole.length)
  return [...expandOptionalParts(before + inner + after), ...expandOptionalParts(before + after)]
}

/**
 * Splits a table cell such as "mohu, můžu" into its variants. Parenthesised parts are optional ("bojí (se)"
 * accepts both). Suffix-only clitics ("-s" in "jsi, -s") are dropped: they are not words that can be typed
 * on their own.
 */
export function expandVariants(text: string): string[] {
  const variants = text
    .split(',')
    .flatMap(expandOptionalParts)
    .map(collapse)
    .filter((v) => v !== '' && !v.startsWith('-'))
  return [...new Set(variants)]
}

/** The site answers 200 with this page when an earlier query from the same address is still open. */
export function isServerBusy(html: string): boolean {
  return html.includes('server je přetížen')
}

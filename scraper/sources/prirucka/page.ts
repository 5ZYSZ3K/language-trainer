/**
 * What the pages of prirucka.ujc.cas.cz have in common, whatever the entry is: where the site is, how its tables
 * are read, and how it says that it is busy. The verb and noun parsers are built on these.
 */
import * as cheerio from 'cheerio'

export const SITE = 'https://prirucka.ujc.cas.cz/'

export type El = Parameters<cheerio.CheerioAPI>[0]

export const collapse = (s: string) => s.replace(/\s+/g, ' ').trim()

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

import * as cheerio from 'cheerio'
import type { Cell } from '../src/core/cell'
import type { TranslationKey } from '../src/i18n/en'
import { verbPresentTense as runtime } from '../src/exercises/verb-present-tense'
import { ParseError, type HttpGet, type ScrapableExercise } from './exercise'

const SITE = 'https://prirucka.ujc.cas.cz/'

type El = Parameters<cheerio.CheerioAPI>[0]

const collapse = (s: string) => s.replace(/\s+/g, ' ').trim()

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

/** Text of a table cell without its footnote markers (<sup>). */
function cellText($: cheerio.CheerioAPI, td: El): string {
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
function expandVariants(text: string): string[] {
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

/**
 * The site keeps an address "busy" until the browser reports that it loaded the page, which it does
 * from the page's own onload handler. This rebuilds the URL of that report from the page itself.
 */
function loadAckUrl(html: string): string | undefined {
  const $ = cheerio.load(html)
  const action = /sendinfo\(url \+ "([^"]*)"\)/.exec($('body').attr('onload') ?? '')?.[1]
  const url = /var url = "([^"]*)" \+ encodeURIComponent\("([^"]*)"\)/.exec($('script').text())
  return action && url ? url[1] + encodeURIComponent(url[2]!) + action : undefined
}

/** Gets a page and, like a browser would, reports that it arrived. The report is best effort. */
async function getAcked(url: string, get: HttpGet): Promise<string> {
  const html = await get(url)
  const ack = loadAckUrl(html)
  if (ack) {
    try {
      await get(ack)
    } catch {
      // Not worth failing the verb over; the lock times out on its own.
    }
  }
  return html
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
  const html = await getAcked(`${SITE}?slovo=${encodeURIComponent(word)}`, get)
  const entry = verbEntryLink(html, word)
  return entry ? getAcked(entry, get) : html
}

export const verbPresentTense: ScrapableExercise = {
  ...runtime,

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

    const byLabel = new Map<TranslationKey, string[]>()
    entry
      .nextAll('table.para')
      .first()
      .find('tr')
      .each((_, tr) => {
        const tds = $(tr).children('td')
        const person = /^([123])\. osoba$/.exec(collapse($(tds[0]).text()))?.[1] as '1' | '2' | '3' | undefined
        if (!person) return
        byLabel.set(`verbPresent.${person}sg` as const, expandVariants(cellText($, tds[1]!)))
        byLabel.set(`verbPresent.${person}pl` as const, expandVariants(cellText($, tds[2]!)))
      })
    const withParticle = (form: string) => (particle && !form.endsWith(` ${particle}`) ? `${form} ${particle}` : form)
    return runtime.cellLabels.map(
      (label): Cell => ({ label, acceptedForms: (byLabel.get(label) ?? []).map(withParticle) }),
    )
  },
}

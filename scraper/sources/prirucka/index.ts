/**
 * Internetová jazyková příručka (https://prirucka.ujc.cas.cz/). The site is slow, goes down under load and,
 * once it considers an earlier query from an address unfinished, answers every later one with a "busy" page for
 * tens of minutes: one request at a time, a pause counted from the end of the previous one, long retry waits.
 */
import type { Item } from '../../../src/core/cell'
import type { Adapter, ScraperSource } from '../../harness/context'
import type { RequestPolicy } from '../../harness/http'
import { runListDriven } from '../../list-driven'
import { isServerBusy, verbPresentTense } from './verb-present-tense'

export const priruckaPolicy: RequestPolicy = {
  delayMs: 1500,
  timeoutMs: 30_000,
  retries: 4,
  retryDelayMs: 15_000,
  userAgent: 'uceni-se-cestiny-scraper (+https://github.com/5ZYSZ3K/uceni-se-cestiny)',
  isUnusable: isServerBusy,
}

/** cs / verb-present-tense: the verbs of lists/cs/verb-present-tense.txt, one entry page each. */
const verbPresentTenseAdapter: Adapter<Item> = {
  source: 'prirucka',
  language: 'cs',
  quizType: 'verb-present-tense',
  run: (context) =>
    runListDriven(context, {
      fetchPage: verbPresentTense.fetchPage,
      parse: (html, entry) => ({ prompt: entry, cells: verbPresentTense.parse(html, entry) }),
    }),
}

export const prirucka: ScraperSource = {
  id: 'prirucka',
  policy: priruckaPolicy,
  adapters: [verbPresentTenseAdapter],
}

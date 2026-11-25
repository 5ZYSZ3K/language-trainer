import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { Item } from '../../../src/core/cell'
import { nounDeclensionContract, type NounItem } from '../../../src/quizzes/noun-declension'
import { verbPresentTenseContract } from '../../../src/quizzes/verb-present-tense'
import type { SourceMaterial } from '../../harness/source-material'
import { testContext } from '../../harness/test-support'
import type { HttpGet } from '../../harness/types'
import { prirucka, priruckaPolicy } from '.'
import { fixture, SITE } from './test-support'


describe('prirucka request policy', () => {
  it('asks slowly, waits long and retries the busy page', () => {
    expect(priruckaPolicy).toMatchObject({ delayMs: 1500, timeoutMs: 30_000, retries: 4, retryDelayMs: 15_000 })
    expect(priruckaPolicy.userAgent).toBe('language-trainer-scraper (+https://github.com/5ZYSZ3K/language-trainer)')
    expect(priruckaPolicy.isUnusable?.(fixture('server-busy'))).toBe(true)
    expect(priruckaPolicy.isUnusable?.(fixture('bavit'))).toBe(false)
  })
})

describe('prirucka adapters', () => {
  it('provide cs / verb-present-tense and cs / noun-declension', () => {
    expect(prirucka.adapters.map(({ source, language, quizType }) => ({ source, language, quizType }))).toEqual([
      { source: 'prirucka', language: 'cs', quizType: 'verb-present-tense' },
      { source: 'prirucka', language: 'cs', quizType: 'noun-declension' },
    ])
  })

  describe('cs / verb-present-tense', () => {
    let listsDir: string
    beforeEach(async () => {
      listsDir = await mkdtemp(join(tmpdir(), 'lists-'))
      await mkdir(join(listsDir, 'cs'))
      await writeFile(join(listsDir, 'cs', 'verb-present-tense.txt'), 'bavit, bát se')
    })
    afterEach(async () => {
      await rm(listsDir, { recursive: true, force: true })
    })

    it('scrapes the verbs of lists/cs/verb-present-tense.txt into items the contract accepts', async () => {
      const pages: Record<string, string> = {
        [`${SITE}?slovo=bavit`]: fixture('bavit'),
        [`${SITE}?slovo=b%C3%A1t%20se`]: fixture('bat-se'),
      }
      const get: HttpGet = async (url) => pages[url] ?? ''
      const saved: Item[][] = []
      const context = testContext<Item>({
        target: { language: 'cs', source: 'prirucka', quizType: 'verb-present-tense' },
        contract: verbPresentTenseContract,
        get,
        save: async (items) => void saved.push([...items]),
        listsDir,
      })
      const result = await prirucka.adapters[0]!.run(context)
      expect(result.failures).toEqual([])
      expect(result.items.map((item) => (item as Item).prompt)).toEqual(['bavit', 'bát se'])
      expect(saved.at(-1)).toEqual(result.items)
      const batSe = result.items[1] as Item
      expect(batSe.cells.map((cell) => cell.id)).toEqual(['1sg', '2sg', '3sg', '1pl', '2pl', '3pl'])
      expect(batSe.cells[0]!.acceptedForms).toContainEqual({ value: 'bojím se' })
      for (const item of result.items) expect(verbPresentTenseContract.validateItem(item)).toEqual([])
    })

    it("hands over each verb's source material with it, and keeps it out of the item", async () => {
      await writeFile(join(listsDir, 'cs', 'verb-present-tense.txt'), 'moct')
      const saved: SourceMaterial[] = []
      const context = testContext<Item>({
        target: { language: 'cs', source: 'prirucka', quizType: 'verb-present-tense' },
        contract: verbPresentTenseContract,
        get: async (url) => (url === `${SITE}?slovo=moct` ? fixture('moct') : ''),
        save: async (_items, material) => void saved.push(material),
        listsDir,
      })
      const result = await prirucka.adapters[0]!.run(context)
      expect(Object.keys(result.items[0]!)).toEqual(['prompt', 'cells'])
      const { entries, articles, wordsInDictionaries } = saved.at(-1)!
      expect(entries.map((entry) => entry.prompt)).toEqual(['moct'])
      expect(entries[0]!.lines.map((line) => line.label)).toContain('přechodník přítomný, m.')
      expect(wordsInDictionaries).toEqual([{ prompt: 'moct', entries: { ssc: expect.any(String), ssjc: expect.any(String) } }])
      expect(Object.keys(articles)).toEqual(['135', '510', '590'])
    })
  })

  describe('cs / noun-declension', () => {
    let listsDir: string
    beforeEach(async () => {
      listsDir = await mkdtemp(join(tmpdir(), 'lists-'))
      await mkdir(join(listsDir, 'cs'))
      // "vedoucí" has two noun entries, so it cannot be scraped; it sits in the middle to show the run goes on.
      await writeFile(join(listsDir, 'cs', 'noun-declension.txt'), 'pán, vedoucí, dveře')
    })
    afterEach(async () => {
      await rm(listsDir, { recursive: true, force: true })
    })

    it('scrapes the nouns of lists/cs/noun-declension.txt, leaves out one it cannot tell the entry of, and carries on', async () => {
      const pages: Record<string, string> = {
        [`${SITE}?slovo=p%C3%A1n`]: fixture('pan'),
        [`${SITE}?slovo=vedouc%C3%AD`]: fixture('vedouci-disambiguation'),
        [`${SITE}?slovo=dve%C5%99e`]: fixture('dvere'),
      }
      const get: HttpGet = async (url) => pages[url] ?? ''
      const saved: NounItem[][] = []
      const lines: string[] = []
      const context = testContext<NounItem>({
        target: { language: 'cs', source: 'prirucka', quizType: 'noun-declension' },
        contract: nounDeclensionContract,
        get,
        save: async (items) => void saved.push([...items]),
        log: (line) => void lines.push(line),
        listsDir,
      })
      const result = await prirucka.adapters[1]!.run(context)
      expect(result.items.map((item) => (item as Item).prompt)).toEqual(['pán', 'dveře'])
      expect(result.failures).toHaveLength(1)
      expect(result.failures[0]).toMatchObject({ entry: 'vedoucí' })
      expect(result.failures[0]!.reason).toContain('2 noun entries')
      expect(saved.at(-1)).toEqual(result.items)
      // The saved pages are trimmed: the articles their markers lead to are not in them.
      expect(lines).toContain('warn   pán (1/3): footnote 135 leads to an article that is not on the page; it is left out')
      const pan = result.items[0] as NounItem
      expect(pan.gender).toBe('m. živ.')
      expect(pan.cells).toHaveLength(14)
      expect(pan.cells[0]).toEqual({ id: 'nom-sg', acceptedForms: [{ value: 'pán' }] })
      const dvere = result.items[1] as NounItem
      expect(dvere.gender).toBe('ž.')
      expect(dvere.cells.map((cell) => cell.id)[0]).toBe('nom-pl')
      for (const item of result.items) expect(nounDeclensionContract.validateItem(item)).toEqual([])
    })

    it('fetches only the nouns it has not scraped yet, and leaves the ones saved without a gender as they are', async () => {
      const pages: Record<string, string> = {
        [`${SITE}?slovo=dve%C5%99e`]: fixture('dvere'),
      }
      const urls: string[] = []
      const get: HttpGet = async (url) => {
        urls.push(url)
        return pages[url] ?? ''
      }
      // "pán" was scraped before the gender was kept: it is not fetched again just to add one.
      const pan: NounItem = {
        prompt: 'pán',
        cells: [
          { id: 'nom-sg', acceptedForms: [{ value: 'pán' }] },
          { id: 'gen-sg', acceptedForms: [{ value: 'pána' }] },
        ],
      }
      const context = testContext<NounItem>({
        target: { language: 'cs', source: 'prirucka', quizType: 'noun-declension' },
        contract: nounDeclensionContract,
        existing: [pan],
        get,
        listsDir,
      })
      await writeFile(join(listsDir, 'cs', 'noun-declension.txt'), 'pán, dveře')
      const result = await prirucka.adapters[1]!.run(context)
      expect(urls).toEqual([`${SITE}?slovo=dve%C5%99e`])
      expect(result.failures).toEqual([])
      expect(result.items[0]).toBe(pan)
      expect(result.items[0]).not.toHaveProperty('gender')
      expect((result.items[1] as NounItem).gender).toBe('ž.')
    })

    it("hands over each noun's source material with it, and keeps it out of the item", async () => {
      await writeFile(join(listsDir, 'cs', 'noun-declension.txt'), 'manžel, bratr')
      const pages: Record<string, string> = {
        [`${SITE}?slovo=man%C5%BEel`]: fixture('manzel'),
        [`${SITE}?slovo=bratr`]: fixture('bratr'),
      }
      const saved: SourceMaterial[] = []
      const context = testContext<NounItem>({
        target: { language: 'cs', source: 'prirucka', quizType: 'noun-declension' },
        contract: nounDeclensionContract,
        get: async (url) => pages[url] ?? '',
        save: async (_items, material) => void saved.push(material),
        listsDir,
      })
      const result = await prirucka.adapters[1]!.run(context)
      expect(result.failures).toEqual([])
      expect(Object.keys(result.items[0]!)).toEqual(['prompt', 'gender', 'cells'])
      const { entries, articles, wordsInDictionaries } = saved.at(-1)!
      expect(entries.map((entry) => entry.prompt)).toEqual(['manžel', 'bratr'])
      expect(entries[0]!.cellFootnotes['nom-sg']).toEqual(['220'])
      expect(entries[1]!.lines.map((line) => line.label)).toEqual(['dělení', 'rod', 'příklady', 'poznámky k heslu'])
      expect(wordsInDictionaries.map((word) => [word.prompt, Object.keys(word.entries)])).toEqual([
        ['manžel', ['ssc', 'ssjc']],
        ['bratr', ['ssc', 'ssjc']],
      ])
      // Each article once, for both nouns: 224 is on both pages.
      expect(Object.keys(articles)).toEqual(['135', '186', '220', '224', '225', '226', '227', '228', '600', '699', '710'])
    })

    it('with --force, keeps the remarks and the explanation written by hand, and warns about a remark whose variant is gone', async () => {
      await writeFile(join(listsDir, 'cs', 'noun-declension.txt'), 'manžel')
      const explanation = { en: '<p>Two plurals.</p>', cs: '<p>Dvě množná čísla.</p>' }
      const written: NounItem = {
        prompt: 'manžel',
        gender: 'm. živ.',
        explanation,
        cells: [
          { id: 'nom-sg', acceptedForms: [{ value: 'manžel' }] },
          { id: 'dat-sg', acceptedForms: [{ value: 'manželovi' }, { value: 'manželu', remarks: ['non-final'] }] },
          { id: 'nom-pl', acceptedForms: [{ value: 'manželé' }, { value: 'manželové', remarks: ['meaning'] }] },
          { id: 'loc-pl', acceptedForms: [{ value: 'manželech' }, { value: 'manželách', remarks: ['dual'] }] },
        ],
      }
      expect(nounDeclensionContract.validateItem(written)).toEqual([])
      const lines: string[] = []
      const context = testContext<NounItem>({
        target: { language: 'cs', source: 'prirucka', quizType: 'noun-declension' },
        contract: nounDeclensionContract,
        existing: [written],
        force: true,
        get: async (url) => (url === `${SITE}?slovo=man%C5%BEel` ? fixture('manzel') : ''),
        log: (line) => void lines.push(line),
        listsDir,
      })
      const result = await prirucka.adapters[1]!.run(context)
      expect(result.failures).toEqual([])
      const manzel = result.items[0] as NounItem
      expect(manzel.explanation).toEqual(explanation)
      expect(manzel.cells).toHaveLength(14)
      const byId = Object.fromEntries(manzel.cells.map((cell) => [cell.id, cell.acceptedForms]))
      expect(byId['dat-sg']).toEqual([{ value: 'manželovi' }, { value: 'manželu', remarks: ['non-final'] }])
      expect(byId['nom-pl']).toEqual([{ value: 'manželé' }, { value: 'manželové', remarks: ['meaning'] }])
      expect(byId['loc-pl']).toEqual([{ value: 'manželech' }, { value: 'manželích' }])
      expect(lines).toContain('warn   manžel (1/1): cell loc-pl no longer has the variant "manželách", so its remarks (dual) were dropped')
    })
  })
})

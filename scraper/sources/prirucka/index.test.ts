import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { Item } from '../../../src/core/cell'
import { verbPresentTenseContract } from '../../../src/quizzes/verb-present-tense'
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
  it('provide cs / verb-present-tense', () => {
    expect(prirucka.adapters.map(({ source, language, quizType }) => ({ source, language, quizType }))).toEqual([
      { source: 'prirucka', language: 'cs', quizType: 'verb-present-tense' },
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
      expect(batSe.cells[0]!.acceptedForms).toContain('bojím se')
      for (const item of result.items) expect(verbPresentTenseContract.validateItem(item)).toEqual([])
    })
  })
})

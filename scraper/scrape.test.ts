import { describe, expect, it } from 'vitest'
import type { Item } from '../src/core/cell'
import { ParseError, type HttpGet, type ScrapableExercise } from './exercise'
import { scrape } from './scrape'

/** A stand-in exercise: the page for "x" is "page:x"; a prompt containing "bad" parses to an error. */
const stub: ScrapableExercise = {
  type: 'stub',
  cellLabels: ['verbPresent.1sg', 'verbPresent.1pl'],
  fetchPage: (prompt, get) => get(`page:${prompt}`),
  parse(html, prompt) {
    if (prompt.includes('bad')) throw new ParseError('not the right page')
    if (prompt.includes('empty')) return this.cellLabels.map((label) => ({ label, acceptedForms: [] }))
    return this.cellLabels.map((label) => ({ label, acceptedForms: [`${html}/${label}`] }))
  },
}

function recordingGet(failOn: string[] = []) {
  const urls: string[] = []
  const get: HttpGet = async (url) => {
    urls.push(url)
    if (failOn.includes(url)) throw new Error('HTTP 503')
    return url
  }
  return { get, urls }
}

const stored = (prompt: string): Item => ({
  prompt,
  cells: [
    { label: 'verbPresent.1sg', acceptedForms: ['kept'] },
    { label: 'verbPresent.1pl', acceptedForms: ['kept'] },
  ],
})

describe('scrape', () => {
  it('fetches every prompt when nothing has been scraped yet, keeping the list order', async () => {
    const { get, urls } = recordingGet()
    const result = await scrape({ exercise: stub, prompts: ['b', 'a', 'c'], existing: [], force: false, get })
    expect(urls).toEqual(['page:b', 'page:a', 'page:c'])
    expect(result.items.map((i) => i.prompt)).toEqual(['b', 'a', 'c'])
    expect(result.items[0]!.cells[0]).toEqual({ label: 'verbPresent.1sg', acceptedForms: ['page:b/verbPresent.1sg'] })
    expect(result.failures).toEqual([])
  })

  it('only fetches prompts that are missing from the existing data', async () => {
    const { get, urls } = recordingGet()
    const result = await scrape({
      exercise: stub,
      prompts: ['a', 'b', 'c'],
      existing: [stored('a'), stored('c')],
      force: false,
      get,
    })
    expect(urls).toEqual(['page:b'])
    expect(result.items.map((i) => i.prompt)).toEqual(['a', 'b', 'c'])
    expect(result.items[0]).toEqual(stored('a'))
  })

  it('fetches everything again when forced', async () => {
    const { get, urls } = recordingGet()
    const result = await scrape({ exercise: stub, prompts: ['a', 'b'], existing: [stored('a'), stored('b')], force: true, get })
    expect(urls).toEqual(['page:a', 'page:b'])
    expect(result.items[0]!.cells[0]!.acceptedForms).toEqual(['page:a/verbPresent.1sg'])
  })

  it('drops existing items whose prompt is no longer in the list', async () => {
    const { get, urls } = recordingGet()
    const result = await scrape({ exercise: stub, prompts: ['a'], existing: [stored('a'), stored('gone')], force: false, get })
    expect(urls).toEqual([])
    expect(result.items.map((i) => i.prompt)).toEqual(['a'])
  })

  it('ignores a prompt listed twice', async () => {
    const { get, urls } = recordingGet()
    const result = await scrape({ exercise: stub, prompts: ['a', 'a'], existing: [], force: false, get })
    expect(urls).toEqual(['page:a'])
    expect(result.items).toHaveLength(1)
  })

  it('skips a prompt whose fetch fails, reports why, and carries on with the rest', async () => {
    const { get } = recordingGet(['page:b'])
    const result = await scrape({ exercise: stub, prompts: ['a', 'b', 'c'], existing: [], force: false, get })
    expect(result.items.map((i) => i.prompt)).toEqual(['a', 'c'])
    expect(result.failures).toEqual([{ prompt: 'b', reason: 'HTTP 503' }])
  })

  it('skips a prompt whose page cannot be parsed', async () => {
    const { get } = recordingGet()
    const result = await scrape({ exercise: stub, prompts: ['a', 'bad one'], existing: [], force: false, get })
    expect(result.items.map((i) => i.prompt)).toEqual(['a'])
    expect(result.failures).toEqual([{ prompt: 'bad one', reason: 'not the right page' }])
  })

  it('skips a prompt when any cell ends up with no accepted form', async () => {
    const { get } = recordingGet()
    const result = await scrape({ exercise: stub, prompts: ['empty one', 'a'], existing: [], force: false, get })
    expect(result.items.map((i) => i.prompt)).toEqual(['a'])
    expect(result.failures).toHaveLength(1)
    expect(result.failures[0]).toMatchObject({ prompt: 'empty one' })
    expect(result.failures[0]!.reason).toMatch(/verbPresent\.1sg/)
  })

  it('tries a previously failed prompt again on the next run', async () => {
    const first = recordingGet(['page:b'])
    const run1 = await scrape({ exercise: stub, prompts: ['a', 'b'], existing: [], force: false, get: first.get })
    const second = recordingGet()
    const run2 = await scrape({ exercise: stub, prompts: ['a', 'b'], existing: run1.items, force: false, get: second.get })
    expect(second.urls).toEqual(['page:b'])
    expect(run2.items.map((i) => i.prompt)).toEqual(['a', 'b'])
    expect(run2.failures).toEqual([])
  })
})

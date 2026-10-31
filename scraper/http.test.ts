import { describe, expect, it } from 'vitest'
import type { HttpGet } from './exercise'
import { politely } from './http'

/** Virtual time: sleeping advances the clock, requests take no time. */
function fakeClock() {
  let time = 0
  return {
    now: () => time,
    sleep: async (ms: number) => {
      time += ms
    },
  }
}

describe('politely', () => {
  it('starts consecutive requests at least delayMs apart, without delaying the first', async () => {
    const clock = fakeClock()
    const starts: number[] = []
    const raw: HttpGet = async () => {
      starts.push(clock.now())
      return 'ok'
    }
    const get = politely(raw, { delayMs: 1000, retries: 0, retryDelayMs: 0, ...clock })
    await get('a')
    await get('b')
    await get('c')
    expect(starts).toEqual([0, 1000, 2000])
  })

  it('does not add a wait when the gap has already passed on its own', async () => {
    const clock = fakeClock()
    const starts: number[] = []
    const raw: HttpGet = async () => {
      starts.push(clock.now())
      return 'ok'
    }
    const get = politely(raw, { delayMs: 1000, retries: 0, retryDelayMs: 0, ...clock })
    await get('a')
    await clock.sleep(5000)
    await get('b')
    expect(starts).toEqual([0, 5000])
  })

  it('retries a failed request with a growing wait, then returns the successful body', async () => {
    const clock = fakeClock()
    const starts: number[] = []
    let calls = 0
    const raw: HttpGet = async () => {
      starts.push(clock.now())
      if (++calls < 3) throw new Error('HTTP 503')
      return 'finally'
    }
    const get = politely(raw, { delayMs: 1000, retries: 2, retryDelayMs: 3000, ...clock })
    await expect(get('a')).resolves.toBe('finally')
    expect(starts).toEqual([0, 3000, 9000])
  })

  it('treats a response flagged as unusable (such as a "server busy" page) like a failure and retries it', async () => {
    const clock = fakeClock()
    const starts: number[] = []
    const bodies = ['BUSY', 'BUSY', 'real page']
    const raw: HttpGet = async () => {
      starts.push(clock.now())
      return bodies.shift()!
    }
    const get = politely(raw, {
      delayMs: 1000,
      retries: 2,
      retryDelayMs: 3000,
      isUnusable: (body) => body === 'BUSY',
      ...clock,
    })
    await expect(get('a')).resolves.toBe('real page')
    expect(starts).toEqual([0, 3000, 9000])
  })

  it('fails with a clear error when the response stays unusable', async () => {
    const clock = fakeClock()
    const get = politely(async () => 'BUSY', {
      delayMs: 0,
      retries: 1,
      retryDelayMs: 0,
      isUnusable: (body) => body === 'BUSY',
      ...clock,
    })
    await expect(get('a')).rejects.toThrow(/busy|unusable/i)
  })

  it('gives up after the allowed retries and rethrows the last error', async () => {
    const clock = fakeClock()
    let calls = 0
    const raw: HttpGet = async () => {
      throw new Error(`HTTP 503 (#${++calls})`)
    }
    const get = politely(raw, { delayMs: 1000, retries: 2, retryDelayMs: 10, ...clock })
    await expect(get('a')).rejects.toThrow('HTTP 503 (#3)')
    expect(calls).toBe(3)
  })
})

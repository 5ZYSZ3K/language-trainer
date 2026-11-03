import { describe, expect, it } from 'vitest'
import type { HttpGet } from './types'
import { politeGetter, politely, type RequestPolicy } from './http'

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

  it('counts the delay from the end of the previous request, so a slow answer is never followed at once', async () => {
    const clock = fakeClock()
    const starts: number[] = []
    const raw: HttpGet = async () => {
      starts.push(clock.now())
      await clock.sleep(400) // the request itself takes 400 ms
      return 'ok'
    }
    const get = politely(raw, { delayMs: 1000, retries: 0, retryDelayMs: 0, ...clock })
    await get('a')
    await get('b')
    await get('c')
    expect(starts).toEqual([0, 1400, 2800])
  })

  it('also waits after a request that failed, such as a timeout, before the next one', async () => {
    const clock = fakeClock()
    const starts: number[] = []
    const raw: HttpGet = async (url) => {
      starts.push(clock.now())
      await clock.sleep(30_000)
      if (url === 'a') throw new Error('timeout')
      return 'ok'
    }
    const get = politely(raw, { delayMs: 1000, retries: 0, retryDelayMs: 0, ...clock })
    await expect(get('a')).rejects.toThrow('timeout')
    await get('b')
    expect(starts).toEqual([0, 31_000])
  })

  it('does not wait at all when the delay is 0', async () => {
    const clock = fakeClock()
    const starts: number[] = []
    const raw: HttpGet = async () => {
      starts.push(clock.now())
      return 'ok'
    }
    const get = politely(raw, { delayMs: 0, retries: 0, retryDelayMs: 0, ...clock })
    await get('a')
    await get('b')
    expect(starts).toEqual([0, 0])
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

describe('politeGetter', () => {
  const policy: RequestPolicy = {
    delayMs: 1500,
    retries: 1,
    retryDelayMs: 15_000,
    timeoutMs: 30_000,
    userAgent: 'test',
    isUnusable: (body) => body === 'busy',
  }

  function site(bodies: string[]) {
    const clock = fakeClock()
    const starts: number[] = []
    const raw: HttpGet = async () => {
      starts.push(clock.now())
      return bodies.shift() ?? 'ok'
    }
    return { clock, starts, raw }
  }

  it("paces requests by the policy's pause and retries what the policy calls unusable", async () => {
    const { clock, starts, raw } = site(['ok', 'busy', 'ok'])
    const get = politeGetter(policy, { raw, ...clock })
    await get('a')
    await expect(get('b')).resolves.toBe('ok')
    expect(starts).toEqual([0, 1500, 16_500])
  })

  it('uses the pause given for the run instead of the policy one', async () => {
    const { clock, starts, raw } = site([])
    const get = politeGetter(policy, { delayMs: 4000, raw, ...clock })
    await get('a')
    await get('b')
    expect(starts).toEqual([0, 4000])
  })
})

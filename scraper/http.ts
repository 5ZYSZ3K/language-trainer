import type { HttpGet } from './exercise'

export interface PoliteOptions {
  /** Minimum time between the starts of two requests. */
  delayMs: number
  /** How many times to retry a failed request. */
  retries: number
  /** Wait before retry n is at least n * retryDelayMs. */
  retryDelayMs: number
  /** A response this recognises (e.g. "server busy" served with status 200) is retried like a failure. */
  isUnusable?: (body: string) => boolean
  now?: () => number
  sleep?: (ms: number) => Promise<void>
}

/** Wraps a getter so requests run one at a time, spaced out, and transient failures are retried. */
export function politely(raw: HttpGet, options: PoliteOptions): HttpGet {
  const {
    delayMs,
    retries,
    retryDelayMs,
    isUnusable = () => false,
    now = Date.now,
    sleep = (ms) => new Promise((r) => setTimeout(r, ms)),
  } = options
  let lastStart: number | undefined

  return async (url) => {
    for (let attempt = 0; ; attempt++) {
      if (lastStart !== undefined) {
        const gap = attempt === 0 ? delayMs : Math.max(delayMs, retryDelayMs * attempt)
        const wait = lastStart + gap - now()
        if (wait > 0) await sleep(wait)
      }
      lastStart = now()
      try {
        const body = await raw(url)
        if (isUnusable(body)) throw new Error(`the site is busy or gave an unusable response for ${url}`)
        return body
      } catch (error) {
        if (attempt >= retries) throw error
      }
    }
  }
}

/** Real network access with a timeout. The site hangs now and then, so a request must not wait forever. */
export function fetchText(options: { timeoutMs: number; userAgent: string }): HttpGet {
  return async (url) => {
    const response = await fetch(url, {
      headers: { 'User-Agent': options.userAgent },
      signal: AbortSignal.timeout(options.timeoutMs),
    })
    if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`)
    return response.text()
  }
}

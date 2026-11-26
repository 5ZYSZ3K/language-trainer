/** Fetches a URL and returns the response body, throwing on any failure. */
export type HttpGet = (url: string) => Promise<string>

/**
 * Thrown when a page was fetched but does not describe the requested entry, or the item made from it breaks the
 * contract. It is never a fetch failure: `maxConsecutiveFetchFailures` in `scraper/list-driven.ts` says what is.
 */
export class ParseError extends Error {}

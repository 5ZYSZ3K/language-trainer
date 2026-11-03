/** Fetches a URL and returns the response body, throwing on any failure. */
export type HttpGet = (url: string) => Promise<string>

/**
 * Thrown when a page was fetched but does not describe the requested entry, or the item made from it breaks the
 * contract. Anything else that goes wrong while getting an item is a fetch failure (the site's fault).
 */
export class ParseError extends Error {}

import type { Cell } from '../src/core/cell'

/** Fetches a URL and returns the response body, throwing on any failure. */
export type HttpGet = (url: string) => Promise<string>

/** Thrown when a page was fetched but does not describe the requested prompt. */
export class ParseError extends Error {}

/** Build-time counterpart of a quiz type: how to get the cells for one prompt from the source site. */
export interface ScrapableExercise {
  /** Fetch the page that describes `prompt`, following any redirects or disambiguation. */
  fetchPage(prompt: string, get: HttpGet): Promise<string>
  /** Turn a fetched page into cells, in the quiz type's cell order. Throws ParseError if it is not the right page. */
  parse(html: string, prompt: string): Cell[]
}

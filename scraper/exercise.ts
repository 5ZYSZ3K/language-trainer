import type { Cell } from '../src/core/cell'
import type { Exercise } from '../src/core/exercise'

/** Fetches a URL and returns the response body, throwing on any failure. */
export type HttpGet = (url: string) => Promise<string>

/** Thrown when a page was fetched but does not describe the requested prompt. */
export class ParseError extends Error {}

/** Build-time extension of Exercise: how to get the cells for one prompt from the source site. */
export interface ScrapableExercise extends Exercise {
  /** Fetch the page that describes `prompt`, following any redirects or disambiguation. */
  fetchPage(prompt: string, get: HttpGet): Promise<string>
  /** Turn a fetched page into cells, in `cellIds` order. Throws ParseError if it is not the right page. */
  parse(html: string, prompt: string): Cell[]
}

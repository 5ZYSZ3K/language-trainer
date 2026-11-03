import { prirucka } from '../sources/prirucka'
import type { Adapter, ScraperSource } from './context'

/** The sources the scraper can fetch from. To add one: create scraper/sources/<id>/ and add it here. */
export const SCRAPER_SOURCES: readonly ScraperSource[] = [prirucka]

/** Every adapter, in registry order (the order in which several matching targets run). */
export const ADAPTERS: readonly Adapter[] = SCRAPER_SOURCES.flatMap((source) => source.adapters)

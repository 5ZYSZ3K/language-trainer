import { prirucka } from './prirucka'
import type { Source } from './source'

export type { Delivery, Source } from './source'

/** The data sources. To add one: create its file and add it here. */
export const SOURCES: readonly Source[] = [prirucka]

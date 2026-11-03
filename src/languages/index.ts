import { cs } from './cs'
import type { Language } from './language'

export type { Language }

/** The languages that can be learned, in display order. To add one: create its file and add it here. */
export const LANGUAGES: readonly Language[] = [cs]

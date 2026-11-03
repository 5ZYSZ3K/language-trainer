import type { Pool } from './pool'

/**
 * The contents of a dataset file: the envelope, which names the pool the file is for (and must match the file's
 * location and the registries), and the pool's items. What an item looks like is the quiz type's contract; the
 * things that move datasets around treat items as opaque.
 */
export interface Dataset<Item = unknown> extends Pool {
  items: Item[]
}

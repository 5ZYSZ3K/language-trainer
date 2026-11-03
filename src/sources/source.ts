/**
 * How the page gets a dataset. The file in data/ is the same either way.
 * - `bundled`: Vite imports the file lazily, so each dataset becomes its own JS chunk.
 * - `github`: specified and typed, not implemented (no loader exists, so no source may use it yet).
 */
export type Delivery = { readonly kind: 'bundled' } | { readonly kind: 'github' }

/** Where data comes from. Trust is a property of the source, not of a language or a quiz. */
export interface Source {
  /** Also the folder name under data/. */
  readonly id: string
  /** A proper name, not translated. */
  readonly name: string
  readonly url: string
  readonly trust: 'trusted' | 'unverified'
  readonly license?: { readonly name: string; readonly url?: string }
  /** Text that must be shown when this source's data is shown. */
  readonly attribution?: string
  /** The datasets this source has: at most one per (language, quiz type). */
  readonly provides: readonly {
    /** Language id. */
    readonly language: string
    /** Quiz type id. */
    readonly quizType: string
    readonly delivery: Delivery
    /** True: maintained by hand, no adapter exists or is needed. */
    readonly manual?: boolean
  }[]
}

/**
 * The registries (languages, sources, quiz types and the scraper's own lists) are plain lists of things with an `id`.
 * This is how anything else looks one up by that id.
 */
export const findById = <T extends { readonly id: string }>(entries: readonly T[], id: string): T | undefined =>
  entries.find((entry) => entry.id === id)

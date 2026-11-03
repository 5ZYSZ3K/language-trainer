/**
 * A word list under lists/<language>/<quiz type>.txt: comma-separated entries (for cs/verb-present-tense,
 * infinitives with reflexives like "bát se" included). Whitespace is collapsed and empty entries are dropped;
 * the order is kept. Repeats are left in; the list-driven loop ignores them.
 */
export function parseList(text: string): string[] {
  return text
    .split(',')
    .map((entry) => entry.replace(/\s+/g, ' ').trim())
    .filter((entry) => entry !== '')
}

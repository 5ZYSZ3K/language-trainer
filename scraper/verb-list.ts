/** czech_verbs.txt: comma-separated infinitives (reflexives like "bát se" included). */
export function parseVerbList(text: string): string[] {
  return text
    .split(',')
    .map((verb) => verb.replace(/\s+/g, ' ').trim())
    .filter((verb) => verb !== '')
}

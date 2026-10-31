/**
 * The only forgiveness: case and whitespace (and Unicode composition, so "í" typed as "i" + accent
 * is still "í"). Diacritics are never ignored.
 */
function normalize(text: string): string {
  return text.normalize('NFC').toLowerCase().replace(/\s+/g, ' ').trim()
}

export function isCorrect(input: string, acceptedForms: readonly string[]): boolean {
  const answer = normalize(input)
  return acceptedForms.some((form) => normalize(form) === answer)
}

import type { Item, Variant } from './cell'

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

/** A cell's check: `input` is correct when it matches the value of some variant, by the rules of `isCorrect`. */
export function matchesSomeVariant(input: string, variants: readonly Variant[]): boolean {
  return isCorrect(input, variants.map((variant) => variant.value))
}

/**
 * The item whose prompt is `typed`, forgiven exactly as an answer is (case, whitespace, composition) and no more: a
 * missing diacritic or a missing reflexive particle finds nothing. An empty `typed` finds nothing either.
 */
export function findByPrompt<T extends Item>(items: readonly T[], typed: string): T | undefined {
  const wanted = normalize(typed)
  return wanted === '' ? undefined : items.find((item) => normalize(item.prompt) === wanted)
}

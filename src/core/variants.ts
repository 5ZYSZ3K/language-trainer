import type { Variant } from './cell'
import { isRecord } from './is-record'

/** A variant as a contract reads it from parsed JSON: its `value` is known to be good, nothing else is checked yet. */
export type CheckedVariant = Record<string, unknown> & Pick<Variant, 'value'>

const hasTextValue = (variant: Record<string, unknown>): variant is CheckedVariant =>
  typeof variant.value === 'string' && variant.value.trim() !== ''

/**
 * What every contract asks of a cell's `acceptedForms`: a non-empty list of variants, each an object with a non-empty
 * text `value` (the accepted form). Gives back the variants, or the one problem with them. What else a variant may
 * hold, such as `remarks`, is each contract's own rule.
 */
export function checkVariants(
  cellId: string,
  acceptedForms: unknown,
): { variants: CheckedVariant[] } | { problem: string } {
  if (!Array.isArray(acceptedForms) || acceptedForms.length === 0) return { problem: `no form found for ${cellId}` }
  if (!acceptedForms.every(isRecord)) return { problem: `cell ${cellId} has a variant that is not an object` }
  if (!acceptedForms.every(hasTextValue)) return { problem: `cell ${cellId} has a variant without a text value` }
  return { variants: acceptedForms }
}

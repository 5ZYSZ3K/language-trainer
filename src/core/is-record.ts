/** Whether `value` is an object with properties to look at (parsed JSON, say): not null and not a list. */
export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

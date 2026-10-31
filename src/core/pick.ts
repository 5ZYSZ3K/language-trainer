/** Uniform pick that skips `previous`, unless it is the only choice. `random` returns [0, 1). */
export function pickNext<T>(items: readonly T[], previous: T | undefined, random: () => number): T {
  if (items.length === 0) throw new Error('nothing to pick from')
  const choices = items.length > 1 ? items.filter((item) => item !== previous) : items
  return choices[Math.floor(random() * choices.length)]!
}

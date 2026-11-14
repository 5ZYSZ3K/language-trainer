import { isCorrect } from '../../core/matching'

/** One accepted way of writing a number in words, and what is special about it (remark codes, see `REMARK_CODES`). */
export interface NumeralVersion {
  readonly value: string
  readonly remarks: readonly string[]
}

/** Every accepted way of writing a number in words, from a whole number 0 ≤ n < 10¹². */
export type NumeralGenerator = (n: number) => readonly NumeralVersion[]

/**
 * The remark codes the quiz has a label and an explanation for, in the order its legend lists them. A remark is a code,
 * optionally prefixed with the word of the part of the number it is about: `tisíc:inverted-form`. A code that is not
 * listed here is still shown, as it is.
 */
export const REMARK_CODES = [
  'masculine',
  'feminine',
  'neuter',
  'counting-form',
  'less-commonly-used',
  'inverted-form',
  'mixed-form',
] as const
export type RemarkCode = (typeof REMARK_CODES)[number]

export const isRemarkCode = (code: string): code is RemarkCode => (REMARK_CODES as readonly string[]).includes(code)

/** A remark split into its code and, if it has one, the part of the number it is about. */
export interface Remark {
  readonly code: string
  readonly part?: string
}

export function parseRemark(remark: string): Remark {
  const colon = remark.indexOf(':')
  return colon === -1 ? { code: remark } : { part: remark.slice(0, colon), code: remark.slice(colon + 1) }
}

/** The versions in the order the page lists them: no remarks first, then by number of remarks; ties keep their order. */
export function sortVersions(versions: readonly NumeralVersion[]): NumeralVersion[] {
  return [...versions].sort((a, b) => a.remarks.length - b.remarks.length)
}

/** The version `input` spells, by the matching rules of every quiz (case and whitespace forgiven); undefined if none. */
export function findVersion(input: string, versions: readonly NumeralVersion[]): NumeralVersion | undefined {
  return versions.find((version) => isCorrect(input, [version.value]))
}

/**
 * What the legend under the versions explains: the codes that occur in them (known ones in `REMARK_CODES` order, then
 * any unknown ones as they come), and whether any remark names a part of the number.
 */
export function legendOf(versions: readonly NumeralVersion[]): { codes: string[]; hasParts: boolean } {
  const remarks = versions.flatMap((version) => version.remarks.map(parseRemark))
  const present = new Set(remarks.map((remark) => remark.code))
  const known = REMARK_CODES.filter((code) => present.has(code))
  const unknown = [...present].filter((code) => !isRemarkCode(code))
  return { codes: [...known, ...unknown], hasParts: remarks.some((remark) => remark.part !== undefined) }
}

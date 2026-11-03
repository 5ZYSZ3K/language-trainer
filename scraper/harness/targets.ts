import type { Adapter } from './context'

/** --source, --language and --quiz; each one given narrows the registered adapters. */
export interface TargetFilter {
  source?: string
  language?: string
  quizType?: string
}

/** `prirucka / cs / verb-present-tense` */
export const targetName = (adapter: Adapter): string => `${adapter.source} / ${adapter.language} / ${adapter.quizType}`

const FLAGS = { source: '--source', language: '--language', quizType: '--quiz' } as const

/**
 * The adapters to run, in registry order. With no filter, the only registered adapter; with no filter and several,
 * an error listing them, so that nothing is ever scraped by accident. A filter that matches nothing is an error.
 */
export function selectTargets(adapters: readonly Adapter[], filter: TargetFilter): { targets: Adapter[] } | { error: string } {
  const list = adapters.map((adapter) => `  ${targetName(adapter)}`).join('\n')
  if (adapters.length === 0) return { error: 'No scrape target is registered.' }

  const given = (Object.keys(FLAGS) as (keyof TargetFilter)[]).filter((key) => filter[key] !== undefined)
  if (given.length === 0) {
    if (adapters.length === 1) return { targets: [...adapters] }
    return { error: `Several scrape targets exist; choose with --source, --language or --quiz:\n${list}` }
  }

  const targets = adapters.filter((adapter) => given.every((key) => adapter[key] === filter[key]))
  if (targets.length > 0) return { targets }
  const asked = given.map((key) => `${FLAGS[key]} ${filter[key]}`).join(' ')
  return { error: `No scrape target matches ${asked}. The targets are:\n${list}` }
}

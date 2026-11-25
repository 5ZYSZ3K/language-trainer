import type { RunContext } from './context'
import { NO_SOURCE_MATERIAL } from './source-material'

/** A run context for tests: what a test does not give does nothing (no existing items or side files, nothing saved or logged). */
export function testContext<Item>(
  parts: Pick<RunContext<Item>, 'target' | 'contract' | 'listsDir'> & Partial<RunContext<Item>>,
): RunContext<Item> {
  return {
    existing: [],
    existingMaterial: NO_SOURCE_MATERIAL,
    force: false,
    failCooldownMs: 0,
    get: async () => '',
    save: async () => {},
    log: () => {},
    planned: () => {},
    ...parts,
  }
}

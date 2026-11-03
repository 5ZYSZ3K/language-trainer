import type { RunContext } from './context'

/** A run context for tests: what a test does not give does nothing (no existing items, nothing saved or logged). */
export function testContext<Item>(
  parts: Pick<RunContext<Item>, 'target' | 'contract' | 'listsDir'> & Partial<RunContext<Item>>,
): RunContext<Item> {
  return {
    existing: [],
    force: false,
    failCooldownMs: 0,
    get: async () => '',
    save: async () => {},
    log: () => {},
    planned: () => {},
    ...parts,
  }
}

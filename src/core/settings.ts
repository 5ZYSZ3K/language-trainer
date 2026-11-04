import { isRecord } from './is-record'
import type { StorageLike } from './scores'

export const SETTINGS_KEY = 'settings'

/**
 * What a quiz remembers for itself between visits (a filter, say), kept per pool like the scores. It knows nothing
 * about what a value means: the quiz saves whatever JSON it likes and checks what it gets back. Persists to the given
 * storage; if storage is missing or broken it carries on in memory.
 */
export class Settings {
  private data: Record<string, unknown>

  constructor(private readonly storage: StorageLike) {
    this.data = this.load()
  }

  /** The value last saved for the pool, or undefined. The caller must not trust its shape: it may be from an older build. */
  get(pool: string): unknown {
    return this.data[pool]
  }

  set(pool: string, value: unknown): void {
    this.data[pool] = value
    try {
      this.storage.setItem(SETTINGS_KEY, JSON.stringify(this.data))
    } catch {
      // Private mode or full storage: the value still holds for this page view.
    }
  }

  private load(): Record<string, unknown> {
    try {
      const parsed: unknown = JSON.parse(this.storage.getItem(SETTINGS_KEY) ?? 'null')
      return isRecord(parsed) ? parsed : {}
    } catch {
      return {}
    }
  }
}

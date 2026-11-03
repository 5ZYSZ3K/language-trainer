import { describe, expect, it } from 'vitest'
import { finder } from './dom'

/** A stand-in for a DOM subtree: these tests run without a DOM. */
const rootWith = (elements: Record<string, object>) =>
  ({ querySelector: (selector: string) => elements[selector] ?? null }) as unknown as ParentNode

describe('finder', () => {
  it('finds the element a selector names under the root', () => {
    const status = { id: 'status' }
    const find = finder(rootWith({ '#status': status }))
    expect(find('#status')).toBe(status)
  })

  it('throws, naming the selector, when the markup lacks the element: the page builds its own markup, so that is a bug', () => {
    const find = finder(rootWith({}))
    expect(() => find('#missing')).toThrow('#missing')
  })
})

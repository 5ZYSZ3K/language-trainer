import { describe, expect, it } from 'vitest'
import { DEFAULT_DELAY_MS, parseCliOptions } from './cli-options'

describe('parseCliOptions', () => {
  it('uses the default delay and no force when given nothing', () => {
    expect(parseCliOptions([], {})).toEqual({ options: { force: false, delayMs: DEFAULT_DELAY_MS } })
  })

  it('reads --force', () => {
    expect(parseCliOptions(['--force'], {})).toEqual({ options: { force: true, delayMs: DEFAULT_DELAY_MS } })
  })

  it('reads the delay from --delay-ms, with a space or an equals sign', () => {
    expect(parseCliOptions(['--delay-ms', '4000'], {})).toEqual({ options: { force: false, delayMs: 4000 } })
    expect(parseCliOptions(['--delay-ms=2500', '--force'], {})).toEqual({ options: { force: true, delayMs: 2500 } })
  })

  it('accepts 0, for someone who really wants no pause', () => {
    expect(parseCliOptions(['--delay-ms', '0'], {})).toEqual({ options: { force: false, delayMs: 0 } })
  })

  it('reads the delay from SCRAPE_DELAY_MS, and lets the flag win over it', () => {
    expect(parseCliOptions([], { SCRAPE_DELAY_MS: '3000' })).toEqual({ options: { force: false, delayMs: 3000 } })
    expect(parseCliOptions(['--delay-ms', '500'], { SCRAPE_DELAY_MS: '3000' })).toEqual({
      options: { force: false, delayMs: 500 },
    })
  })

  it('treats an empty SCRAPE_DELAY_MS as not set', () => {
    expect(parseCliOptions([], { SCRAPE_DELAY_MS: '' })).toEqual({ options: { force: false, delayMs: DEFAULT_DELAY_MS } })
  })

  it.each(['abc', '-5', '1.5', '', '1e3'])('rejects %j as a delay', (value) => {
    const result = parseCliOptions(['--delay-ms', value], {})
    expect(result).toEqual({ error: expect.stringMatching(/--delay-ms must be a whole number/) })
  })

  it('rejects a bad SCRAPE_DELAY_MS, naming the variable', () => {
    expect(parseCliOptions([], { SCRAPE_DELAY_MS: 'soon' })).toEqual({
      error: expect.stringMatching(/SCRAPE_DELAY_MS must be a whole number/),
    })
  })

  it('does not look at SCRAPE_DELAY_MS when the flag is given', () => {
    expect(parseCliOptions(['--delay-ms', '100'], { SCRAPE_DELAY_MS: 'soon' })).toEqual({
      options: { force: false, delayMs: 100 },
    })
  })

  it('rejects --delay-ms without a value', () => {
    expect(parseCliOptions(['--delay-ms'], {})).toEqual({ error: expect.stringMatching(/needs a value/) })
  })

  it('rejects unknown arguments, listing them all', () => {
    expect(parseCliOptions(['--forse', '--delay', '5'], {})).toEqual({ error: 'Unknown argument: --forse --delay 5' })
  })
})

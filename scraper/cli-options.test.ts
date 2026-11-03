import { describe, expect, it } from 'vitest'
import { parseCliOptions } from './cli-options'

describe('parseCliOptions', () => {
  it("leaves the delay to the source's request policy, and no force, when given nothing", () => {
    expect(parseCliOptions([], {})).toEqual({ options: { force: false, delayMs: undefined, failCooldownMs: 0 } })
  })

  it('reads --force', () => {
    expect(parseCliOptions(['--force'], {})).toEqual({ options: { force: true, delayMs: undefined, failCooldownMs: 0 } })
  })

  it('reads the delay from --delay-ms, with a space or an equals sign', () => {
    expect(parseCliOptions(['--delay-ms', '4000'], {})).toEqual({ options: { force: false, delayMs: 4000, failCooldownMs: 0 } })
    expect(parseCliOptions(['--delay-ms=2500', '--force'], {})).toEqual({ options: { force: true, delayMs: 2500, failCooldownMs: 0 } })
  })

  it('accepts 0, for someone who really wants no pause', () => {
    expect(parseCliOptions(['--delay-ms', '0'], {})).toEqual({ options: { force: false, delayMs: 0, failCooldownMs: 0 } })
  })

  it('reads the delay from SCRAPE_DELAY_MS, and lets the flag win over it', () => {
    expect(parseCliOptions([], { SCRAPE_DELAY_MS: '3000' })).toEqual({ options: { force: false, delayMs: 3000, failCooldownMs: 0 } })
    expect(parseCliOptions(['--delay-ms', '500'], { SCRAPE_DELAY_MS: '3000' })).toEqual({
      options: { force: false, delayMs: 500, failCooldownMs: 0 },
    })
  })

  it('treats an empty SCRAPE_DELAY_MS as not set', () => {
    expect(parseCliOptions([], { SCRAPE_DELAY_MS: '' })).toEqual({ options: { force: false, delayMs: undefined, failCooldownMs: 0 } })
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
      options: { force: false, delayMs: 100, failCooldownMs: 0 },
    })
  })

  it('rejects --delay-ms without a value', () => {
    expect(parseCliOptions(['--delay-ms'], {})).toEqual({ error: expect.stringMatching(/needs a value/) })
  })

  it('rejects unknown arguments, listing them all', () => {
    expect(parseCliOptions(['--forse', '--delay', '5'], {})).toEqual({ error: 'Unknown argument: --forse --delay 5' })
  })

  describe('--fail-cooldown', () => {
    const cooldown = (ms: number) => ({ options: { force: false, delayMs: undefined, failCooldownMs: ms } })

    it('is off when not given', () => {
      expect(parseCliOptions([], {})).toEqual(cooldown(0))
    })

    it.each([
      ['500ms', 500],
      ['90s', 90_000],
      ['10m', 600_000],
      ['1h', 3_600_000],
      ['0s', 0],
    ])('reads %s', (value, ms) => {
      expect(parseCliOptions(['--fail-cooldown', value], {})).toEqual(cooldown(ms))
    })

    it('accepts an equals sign, and combines with the other flags in any order', () => {
      expect(parseCliOptions(['--fail-cooldown=2m'], {})).toEqual(cooldown(120_000))
      expect(parseCliOptions(['--fail-cooldown', '2m', '--force', '--delay-ms', '100'], {})).toEqual({
        options: { force: true, delayMs: 100, failCooldownMs: 120_000 },
      })
    })

    it.each(['600', '10 m', '1.5m', '-5s', '10min', 'soon', '', '--force'])('rejects %j, a number without a plain unit', (value) => {
      expect(parseCliOptions(['--fail-cooldown', value], {})).toEqual({
        error: expect.stringMatching(/--fail-cooldown must be a whole number with a unit/),
      })
    })

    it('rejects --fail-cooldown without a value', () => {
      expect(parseCliOptions(['--fail-cooldown'], {})).toEqual({ error: expect.stringMatching(/--fail-cooldown needs a value/) })
    })
  })

  describe('target filters', () => {
    it('reads --source, --language and --quiz, with a space or an equals sign', () => {
      expect(parseCliOptions(['--source', 'prirucka', '--language=cs', '--quiz', 'verb-present-tense'], {})).toEqual({
        options: { force: false, delayMs: undefined, failCooldownMs: 0, source: 'prirucka', language: 'cs', quizType: 'verb-present-tense' },
      })
    })

    it('leaves out the filters that are not given', () => {
      expect(parseCliOptions(['--source', 'prirucka'], {})).toEqual({
        options: { force: false, delayMs: undefined, failCooldownMs: 0, source: 'prirucka' },
      })
    })

    it.each(['--source', '--language', '--quiz'])('rejects %s without a value', (flag) => {
      expect(parseCliOptions([flag], {})).toEqual({ error: expect.stringContaining(`${flag} needs a value`) })
      expect(parseCliOptions([flag, '--force'], {})).toEqual({ error: expect.stringContaining(`${flag} needs a value`) })
    })
  })
})

import { getUiLanguage } from '../../i18n'
import { fillTexts } from '../../i18n/dom'
import { enableShortcuts, fillSpecialChars, finder, renderShortcutHelp, syncRoundActions } from '../../ui'
import type { QuizHost, QuizInstance } from '../quiz-type'
import { NUMERAL_GENERATORS } from './generators'
import { pickNumber, type NumberRange } from './ranges'
import { t, type NumeralsTextKey } from './texts'
import { findVersion, isRemarkCode, legendOf, parseRemark, sortVersions, type NumeralVersion } from './versions'

/** How many versions a list shows before "Show all". */
const VISIBLE_VERSIONS = 10

// The quiz's area of the page. The static texts are filled in by applyTexts() via the data-i18n attributes; the result
// (versions, remarks, legend) is drawn by renderResult(), which applyTexts() calls as well.
const AREA = `
  <main id="exercise" hidden>
    <p class="prompt"><span data-i18n="prompt.label"></span> <strong id="prompt"></strong></p>
    <div id="cell" class="cell" data-state="open">
      <label id="answer-label" for="answer" data-i18n="input.label"></label>
      <div class="row">
        <input id="answer" type="text" autocomplete="off" autocapitalize="none" spellcheck="false" autocorrect="off" />
        <button type="button" id="check" class="check" aria-describedby="answer-label" data-i18n="check"></button>
      </div>
    </div>
    <div id="chars" class="chars" role="group" data-i18n-label="chars.label"></div>
    <div class="actions">
      <button type="button" id="next"></button>
    </div>
    <section id="result" class="result" aria-live="polite" hidden>
      <p id="yours" class="yours"><span data-i18n="result.yours"></span> <strong id="yours-value"></strong> <span id="yours-remarks" class="remarks"></span></p>
      <h2 id="versions-title"></h2>
      <ul id="versions" class="versions"></ul>
      <button type="button" id="show-all" class="link"></button>
      <div id="legend" class="legend">
        <h3 data-i18n="legend.title"></h3>
        <dl id="legend-list"></dl>
        <p id="legend-parts" data-i18n="legend.parts"></p>
      </div>
    </section>
  </main>

  <section class="help" aria-labelledby="help-title">
    <h2 id="help-title" data-i18n="help.title"></h2>
    <ul id="help-list">
      <li data-i18n="help.versions"></li>
    </ul>
  </section>
`

type State = 'open' | 'correct' | 'wrong'

/**
 * One random number per round, to be written in words in one field. Any version the language's generator accepts is
 * correct; once checked, the page lists the versions (the learner's own first, if it was one of them) with their
 * remarks. Below the field, "Skip" gives another number unanswered; once the number is checked it becomes "Next number".
 * Records into the meter `numbers` (per checked number).
 */
export function mountNumerals(container: HTMLElement, host: QuizHost<NumberRange>): QuizInstance {
  const { items, language } = host
  container.innerHTML = AREA
  const find = finder(container)

  const exerciseEl = find('#exercise')
  const promptEl = find('#prompt')
  const cellEl = find('#cell')
  const inputEl = find<HTMLInputElement>('#answer')
  const checkEl = find<HTMLButtonElement>('#check')
  const nextEl = find<HTMLButtonElement>('#next')
  const resultEl = find('#result')
  const helpList = find('#help-list')
  promptEl.lang = language.htmlLang
  inputEl.lang = language.htmlLang

  const generate = NUMERAL_GENERATORS[language.id]
  // Czech typography leaves four-digit numbers ungrouped ("2137", but "21 375").
  const format = new Intl.NumberFormat(language.htmlLang, { useGrouping: 'min2' })

  let current: number | undefined
  /** Every version of `current`, in display order. */
  let versions: NumeralVersion[] = []
  let state: State = 'open'
  /** The version the learner typed, once checked; undefined when the answer was wrong. */
  let matched: NumeralVersion | undefined
  let expanded = false

  function applyTexts(): void {
    // The language's shortcut lines come first, then the quiz's own note (the static last list item).
    renderShortcutHelp(helpList, language.texts[getUiLanguage()].shortcutHelp)
    fillTexts(container, t)
    renderResult()
  }

  // ---- static controls --------------------------------------------------------------------------

  fillSpecialChars(find('#chars'), language, () => (inputEl.readOnly ? undefined : inputEl))
  enableShortcuts(inputEl, language.shortcuts)

  checkEl.addEventListener('click', () => {
    check()
    inputEl.focus()
  })
  nextEl.addEventListener('click', startRound)
  find('#show-all').addEventListener('click', () => {
    expanded = !expanded
    renderResult()
  })

  // Enter checks the open field; on a checked one it starts the next number.
  inputEl.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter') return
    event.preventDefault()
    if (state === 'open') check()
    else startRound()
  })

  // ---- rounds -----------------------------------------------------------------------------------

  function startRound(): void {
    if (!generate) return
    current = pickNumber(items, current, Math.random)
    versions = sortVersions(generate(current))
    state = 'open'
    matched = undefined
    expanded = false
    promptEl.textContent = format.format(current)
    inputEl.value = ''
    sync()
    inputEl.focus()
  }

  /** Checks the field once per round. An empty field counts as wrong: it is the way to see the answers. */
  function check(): void {
    if (state !== 'open') return
    matched = findVersion(inputEl.value, versions)
    state = matched ? 'correct' : 'wrong'
    host.record('numbers', state === 'correct')
    sync()
  }

  /** Mirrors the round's state into the DOM. */
  function sync(): void {
    cellEl.dataset.state = state
    inputEl.readOnly = state !== 'open'
    // Check is the button to press until the number is checked, then "Next number" (until then it reads "Skip").
    syncRoundActions(checkEl, nextEl, state !== 'open', t)
    renderResult()
  }

  // ---- result -----------------------------------------------------------------------------------

  function renderResult(): void {
    resultEl.hidden = state === 'open'
    if (state === 'open') return

    find('#yours').hidden = !matched
    find('#yours-value').textContent = matched?.value ?? ''
    find('#yours-value').lang = language.htmlLang
    find('#yours-remarks').replaceChildren(...(matched ? remarkTags(matched) : []))

    const listed = matched ? versions.filter((version) => version !== matched) : versions
    const shown = expanded ? listed : listed.slice(0, VISIBLE_VERSIONS)
    const titleKey: NumeralsTextKey = matched ? 'result.others' : 'result.all'
    const titleEl = find('#versions-title')
    titleEl.hidden = listed.length === 0
    titleEl.textContent = `${t(titleKey)} (${listed.length})`
    find('#versions').replaceChildren(...shown.map(versionItem))

    const toggle = find('#show-all')
    toggle.hidden = listed.length <= VISIBLE_VERSIONS
    toggle.textContent = expanded ? t('result.showFewer') : `${t('result.showAll')} (${listed.length})`
    toggle.setAttribute('aria-expanded', String(expanded))

    renderLegend(matched ? [matched, ...shown] : shown)
  }

  function versionItem(version: NumeralVersion): HTMLElement {
    const item = document.createElement('li')
    const value = document.createElement('span')
    value.className = 'version'
    value.lang = language.htmlLang
    value.textContent = version.value
    item.append(value, ...remarkTags(version))
    return item
  }

  /** One tag per remark: its label in the UI language, and the part of the number it is about in brackets. */
  function remarkTags(version: NumeralVersion): HTMLElement[] {
    return version.remarks.map((remark) => {
      const { code, part } = parseRemark(remark)
      const tag = document.createElement('span')
      tag.className = 'remark'
      tag.append(isRemarkCode(code) ? t(`remark.${code}`) : code)
      if (part !== undefined) {
        const partEl = document.createElement('span')
        partEl.lang = language.htmlLang
        partEl.textContent = part
        tag.append(' (', partEl, ')')
      }
      return tag
    })
  }

  /** Explains the remarks that `listed` shows, and the brackets if any remark has them. Hidden when there are none. */
  function renderLegend(listed: readonly NumeralVersion[]): void {
    const { codes, hasParts } = legendOf(listed)
    find('#legend').hidden = codes.length === 0
    find('#legend-parts').hidden = !hasParts
    find('#legend-list').replaceChildren(
      ...codes.map((code) => {
        const row = document.createElement('div')
        const term = document.createElement('dt')
        term.textContent = isRemarkCode(code) ? t(`remark.${code}`) : code
        const description = document.createElement('dd')
        description.textContent = isRemarkCode(code) ? t(`legend.${code}`) : ''
        row.append(term, description)
        return row
      }),
    )
  }

  // ---- start ------------------------------------------------------------------------------------

  applyTexts()
  if (items.length > 0 && generate) {
    exerciseEl.hidden = false
    startRound()
  }
  return { applyTexts }
}

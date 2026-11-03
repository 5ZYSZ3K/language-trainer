import type { Cell, Item } from '../../core/cell'
import { pickNext } from '../../core/pick'
import { Round } from '../../core/round'
import { getUiLanguage } from '../../i18n'
import { fillTexts } from '../../i18n/dom'
import { enableShortcuts, fillSpecialChars, finder, renderShortcutHelp } from '../../ui'
import type { QuizHost, QuizInstance } from '../quiz-type'
import { verbPresentCellLabelKeys } from './cells'
import { t } from './texts'

// The quiz's area of the page. All visible text is filled in by applyTexts() via the data-i18n attributes.
const AREA = `
  <main id="exercise" hidden>
    <p class="prompt"><span data-i18n="prompt.label"></span> <strong id="prompt"></strong></p>
    <div id="cells" class="cells"></div>
    <div id="chars" class="chars" role="group" data-i18n-label="chars.label"></div>
    <div class="actions">
      <button type="button" id="check-all" data-i18n="checkAll"></button>
      <button type="button" id="next" class="primary" data-i18n="next"></button>
    </div>
  </main>

  <section class="help" aria-labelledby="help-title">
    <h2 id="help-title" data-i18n="help.title"></h2>
    <ul id="help-list">
      <li data-i18n="help.reflexive"></li>
    </ul>
  </section>
`

/**
 * The type-in grid: one random verb per round, six cells to fill in, a Check button per cell, "Check all" and
 * "Next verb". Records into the meters `cells` (per checked cell) and `items` (per completed verb).
 */
export function mountVerbPresentTense(container: HTMLElement, host: QuizHost<Item>): QuizInstance {
  const { items, language } = host
  container.innerHTML = AREA
  const find = finder(container)

  const exerciseEl = find('#exercise')
  const promptEl = find('#prompt')
  const cellsEl = find('#cells')
  const helpList = find('#help-list')
  promptEl.lang = language.htmlLang

  let item: Item | undefined
  let round: Round
  let cellEls: HTMLElement[] = []
  let inputs: HTMLInputElement[] = []
  let lastFocused: HTMLInputElement | undefined

  function applyTexts(): void {
    // The language's shortcut lines come first, then the quiz's own note (the static last list item).
    renderShortcutHelp(helpList, language.texts[getUiLanguage()].shortcutHelp)
    fillTexts(container, t)
  }

  // ---- static controls --------------------------------------------------------------------------

  // Characters go into the field last typed in, or the first one still open.
  fillSpecialChars(find('#chars'), language, () =>
    lastFocused && lastFocused.isConnected && !lastFocused.readOnly
      ? lastFocused
      : inputs.find((input) => !input.readOnly),
  )

  find('#check-all').addEventListener('click', () => {
    round.checkAll(inputs.map((input) => input.value))
    cellEls.forEach((_, i) => syncCell(i))
  })
  find('#next').addEventListener('click', startRound)

  // ---- rounds -----------------------------------------------------------------------------------

  function startRound(): void {
    item = pickNext(items, item, Math.random)
    round = new Round(item, {
      cellChecked: (correct) => host.record('cells', correct),
      itemCompleted: (fullyCorrect) => host.record('items', fullyCorrect),
    })
    promptEl.textContent = item.prompt
    cellEls = item.cells.map(buildCell)
    cellsEl.replaceChildren(...cellEls)
    inputs = cellEls.map((el) => el.querySelector('input')!)
    lastFocused = undefined
    inputs[0]?.focus()
  }

  function buildCell(cell: Cell, index: number): HTMLElement {
    const wrap = document.createElement('div')
    wrap.className = 'cell'
    wrap.dataset.state = 'open'

    const label = document.createElement('label')
    label.id = `cell-label-${index}`
    label.htmlFor = `cell-${index}`
    const labelKey = verbPresentCellLabelKeys[cell.id]!
    label.dataset.i18n = labelKey
    label.textContent = t(labelKey)

    const input = document.createElement('input')
    input.id = `cell-${index}`
    input.type = 'text'
    input.lang = language.htmlLang
    input.autocomplete = 'off'
    input.autocapitalize = 'none'
    input.spellcheck = false
    input.setAttribute('autocorrect', 'off')
    input.addEventListener('focus', () => (lastFocused = input))
    enableShortcuts(input, language.shortcuts)
    input.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter') return
      event.preventDefault()
      checkOne(index)
      focusNextOpen(index)
    })

    const button = document.createElement('button')
    button.type = 'button'
    button.className = 'check'
    button.dataset.i18n = 'check'
    button.textContent = t('check')
    button.setAttribute('aria-describedby', label.id)
    button.addEventListener('click', () => checkOne(index))

    const row = document.createElement('div')
    row.className = 'row'
    row.append(input, button)

    const answer = document.createElement('div')
    answer.className = 'answer'
    answer.hidden = true
    answer.lang = language.htmlLang

    wrap.append(label, row, answer)
    return wrap
  }

  function checkOne(index: number): void {
    round.checkCell(index, inputs[index]!.value)
    // An empty check is ignored by the round; send the user back to the field instead.
    if (round.state(index) === 'open') inputs[index]!.focus()
    syncCell(index)
  }

  /** Mirrors the round's state for one cell into the DOM. */
  function syncCell(index: number): void {
    const state = round.state(index)
    const wrap = cellEls[index]!
    wrap.dataset.state = state
    inputs[index]!.readOnly = state !== 'open'
    wrap.querySelector<HTMLButtonElement>('.check')!.disabled = state !== 'open'
    const answer = wrap.querySelector<HTMLElement>('.answer')!
    answer.hidden = state !== 'wrong'
    answer.textContent = state === 'wrong' ? item!.cells[index]!.acceptedForms.join(' / ') : ''
  }

  function focusNextOpen(from: number): void {
    const open = inputs.findIndex((_, i) => i > from && round.state(i) === 'open')
    inputs[open === -1 ? inputs.findIndex((_, i) => round.state(i) === 'open') : open]?.focus()
  }

  // ---- start ------------------------------------------------------------------------------------

  applyTexts()
  if (items.length > 0) {
    exerciseEl.hidden = false
    startRound()
  }
  return { applyTexts }
}

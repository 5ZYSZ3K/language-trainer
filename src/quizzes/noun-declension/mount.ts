import type { Cell, Item } from '../../core/cell'
import { pickNext } from '../../core/pick'
import { Round } from '../../core/round'
import { getUiLanguage } from '../../i18n'
import { fillTexts } from '../../i18n/dom'
import { enableShortcuts, fillSpecialChars, finder, renderShortcutHelp } from '../../ui'
import type { QuizHost, QuizInstance } from '../quiz-type'
import { nounCaseLabelKey, nounNumberLabelKey, nounNumbers, partsOf, type GrammaticalNumber } from './cells'
import { createFilterDialog } from './filter-dialog'
import { practiceOf, readFilter, saveFilter, type CellFilter, type Practice } from './filter'
import { t } from './texts'

// The quiz's area of the page. All visible text is filled in by applyTexts() via the data-i18n attributes.
const AREA = `
  <main id="exercise" hidden>
    <p class="prompt" id="prompt-line"><span data-i18n="prompt.label"></span> <strong id="prompt"></strong></p>
    <div id="cells" class="columns"></div>
    <div id="chars" class="chars" role="group" data-i18n-label="chars.label"></div>
    <div class="actions">
      <button type="button" id="filters" data-i18n="filters.open"></button>
      <button type="button" id="check-all" data-i18n="checkAll"></button>
      <button type="button" id="next" class="primary" data-i18n="next"></button>
    </div>
  </main>

  <dialog id="filter-dialog" class="filters"></dialog>

  <section class="help" aria-labelledby="help-title">
    <h2 id="help-title" data-i18n="help.title"></h2>
    <ul id="help-list"></ul>
  </section>
`

const NO_EVENTS = { cellChecked: () => {}, itemCompleted: () => {} }

/**
 * The type-in table: one random noun per round, a field for each form the filter asks for, a Check button per field,
 * "Check all", "Filters" and "Next noun". The first form (the nominative singular, or plural for a noun without a
 * singular) is put in the table locked, as given. Records into the meters `cells` (per checked field) and `items` (per
 * completed noun). If the filter leaves nothing to ask for, the area shows no noun, just the three buttons.
 */
export function mountNounDeclension(container: HTMLElement, host: QuizHost<Item>): QuizInstance {
  const { items, language } = host
  container.innerHTML = AREA
  const find = finder(container)

  const exerciseEl = find('#exercise')
  const promptLine = find('#prompt-line')
  const promptEl = find('#prompt')
  const cellsEl = find('#cells')
  const charsEl = find('#chars')
  const helpList = find('#help-list')
  const checkAllEl = find<HTMLButtonElement>('#check-all')
  promptEl.lang = language.htmlLang

  let filter: CellFilter = readFilter(host.settings.get())
  let item: Item | undefined
  let practice: Practice = { asked: [], shown: [] }
  let round = new Round({ prompt: '', cells: [] }, NO_EVENTS)
  // The fields and their wrappers, one per asked cell and in the same order, so an index means the same cell as in `round`.
  let cellEls: HTMLElement[] = []
  let inputs: HTMLInputElement[] = []
  let lastFocused: HTMLInputElement | undefined

  const filterDialog = createFilterDialog(find<HTMLDialogElement>('#filter-dialog'), (chosen) => {
    filter = chosen
    host.settings.set(saveFilter(filter))
    startRound()
  })

  function applyTexts(): void {
    // The language's shortcut lines are the whole list: this quiz has no notes of its own.
    renderShortcutHelp(helpList, language.texts[getUiLanguage()].shortcutHelp)
    fillTexts(container, t)
    filterDialog.applyTexts()
  }

  // ---- static controls --------------------------------------------------------------------------

  // Characters go into the field last typed in, or the first one still open.
  fillSpecialChars(charsEl, language, () =>
    lastFocused && lastFocused.isConnected && !lastFocused.readOnly ? lastFocused : inputs.find((input) => !input.readOnly),
  )

  find('#filters').addEventListener('click', () => filterDialog.open(filter))
  checkAllEl.addEventListener('click', () => {
    round.checkAll(inputs.map((input) => input.value))
    cellEls.forEach((_, i) => syncCell(i))
    syncCheckAll()
  })
  find('#next').addEventListener('click', startRound)

  // Enter on a finished round starts the next noun, wherever in the exercise the focus is. This listens while the event
  // is still on its way down (capture), before any field or button sees it: so the Enter that checks the last cell
  // (round not complete yet) is left to the field, and only a later Enter gets here with the round complete.
  exerciseEl.addEventListener(
    'keydown',
    (event) => {
      if (event.key !== 'Enter' || !round.complete) return
      // Stop here: the old fields are about to be replaced, and a button must not also be activated by this Enter.
      event.preventDefault()
      event.stopPropagation()
      startRound()
    },
    true,
  )

  // ---- rounds -----------------------------------------------------------------------------------

  function startRound(): void {
    // Only nouns with something to ask under the current filter come up.
    const eligible = items.filter((candidate) => practiceOf(candidate, filter).asked.length > 0)
    item = eligible.length > 0 ? pickNext(eligible, item, Math.random) : undefined
    practice = item ? practiceOf(item, filter) : { asked: [], shown: [] }
    round = new Round(
      { prompt: item?.prompt ?? '', cells: practice.asked },
      item
        ? {
            cellChecked: (correct) => host.record('cells', correct),
            itemCompleted: (fullyCorrect) => host.record('items', fullyCorrect),
          }
        : NO_EVENTS,
    )

    promptLine.hidden = !item
    cellsEl.hidden = !item
    charsEl.hidden = !item
    promptEl.textContent = item?.prompt ?? ''

    cellEls = []
    inputs = []
    lastFocused = undefined
    cellsEl.replaceChildren(...nounNumbers.flatMap(buildColumn))
    syncCheckAll()
    inputs[0]?.focus()
  }

  /** The column of one number: a heading and its shown cells; nothing at all if the noun has none to show. */
  function buildColumn(number: GrammaticalNumber): HTMLElement[] {
    const cells = practice.shown.filter((cell) => partsOf(cell.id)?.number === number)
    if (cells.length === 0) return []

    const column = document.createElement('section')
    column.className = 'column'
    const heading = document.createElement('h3')
    heading.id = `column-${number}`
    heading.dataset.i18n = nounNumberLabelKey(number)
    heading.textContent = t(nounNumberLabelKey(number))
    column.setAttribute('aria-labelledby', heading.id)
    column.append(heading, ...cells.map(buildCell))
    return [column]
  }

  function buildCell(cell: Cell): HTMLElement {
    const index = practice.asked.indexOf(cell)
    const given = index === -1
    const wrap = document.createElement('div')
    wrap.className = 'cell'
    wrap.dataset.state = given ? 'given' : 'open'

    const label = document.createElement('label')
    label.id = `cell-label-${cell.id}`
    label.htmlFor = `cell-${cell.id}`
    const labelKey = nounCaseLabelKey(partsOf(cell.id)!.caseId)
    label.dataset.i18n = labelKey
    label.textContent = t(labelKey)

    const input = document.createElement('input')
    input.id = `cell-${cell.id}`
    input.type = 'text'
    input.lang = language.htmlLang
    input.autocomplete = 'off'
    input.autocapitalize = 'none'
    input.spellcheck = false
    input.setAttribute('autocorrect', 'off')

    const row = document.createElement('div')
    row.className = 'row'

    // Shown once the cell is checked, right or wrong: every accepted form, so a correct variant also teaches the others.
    // Hidden by CSS (not the hidden attribute) while the cell is open, so its line stays reserved and the row doesn't grow.
    const answer = document.createElement('div')
    answer.className = 'answer'
    const answerLabel = document.createElement('span')
    answerLabel.className = 'answer-label'
    answerLabel.dataset.i18n = 'answer.label'
    answerLabel.textContent = t('answer.label')
    const answerForms = document.createElement('strong')
    answerForms.className = 'answer-forms'
    answerForms.lang = language.htmlLang
    answer.append(answerLabel, ' ', answerForms)

    if (given) {
      // The form the learner starts from: locked, kept out of the tab order, never checked or scored.
      input.value = cell.acceptedForms[0] ?? ''
      input.readOnly = true
      input.tabIndex = -1
      const tag = document.createElement('span')
      tag.className = 'given-tag'
      tag.dataset.i18n = 'given.label'
      tag.textContent = t('given.label')
      row.append(input, tag)
    } else {
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
      row.append(input, button)
      cellEls[index] = wrap
      inputs[index] = input
    }
    wrap.append(label, row, answer)
    return wrap
  }

  function checkOne(index: number): void {
    round.checkCell(index, inputs[index]!.value)
    // An empty check is ignored by the round; send the user back to the field instead.
    if (round.state(index) === 'open') inputs[index]!.focus()
    syncCell(index)
    syncCheckAll()
  }

  /** Mirrors the round's state for one cell into the DOM. */
  function syncCell(index: number): void {
    const state = round.state(index)
    const wrap = cellEls[index]!
    wrap.dataset.state = state
    inputs[index]!.readOnly = state !== 'open'
    wrap.querySelector<HTMLButtonElement>('.check')!.disabled = state !== 'open'
    wrap.querySelector<HTMLElement>('.answer-forms')!.textContent =
      state === 'open' ? '' : practice.asked[index]!.acceptedForms.join(' / ')
  }

  /** "Check all" is only there to use while some field is still open: not with nothing to ask, nor once everything is checked. */
  function syncCheckAll(): void {
    checkAllEl.disabled = round.complete
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

import type { Cell, Item } from '../../core/cell'
import { Round } from '../../core/round'
import { getUiLanguage } from '../../i18n'
import { fillTexts } from '../../i18n/dom'
import { createGoTo, enableShortcuts, fillSpecialChars, finder, renderShortcutHelp, syncRoundActions } from '../../ui'
import type { QuizHost, QuizInstance } from '../quiz-type'
import { nounCaseLabelKey, nounNumberLabelKey, nounNumbers, partsOf, type GrammaticalNumber } from './cells'
import { createFilterDialog } from './filter-dialog'
import { pickNoun, practiceOf, readFilter, saveFilter, type CellFilter, type Practice } from './filter'
import { t } from './texts'

// The quiz's area of the page. All visible text is filled in by applyTexts() via the data-i18n attributes.
const AREA = `
  <main id="exercise" hidden>
    <p class="prompt"><span data-i18n="prompt.label"></span> <strong id="prompt"></strong></p>
    <p id="nothing" class="nothing" data-i18n="nothing" hidden></p>
    <div id="cells" class="columns"></div>
    <div id="chars" class="chars" role="group" data-i18n-label="chars.label"></div>
    <div class="actions">
      <button type="button" id="filters" data-i18n="filters.open"></button>
      <button type="button" id="check-all" data-i18n="checkAll"></button>
      <button type="button" id="next"></button>
    </div>
    <form id="go-to" class="go-to"></form>
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
 * "Check all", "Filters" and "Skip", which turns into "Next noun" once every field is checked. The first form (the nominative singular, or plural for a noun without a
 * singular) is put in the table locked, as given. Records into the meters `cells` (per checked field) and `items` (per
 * completed noun). A noun the filter leaves nothing to ask for is still shown, with a message instead of fields; that
 * happens to a random noun only when no noun has anything to ask. Changing the filter starts the same noun again. Under
 * the buttons, a line to open a noun by its dictionary form, whatever the filter.
 */
export function mountNounDeclension(container: HTMLElement, host: QuizHost<Item>): QuizInstance {
  const { items, language } = host
  container.innerHTML = AREA
  const find = finder(container)

  const exerciseEl = find('#exercise')
  const promptEl = find('#prompt')
  const cellsEl = find('#cells')
  const nothingEl = find('#nothing')
  const charsEl = find('#chars')
  const helpList = find('#help-list')
  const checkAllEl = find<HTMLButtonElement>('#check-all')
  const nextEl = find<HTMLButtonElement>('#next')
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
    startRound(item)
  })

  function applyTexts(): void {
    // The language's shortcut lines are the whole list: this quiz has no notes of its own.
    renderShortcutHelp(helpList, language.texts[getUiLanguage()].shortcutHelp)
    fillTexts(container, t)
    filterDialog.applyTexts()
    goTo.applyTexts()
  }

  // ---- static controls --------------------------------------------------------------------------

  const goToEl = find<HTMLFormElement>('#go-to')
  const goTo = createGoTo(goToEl, items, language, t, (found) => startRound(found))
  goTo.input.addEventListener('focus', () => (lastFocused = goTo.input))

  // Characters go into the field last typed in (the go-to field included), or the first one still open.
  fillSpecialChars(charsEl, language, () =>
    lastFocused && lastFocused.isConnected && !lastFocused.readOnly ? lastFocused : inputs.find((input) => !input.readOnly),
  )

  find('#filters').addEventListener('click', () => filterDialog.open(filter))
  checkAllEl.addEventListener('click', () => {
    round.checkAll(inputs.map((input) => input.value))
    cellEls.forEach((_, i) => syncCell(i))
    syncActions()
  })
  nextEl.addEventListener('click', () => startRound())

  // Enter on a finished round starts the next noun, wherever in the exercise the focus is. This listens while the event
  // is still on its way down (capture), before any field or button sees it: so the Enter that checks the last cell
  // (round not complete yet) is left to the field, and only a later Enter gets here with the round complete. An Enter in
  // the go-to line is always left to it.
  exerciseEl.addEventListener(
    'keydown',
    (event) => {
      if (event.key !== 'Enter' || !round.complete || goToEl.contains(event.target as Node)) return
      // Stop here: the old fields are about to be replaced, and a button must not also be activated by this Enter.
      event.preventDefault()
      event.stopPropagation()
      startRound()
    },
    true,
  )

  // ---- rounds -----------------------------------------------------------------------------------

  /** Starts a round on `next`, or on a random noun (see pickNoun) if none is given. */
  function startRound(next?: Item): void {
    const noun = next ?? pickNoun(items, filter, item, Math.random)
    item = noun
    practice = practiceOf(noun, filter)
    // A round with nothing to ask is complete from the start, so it never reports anything to the scores.
    round = new Round(
      { prompt: noun.prompt, cells: practice.asked },
      {
        cellChecked: (correct) => host.record('cells', correct),
        itemCompleted: (fullyCorrect) => host.record('items', fullyCorrect),
      },
    )

    // With nothing to ask, the noun stays in the prompt (what the filters would ask of it) and a message replaces the fields.
    const nothingAsked = practice.asked.length === 0
    nothingEl.hidden = !nothingAsked
    cellsEl.hidden = nothingAsked
    promptEl.textContent = noun.prompt

    cellEls = []
    inputs = []
    lastFocused = undefined
    cellsEl.replaceChildren(...(nothingAsked ? [] : nounNumbers.flatMap(buildColumn)))
    syncActions()
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
    syncActions()
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
  function syncActions(): void {
    syncRoundActions(checkAllEl, nextEl, round.complete, t)
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

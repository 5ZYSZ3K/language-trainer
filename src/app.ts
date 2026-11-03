import type { Cell, ExerciseData, Item } from './core/cell'
import { pickNext } from './core/pick'
import { Round } from './core/round'
import { Scores, type StorageLike } from './core/scores'
import { applyShortcut } from './core/shortcuts'
import { poolKey, type Pool } from './datasets/pool'
import { getLanguage, languageLabel, setLanguage, t, UI_LANGUAGES, type TranslationKey } from './i18n'
import type { Language } from './languages'
import type { QuizType } from './quizzes'

export interface AppDeps {
  quizType: QuizType<unknown>
  /** What is being practised; its key is what scores are kept under. */
  pool: Pool
  /** The language being learned: its characters, typing shortcuts and `lang` attribute. */
  language: Language
  /** The text key of the visible label for each cell id; data carries only the ids. */
  cellLabelKeys: Readonly<Record<string, TranslationKey>>
  storage: StorageLike
  loadData: () => Promise<ExerciseData>
}

// All visible text is filled in from the dictionaries by applyTexts() via the data-i18n attributes.
const SHELL = `
  <header class="top">
    <h1 data-i18n="app.title"></h1>
    <div class="lang" role="group" data-i18n-label="language.label"></div>
  </header>
  <p class="intro" data-i18n="app.intro"></p>

  <section class="scores" aria-labelledby="scores-title">
    <h2 id="scores-title" data-i18n="scores.title"></h2>
    <dl></dl>
    <button type="button" class="link" id="reset" data-i18n="scores.reset"></button>
  </section>

  <p id="status" role="status"></p>

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

export async function mountApp(
  root: HTMLElement,
  { quizType, pool, language, cellLabelKeys, storage, loadData }: AppDeps,
): Promise<void> {
  root.innerHTML = SHELL
  const find = <E extends HTMLElement>(selector: string) => root.querySelector<E>(selector)!

  const scores = new Scores(storage)
  const scoreKey = poolKey(pool)
  const statusEl = find('#status')
  const exerciseEl = find('#exercise')
  const promptEl = find('#prompt')
  const cellsEl = find('#cells')
  promptEl.lang = language.htmlLang

  let items: Item[] = []
  let item: Item | undefined
  let round: Round
  let cellEls: HTMLElement[] = []
  let inputs: HTMLInputElement[] = []
  let lastFocused: HTMLInputElement | undefined

  // ---- text -------------------------------------------------------------------------------------

  function applyTexts(): void {
    document.documentElement.lang = getLanguage()
    document.title = t('app.title')
    renderShortcutHelp()
    root.querySelectorAll<HTMLElement>('[data-i18n]').forEach((el) => {
      el.textContent = t(el.dataset.i18n as TranslationKey)
    })
    root.querySelectorAll<HTMLElement>('[data-i18n-label]').forEach((el) => {
      el.setAttribute('aria-label', t(el.dataset.i18nLabel as TranslationKey))
    })
    root.querySelectorAll<HTMLButtonElement>('[data-lang]').forEach((button) => {
      button.setAttribute('aria-pressed', String(button.dataset.lang === getLanguage()))
    })
  }

  /** The language's shortcut lines come first, then the quiz's own note (the static last list item). */
  function renderShortcutHelp(): void {
    const list = find('#help-list')
    list.querySelectorAll('[data-shortcut-help]').forEach((item) => item.remove())
    const lines = language.texts[getLanguage()].shortcutHelp.map((line) => {
      const item = document.createElement('li')
      item.dataset.shortcutHelp = ''
      item.textContent = line
      return item
    })
    list.prepend(...lines)
  }

  function showStatus(key: TranslationKey | null): void {
    statusEl.hidden = key === null
    if (key) statusEl.dataset.i18n = key
    else delete statusEl.dataset.i18n
    statusEl.textContent = key ? t(key) : ''
  }

  /** One row per meter of the quiz type, in its order: the meter's label and the pool's correct/total. */
  function buildScoreRows(): void {
    find('.scores dl').replaceChildren(
      ...quizType.meters.map((meter) => {
        const label = document.createElement('dt')
        label.dataset.i18n = meter.label
        const value = document.createElement('dd')
        value.id = `score-${meter.id}`
        const row = document.createElement('div')
        row.append(label, value)
        return row
      }),
    )
  }

  function renderScores(): void {
    const poolScores = scores.get(scoreKey)
    for (const meter of quizType.meters) {
      const { correct, total } = poolScores[meter.id] ?? { correct: 0, total: 0 }
      find(`#score-${meter.id}`).textContent = `${correct}/${total}`
    }
  }

  // ---- header and static controls --------------------------------------------------------------

  buildScoreRows()

  const langGroup = find('.lang')
  for (const uiLanguage of UI_LANGUAGES) {
    const button = document.createElement('button')
    button.type = 'button'
    button.dataset.lang = uiLanguage
    button.textContent = languageLabel(uiLanguage)
    button.addEventListener('click', () => {
      setLanguage(uiLanguage, storage)
      applyTexts()
    })
    langGroup.append(button)
  }

  find('#reset').addEventListener('click', () => {
    if (window.confirm(t('scores.resetConfirm'))) {
      scores.reset()
      renderScores()
    }
  })

  const charsEl = find('#chars')
  for (const char of language.specialChars) {
    const button = document.createElement('button')
    button.type = 'button'
    button.textContent = char
    button.lang = language.htmlLang
    // Keep the focus (and caret) in the text field the user is typing in.
    button.addEventListener('mousedown', (event) => event.preventDefault())
    button.addEventListener('click', () => insertChar(char))
    charsEl.append(button)
  }

  find('#check-all').addEventListener('click', () => {
    round.checkAll(inputs.map((input) => input.value))
    cellEls.forEach((_, i) => syncCell(i))
    renderScores()
  })
  find('#next').addEventListener('click', startRound)

  // ---- rounds -----------------------------------------------------------------------------------

  function startRound(): void {
    item = pickNext(items, item, Math.random)
    // The meter ids are the ones verb-present-tense declares; the quiz moves out of this file in a later step.
    round = new Round(item, {
      cellChecked: (correct) => scores.record(scoreKey, 'cells', correct),
      itemCompleted: (fullyCorrect) => scores.record(scoreKey, 'items', fullyCorrect),
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
    const labelKey = cellLabelKeys[cell.id]!
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
    input.addEventListener('input', (event) => onInput(event as InputEvent, input))
    input.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter') return
      event.preventDefault()
      checkOne(index)
      focusNextOpen(index)
    })

    const button = document.createElement('button')
    button.type = 'button'
    button.className = 'check'
    button.dataset.i18n = 'cell.check'
    button.textContent = t('cell.check')
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
    renderScores()
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

  // ---- typing -----------------------------------------------------------------------------------

  function onInput(event: InputEvent, input: HTMLInputElement): void {
    // Only plain typing triggers shortcuts: not deleting, pasting or IME composition.
    if (event.inputType !== 'insertText' || event.isComposing) return
    const caret = input.selectionStart ?? input.value.length
    const edit = applyShortcut(input.value, caret, language.shortcuts)
    if (edit.value === input.value) return
    input.value = edit.value
    input.setSelectionRange(edit.caret, edit.caret)
  }

  function insertChar(char: string): void {
    const target =
      lastFocused && lastFocused.isConnected && !lastFocused.readOnly
        ? lastFocused
        : inputs.find((input) => !input.readOnly)
    if (!target) return
    const start = target.selectionStart ?? target.value.length
    const end = target.selectionEnd ?? start
    target.setRangeText(char, start, end, 'end')
    target.focus()
  }

  // ---- start ------------------------------------------------------------------------------------

  applyTexts()
  renderScores()
  showStatus('status.loading')
  try {
    items = (await loadData()).items
  } catch {
    showStatus('status.loadError')
    return
  }
  if (items.length === 0) {
    showStatus('status.empty')
    return
  }
  showStatus(null)
  exerciseEl.hidden = false
  startRound()
}

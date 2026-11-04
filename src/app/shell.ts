import { Scores, type StorageLike } from '../core/scores'
import { Settings } from '../core/settings'
import { poolKey, type Pool } from '../datasets/pool'
import { createT, getUiLanguage, joinTexts, uiLanguageLabel, setUiLanguage, shellTexts, UI_LANGUAGES } from '../i18n'
import { fillTexts } from '../i18n/dom'
import type { QuizInstance } from '../quizzes'
import { choose, type Choice, type Registries } from '../selection'
import { finder } from '../ui'
import { loadPoolChoice, savePoolChoice } from './pool-choice'

export interface ShellDeps {
  /** What can be practised. The page opens on the pool the learner chose last, else on the default one. */
  registries: Registries
  storage: StorageLike
  /** A pool's dataset. The shell only hands its items to the quiz. */
  loadData: (pool: Pool) => Promise<{ items: readonly unknown[] }>
}

// All visible text is filled in from the dictionaries by applyTexts() via the data-i18n attributes. `language.*`,
// `selector.*` and `scores.*` are the shell's own texts; `title`, `intro` (and the meter labels and the `empty` status)
// are the quiz type's, shown here on its behalf. The quiz owns everything inside #quiz.
const SHELL = `
  <header class="top">
    <h1 data-i18n="title"></h1>
    <div class="lang" role="group" data-i18n-label="language.label"></div>
  </header>
  <div class="selector" id="selector" hidden></div>
  <p class="intro" data-i18n="intro"></p>

  <section class="scores" aria-labelledby="scores-title">
    <h2 id="scores-title" data-i18n="scores.title"></h2>
    <dl></dl>
    <button type="button" class="link" id="reset" data-i18n="scores.reset"></button>
  </section>

  <p id="status" role="status"></p>

  <div id="quiz"></div>
`

/** One button of a selector group. */
interface Option {
  label: string
  active: boolean
  choose(): void
}

/**
 * The page around a quiz: header with the UI-language switch, the selector (a group of buttons each for the learned
 * language, the source and the quiz, shown only where there is something to choose between), the scores panel
 * (drawn from the quiz type's meters), the status line, and the container the quiz is mounted into once the pool's
 * items are loaded. Choosing something else in the selector opens that pool in place, and is remembered.
 */
export async function mountShell(root: HTMLElement, { registries, storage, loadData }: ShellDeps): Promise<void> {
  const first = choose(registries, loadPoolChoice(storage))
  if (!first) throw new Error('No pool is registered, so there is nothing to practise.')
  let choice: Choice = first

  root.innerHTML = SHELL
  const find = finder(root)

  const scores = new Scores(storage)
  const settings = new Settings(storage)
  // What the current pool uses; `openChoice` sets them again whenever the learner chooses another.
  let scoreKey: string
  let text: (key: string) => string
  const statusEl = find('#status')
  const quizEl = find('#quiz')
  const selectorEl = find('#selector')
  let quiz: QuizInstance | undefined

  // ---- text -------------------------------------------------------------------------------------

  function applyTexts(): void {
    document.documentElement.lang = getUiLanguage()
    document.title = text('title')
    fillTexts(root, text, quizEl)
    root.querySelectorAll<HTMLButtonElement>('[data-lang]').forEach((button) => {
      button.setAttribute('aria-pressed', String(button.dataset.lang === getUiLanguage()))
    })
    renderSelector()
    quiz?.applyTexts()
  }

  function showStatus(key: 'status.loading' | 'status.loadError' | 'empty' | null): void {
    statusEl.hidden = key === null
    if (key) statusEl.dataset.i18n = key
    else delete statusEl.dataset.i18n
    statusEl.textContent = key ? text(key) : ''
  }

  /** One row per meter of the quiz type, in its order: the meter's label and the pool's correct/total. */
  function buildScoreRows(): void {
    find('.scores dl').replaceChildren(
      ...choice.quiz.quizType.meters.map((meter) => {
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
    for (const meter of choice.quiz.quizType.meters) {
      const { correct, total } = poolScores[meter.id] ?? { correct: 0, total: 0 }
      find(`#score-${meter.id}`).textContent = `${correct}/${total}`
    }
  }

  // ---- selector ---------------------------------------------------------------------------------

  function switchTo(change: Partial<Pool>): void {
    const next = choose(registries, { ...choice.quiz.pool, ...change })
    if (!next) return
    savePoolChoice(storage, next.quiz.pool)
    void openChoice(next)
  }

  /** A labelled group of buttons, one per option, of which the active one is pressed. */
  function optionGroup(labelKey: string, options: readonly Option[]): HTMLElement {
    const group = document.createElement('div')
    group.className = 'choice'
    group.setAttribute('role', 'group')
    group.setAttribute('aria-label', text(labelKey))
    for (const option of options) {
      const button = document.createElement('button')
      button.type = 'button'
      button.textContent = option.label
      button.setAttribute('aria-pressed', String(option.active))
      button.addEventListener('click', () => {
        if (!option.active) option.choose()
      })
      group.append(button)
    }
    return group
  }

  /**
   * Draws the groups that have a choice in them: the learned language, then the source, then the quiz. They are
   * redrawn on every choice and on every change of the UI language, whose names they show.
   */
  function renderSelector(): void {
    const uiLanguage = getUiLanguage()
    const { selection, language, source, quiz: chosen } = choice
    const groups: HTMLElement[] = []
    if (selection.languages.length > 1) {
      groups.push(
        optionGroup(
          'selector.language',
          selection.languages.map((option) => ({
            label: option.texts[uiLanguage].name,
            active: option === language,
            choose: () => switchTo({ language: option.id }),
          })),
        ),
      )
    }
    if (selection.sources.length > 1) {
      groups.push(
        optionGroup(
          'selector.source',
          selection.sources.map((option) => ({
            label: option.source.name,
            active: option === source,
            choose: () => switchTo({ source: option.source.id }),
          })),
        ),
      )
    }
    if (source.quizzes.length > 1) {
      groups.push(
        optionGroup(
          'selector.quiz',
          source.quizzes.map((option) => ({
            label: option.quizType.texts[uiLanguage].name,
            active: option === chosen,
            choose: () => switchTo({ quizType: option.quizType.id }),
          })),
        ),
      )
    }
    selectorEl.replaceChildren(...groups)
    selectorEl.hidden = groups.length === 0
  }

  // ---- header and static controls --------------------------------------------------------------

  const langGroup = find('.lang')
  for (const uiLanguage of UI_LANGUAGES) {
    const button = document.createElement('button')
    button.type = 'button'
    button.dataset.lang = uiLanguage
    button.textContent = uiLanguageLabel(uiLanguage)
    button.addEventListener('click', () => {
      setUiLanguage(uiLanguage, storage)
      applyTexts()
    })
    langGroup.append(button)
  }

  find('#reset').addEventListener('click', () => {
    if (window.confirm(text('scores.resetConfirm'))) {
      scores.reset()
      renderScores()
    }
  })

  // ---- pools ------------------------------------------------------------------------------------

  /** (Re)builds the quiz in its container. Without items it shows no exercise, only what surrounds one (its help). */
  function mountQuiz(items: readonly unknown[]): void {
    const { quizType } = choice.quiz
    const key = scoreKey
    quiz = quizType.mount(quizEl, {
      items,
      pool: key,
      language: choice.language,
      settings: { get: () => settings.get(key), set: (value) => settings.set(key, value) },
      record(meterId, correct) {
        scores.record(key, meterId, correct)
        renderScores()
      },
    })
  }

  /** Bumped by every opened pool, so that a dataset that arrives after the learner moved on is dropped. */
  let opened = 0

  /** Makes `next` the pool on the page: its texts, meters and scores first, then its quiz once the dataset is loaded. */
  async function openChoice(next: Choice): Promise<void> {
    const mine = ++opened
    choice = next
    const { pool, quizType } = next.quiz
    scoreKey = poolKey(pool)
    text = createT(joinTexts(shellTexts, quizType.texts))
    quiz = undefined
    buildScoreRows()
    applyTexts()
    renderScores()
    showStatus('status.loading')
    // While the dataset loads (and if it fails or is empty) the quiz is mounted with no items.
    mountQuiz([])
    let items: readonly unknown[]
    try {
      items = (await loadData(pool)).items
    } catch {
      if (mine === opened) showStatus('status.loadError')
      return
    }
    if (mine !== opened) return
    if (items.length === 0) {
      showStatus('empty')
      return
    }
    showStatus(null)
    mountQuiz(items)
  }

  await openChoice(first)
}

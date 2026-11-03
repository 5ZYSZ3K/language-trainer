import { Scores, type StorageLike } from '../core/scores'
import { poolKey, type Pool } from '../datasets/pool'
import { createT, getLanguage, joinTexts, languageLabel, setLanguage, shellTexts, UI_LANGUAGES } from '../i18n'
import { fillTexts } from '../i18n/dom'
import type { Language } from '../languages'
import type { QuizInstance, QuizType } from '../quizzes'

export interface ShellDeps {
  quizType: QuizType<unknown>
  /** What is being practised; its key is what scores are kept under. */
  pool: Pool
  /** The language being learned; handed to the quiz. */
  language: Language
  storage: StorageLike
  /** The pool's dataset. The shell only hands its items to the quiz. */
  loadData: () => Promise<{ items: readonly unknown[] }>
}

// All visible text is filled in from the dictionaries by applyTexts() via the data-i18n attributes. `language.*` and
// `scores.*` are the shell's own texts; `title`, `intro` (and the meter labels and the `empty` status) are the quiz
// type's, shown here on its behalf. The quiz owns everything inside #quiz.
const SHELL = `
  <header class="top">
    <h1 data-i18n="title"></h1>
    <div class="lang" role="group" data-i18n-label="language.label"></div>
  </header>
  <p class="intro" data-i18n="intro"></p>

  <section class="scores" aria-labelledby="scores-title">
    <h2 id="scores-title" data-i18n="scores.title"></h2>
    <dl></dl>
    <button type="button" class="link" id="reset" data-i18n="scores.reset"></button>
  </section>

  <p id="status" role="status"></p>

  <div id="quiz"></div>
`

/**
 * The page around a quiz: header with the UI-language switch, the scores panel (drawn from the quiz type's meters),
 * the status line, and the container the quiz is mounted into once the pool's items are loaded.
 */
export async function mountShell(
  root: HTMLElement,
  { quizType, pool, language, storage, loadData }: ShellDeps,
): Promise<void> {
  root.innerHTML = SHELL
  const find = <E extends HTMLElement>(selector: string) => root.querySelector<E>(selector)!

  // One translator for everything the shell fills in: its own texts and the quiz type's (their keys never overlap).
  const text = createT(joinTexts(shellTexts, quizType.texts))
  const scores = new Scores(storage)
  const scoreKey = poolKey(pool)
  const statusEl = find('#status')
  const quizEl = find('#quiz')
  let quiz: QuizInstance | undefined

  // ---- text -------------------------------------------------------------------------------------

  function applyTexts(): void {
    document.documentElement.lang = getLanguage()
    document.title = text('title')
    fillTexts(root, text, quizEl)
    root.querySelectorAll<HTMLButtonElement>('[data-lang]').forEach((button) => {
      button.setAttribute('aria-pressed', String(button.dataset.lang === getLanguage()))
    })
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
    if (window.confirm(text('scores.resetConfirm'))) {
      scores.reset()
      renderScores()
    }
  })

  // ---- start ------------------------------------------------------------------------------------

  /** (Re)builds the quiz in its container. Without items it shows no exercise, only what surrounds one (its help). */
  function mountQuiz(items: readonly unknown[]): void {
    quiz = quizType.mount(quizEl, {
      items,
      pool: scoreKey,
      language,
      record(meterId, correct) {
        scores.record(scoreKey, meterId, correct)
        renderScores()
      },
    })
  }

  applyTexts()
  renderScores()
  showStatus('status.loading')
  // While the dataset loads (and if it fails or is empty) the quiz is mounted with no items.
  mountQuiz([])
  let items: readonly unknown[]
  try {
    items = (await loadData()).items
  } catch {
    showStatus('status.loadError')
    return
  }
  if (items.length === 0) {
    showStatus('empty')
    return
  }
  showStatus(null)
  mountQuiz(items)
}

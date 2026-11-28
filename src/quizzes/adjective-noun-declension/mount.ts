import { getUiLanguage } from '../../i18n'
import { fillTexts } from '../../i18n/dom'
import { enableShortcuts, fillSpecialChars, finder, renderShortcutHelp, syncRoundActions } from '../../ui'
import type { QuizHost, QuizInstance } from '../quiz-type'
import { createCaseFilterDialog } from './filter-dialog'
import { ADJECTIVE_DECLENSION_GENERATORS } from './generators'
import type { AdjectiveNounItem } from './items'
import { SentencePage } from './page'
import { formText, t } from './texts'

// The quiz's area of the page. The static texts are filled in by applyTexts() via the data-i18n attributes; the round
// (the words above the sentence, the verb form, the fields' states) is drawn by render().
const AREA = `
  <main id="exercise" hidden>
    <p id="prompt" class="prompt sentence-prompt"><strong id="adjective"></strong> · <strong id="noun"></strong> — <span id="form"></span></p>
    <p id="nothing" class="nothing" data-i18n="nothing" hidden></p>
    <p id="sentence" class="sentence">
      <span id="lead" class="lead"></span>
      <span class="cell blank" data-state="open">
        <input id="field-adjective" type="text" data-i18n-label="field.adjective" autocomplete="off" autocapitalize="none" spellcheck="false" autocorrect="off" />
        <span class="answer"><strong class="answer-forms"></strong></span>
      </span>
      <span class="cell blank" data-state="open">
        <input id="field-noun" type="text" data-i18n-label="field.noun" autocomplete="off" autocapitalize="none" spellcheck="false" autocorrect="off" />
        <span class="answer"><strong class="answer-forms"></strong></span>
      </span>
      <span id="end" class="end"></span>
    </p>
    <div id="chars" class="chars" role="group" data-i18n-label="chars.label"></div>
    <div class="actions">
      <button type="button" id="filters" data-i18n="filters.open"></button>
      <button type="button" id="check-all" data-i18n="checkAll"></button>
      <button type="button" id="next"></button>
    </div>
  </main>

  <dialog id="filter-dialog" class="filters"></dialog>

  <section class="help" aria-labelledby="help-title">
    <h2 id="help-title" data-i18n="help.title"></h2>
    <ul id="help-list"></ul>
  </section>
`

/**
 * One sentence per round (see SentencePage, which decides everything this draws): the adjective and the noun in their
 * base forms with the case and number above it, then the verb form, a field for the adjective and one for the noun, and
 * a full stop. Enter checks a field and moves on; "Check all", "Filters" (a dialog of the seven cases) and "Skip", which
 * turns into "Next sentence" once both fields are checked. Records into the meters `adjectives`, `nouns` (per checked
 * field) and `sentences` (per completed sentence).
 */
export function mountAdjectiveNounDeclension(container: HTMLElement, host: QuizHost<AdjectiveNounItem>): QuizInstance {
  const { items, language } = host
  container.innerHTML = AREA
  const find = finder(container)

  const exerciseEl = find('#exercise')
  const promptEl = find('#prompt')
  const nothingEl = find('#nothing')
  const sentenceEl = find('#sentence')
  const leadEl = find('#lead')
  const endEl = find('#end')
  const helpList = find('#help-list')
  const checkAllEl = find<HTMLButtonElement>('#check-all')
  const nextEl = find<HTMLButtonElement>('#next')
  const blanks = [...container.querySelectorAll<HTMLElement>('.blank')]
  const inputs = blanks.map((blank) => blank.querySelector('input')!)
  for (const element of [find('#adjective'), find('#noun'), sentenceEl]) element.lang = language.htmlLang

  function applyStaticTexts(): void {
    // The language's shortcut lines are the whole list: this quiz has no notes of its own.
    renderShortcutHelp(helpList, language.texts[getUiLanguage()].shortcutHelp)
    fillTexts(container, t)
  }

  // Without a generator for the learned language there is nothing to check answers against: no round, only the help.
  const generator = ADJECTIVE_DECLENSION_GENERATORS[language.id]
  if (!generator) {
    applyStaticTexts()
    return { applyTexts: applyStaticTexts }
  }
  const page = new SentencePage({ items, generator, settings: host.settings, record: host.record, random: Math.random })
  let lastFocused: HTMLInputElement | undefined

  function applyTexts(): void {
    applyStaticTexts()
    render()
  }

  /** Mirrors the page's state into the DOM. */
  function render(): void {
    const sentence = page.sentence
    promptEl.hidden = !sentence
    sentenceEl.hidden = !sentence
    nothingEl.hidden = sentence !== undefined
    if (sentence) {
      find('#adjective').textContent = sentence.adjective
      find('#noun').textContent = sentence.noun
      find('#form').textContent = formText(t, sentence.caseId, sentence.number)
      leadEl.textContent = sentence.lead
      leadEl.hidden = sentence.lead === ''
      endEl.textContent = sentence.end
    }
    page.fields.forEach((field, i) => {
      blanks[i]!.dataset.state = field.state
      inputs[i]!.readOnly = field.state !== 'open'
      // Only a wrong field shows its answer: every accepted form.
      blanks[i]!.querySelector('.answer-forms')!.textContent = field.state === 'wrong' ? field.acceptedForms.join(' / ') : ''
    })
    syncRoundActions(checkAllEl, nextEl, page.complete, t)
  }

  /** Draws the sentence the page has just started, with empty fields, and puts the focus in the first one. */
  function showNewSentence(): void {
    for (const input of inputs) input.value = ''
    lastFocused = undefined
    render()
    if (page.sentence) inputs[0]!.focus()
  }

  function newSentence(): void {
    page.start()
    showNewSentence()
  }

  // ---- static controls --------------------------------------------------------------------------

  // Closing the dialog applies its ticks; if they changed, the page has started a new sentence.
  const filterDialog = createCaseFilterDialog(find<HTMLDialogElement>('#filter-dialog'), page.filterDraft, () => {
    if (page.closeFilter()) showNewSentence()
  })
  find('#filters').addEventListener('click', () => {
    page.openFilter()
    filterDialog.open()
  })

  // Characters go into the field last typed in, or the first one still open.
  fillSpecialChars(find('#chars'), language, () =>
    lastFocused && !lastFocused.readOnly ? lastFocused : inputs.find((input) => !input.readOnly),
  )

  inputs.forEach((input, i) => {
    input.lang = language.htmlLang
    enableShortcuts(input, language.shortcuts)
    input.addEventListener('focus', () => (lastFocused = input))
    input.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter') return
      event.preventDefault()
      const next = page.enter(i, input.value)
      render()
      if (next !== undefined) inputs[next]!.focus()
    })
  })

  checkAllEl.addEventListener('click', () => {
    page.checkAll(inputs.map((input) => input.value))
    render()
  })
  nextEl.addEventListener('click', newSentence)

  // Enter once the sentence is done starts the next one, wherever in the exercise the focus is. This listens while the
  // event is still on its way down (capture), before any field or button sees it: so the Enter that checks the last
  // field (sentence not done yet) is left to the field, and only a later Enter gets here.
  exerciseEl.addEventListener(
    'keydown',
    (event) => {
      if (event.key !== 'Enter' || !page.complete) return
      // Stop here: a button must not also be activated by this Enter.
      event.preventDefault()
      event.stopPropagation()
      newSentence()
    },
    true,
  )

  // ---- start ------------------------------------------------------------------------------------

  applyTexts()
  if (items.length > 0) {
    exerciseEl.hidden = false
    newSentence()
  }
  return { applyTexts }
}

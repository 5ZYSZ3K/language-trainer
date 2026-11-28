import { getUiLanguage } from '../../i18n'
import { fillTexts } from '../../i18n/dom'
import { enableShortcuts, fillSpecialChars, finder, renderShortcutHelp, syncRoundActions, type UiTextKey } from '../../ui'
import type { CaseId } from '../noun-declension/cells'
import type { QuizHost, QuizInstance } from '../quiz-type'
import { createFilterDialog } from './filter-dialog'
import type { SentenceNounItem } from './sentence-items'
import type { SentenceQuizPage, SentenceRoundPage } from './sentence-page'
import { formText, type SentenceTextKey } from './sentence-texts'

/** Looks up an element of the quiz's area (see finder). */
export type Find = ReturnType<typeof finder>

/**
 * A sentence quiz's own part of its area: its round, which the shared part puts above the special characters and the
 * buttons and hides while there is nothing to ask.
 */
export interface SentenceView {
  /**
   * The round's HTML: what is shown above the sentence, and the sentence with a `.blank` per field, in field order, each
   * an input and an `.answer` holding an `.answer-forms`. Its texts are `data-i18n` attributes, filled in with the rest
   * of the area.
   */
  readonly html: string
  /** The text of the button that checks every open field: `checkAll`, or `check` for a quiz of one field. */
  readonly checkKey: 'check' | 'checkAll'
  /**
   * Called once the HTML is in the area (`find` looks inside it), with the learned language's `lang`: gives what draws the
   * round on the page into it, its words and each checked field's answer line, on every change and language switch. The
   * fields' states are drawn by the shared part.
   */
  attach(find: Find, htmlLang: string): () => void
}

// The quiz's area of the page. The static texts are filled in by applyTexts() via the data-i18n attributes; the round
// is drawn by render(), the view's part of it by the view.
const area = ({ html, checkKey }: SentenceView) => `
  <main id="exercise" hidden>
    <div id="round">${html}</div>
    <p id="nothing" class="nothing" data-i18n="nothing" hidden></p>
    <div id="chars" class="chars" role="group" data-i18n-label="chars.label"></div>
    <div class="actions">
      <button type="button" id="filters" data-i18n="filters.open"></button>
      <button type="button" id="check-all" data-i18n="${checkKey}"></button>
      <button type="button" id="next"></button>
    </div>
  </main>

  <dialog id="filter-dialog" class="filters"></dialog>

  <section class="help" aria-labelledby="help-title">
    <h2 id="help-title" data-i18n="help.title"></h2>
    <ul id="help-list"></ul>
  </section>
`

/** What a sentence quiz hands the shared DOM: its page, the translator of its area and its own part of the area. */
export interface SentenceRoundsOptions<C extends CaseId> {
  /**
   * The quiz's page over the host's items, settings and meters; undefined when the learned language has nothing to check
   * answers against (no generator or table for it): then only the help is shown.
   */
  readonly page: SentenceRoundPage<unknown, C> | undefined
  /** Translates what the quiz's area shows: its own texts (every sentence quiz text, and its view's) and the shared type-in ones. */
  readonly t: (key: NoInfer<SentenceTextKey<C>> | UiTextKey) => string
  readonly view: SentenceView
}

/**
 * The page of any sentence quiz (see SentenceRoundPage, which decides everything this draws): the quiz's round (its
 * view), the special characters, and "Filters" (a dialog of the forms of the cases the quiz offers, a case and a number
 * each, as the noun quiz's), "Check all" (or "Check") and "Skip", which turns into "Next sentence" once every field is
 * checked. Enter checks a field and moves on to the next open one; once every field is checked, it starts the next
 * sentence. Records into the quiz's meters (per checked field, and per completed sentence if it has that meter).
 */
export function mountSentenceRounds<C extends CaseId>(container: HTMLElement, host: QuizHost<unknown>, { page, t, view }: SentenceRoundsOptions<C>): QuizInstance {
  const { items, language } = host
  container.innerHTML = area(view)
  const find = finder(container)

  const exerciseEl = find('#exercise')
  const roundEl = find('#round')
  const nothingEl = find('#nothing')
  const helpList = find('#help-list')
  const checkAllEl = find<HTMLButtonElement>('#check-all')
  const nextEl = find<HTMLButtonElement>('#next')
  const blanks = [...container.querySelectorAll<HTMLElement>('.blank')]
  const inputs = blanks.map((blank) => blank.querySelector('input')!)
  const renderView = view.attach(find, language.htmlLang)

  function applyStaticTexts(): void {
    // The language's shortcut lines are the whole list: this quiz has no notes of its own.
    renderShortcutHelp(helpList, language.texts[getUiLanguage()].shortcutHelp)
    fillTexts(container, t)
  }

  // Without a page there is nothing to check answers against: no round, only the help.
  if (!page) {
    applyStaticTexts()
    return { applyTexts: applyStaticTexts }
  }
  let lastFocused: HTMLInputElement | undefined

  function applyTexts(): void {
    applyStaticTexts()
    filterDialog.applyTexts()
    render()
  }

  /** Mirrors the page's state into the DOM. */
  function render(): void {
    const asking = page!.sentence !== undefined
    roundEl.hidden = !asking
    nothingEl.hidden = asking
    if (asking) renderView()
    page!.fields.forEach((field, i) => {
      blanks[i]!.dataset.state = field.state
      inputs[i]!.readOnly = field.state !== 'open'
    })
    syncRoundActions(checkAllEl, nextEl, page!.complete, t)
  }

  /** Draws the sentence the page has just started, with empty fields, and puts the focus in the first one. */
  function showNewSentence(): void {
    for (const input of inputs) input.value = ''
    lastFocused = undefined
    render()
    if (page!.sentence) inputs[0]!.focus()
  }

  function newSentence(): void {
    page!.start()
    showNewSentence()
  }

  // ---- static controls --------------------------------------------------------------------------

  // Closing the dialog applies its ticks; if they changed, the page has started a new sentence.
  const filterDialog = createFilterDialog(find<HTMLDialogElement>('#filter-dialog'), page.filterDraft, { cases: page.cases, t }, () => {
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

/** What a sentence quiz of two fields hands the shared DOM: its page, and the translator of its area. */
export interface SentenceMountOptions<Noun extends SentenceNounItem, Kind extends string, C extends CaseId> {
  /**
   * The quiz's page over the host's items, settings and meters; undefined when the learned language has nothing to check
   * answers against (no adjective declension generator, no demonstrative pronoun table): then only the help is shown.
   */
  readonly page: SentenceQuizPage<Noun, Kind, C> | undefined
  /** Translates what the quiz's area shows: its own texts (every sentence quiz text, `field.<kind>` and `field.noun`) and the shared type-in ones. */
  readonly t: (key: NoInfer<SentenceTextKey<C> | `field.${Kind}` | 'field.noun'> | UiTextKey) => string
}

/**
 * The round of a sentence quiz of two fields: the first blank's word and the noun in their base forms with the case and
 * number above the sentence, then the verb form, a field for the word and one for the noun, and a full stop. A wrong
 * field's answer line is every form it accepts. `kind` names the first field's label, `field.<kind>`.
 */
function twoFields<Noun extends SentenceNounItem, Kind extends string, C extends CaseId>(
  page: SentenceQuizPage<Noun, Kind, C> | undefined,
  t: SentenceMountOptions<Noun, Kind, C>['t'],
): SentenceView {
  return {
    html: `
      <p id="prompt" class="prompt sentence-prompt"><strong id="word"></strong> · <strong id="noun"></strong> — <span id="form"></span></p>
      <p id="sentence" class="sentence">
        <span id="lead" class="lead"></span>
        <span class="cell blank" data-state="open">
          <input id="field-word" type="text" data-i18n-label="field.${page?.kind ?? ''}" autocomplete="off" autocapitalize="none" spellcheck="false" autocorrect="off" />
          <span class="answer"><strong class="answer-forms"></strong></span>
        </span>
        <span class="cell blank" data-state="open">
          <input id="field-noun" type="text" data-i18n-label="field.noun" autocomplete="off" autocapitalize="none" spellcheck="false" autocorrect="off" />
          <span class="answer"><strong class="answer-forms"></strong></span>
        </span>
        <span id="end" class="end"></span>
      </p>
    `,
    checkKey: 'checkAll',
    attach(find, htmlLang) {
      for (const element of [find('#word'), find('#noun'), find('#sentence')]) element.lang = htmlLang
      const answers = [...find('#sentence').querySelectorAll<HTMLElement>('.answer-forms')]
      const leadEl = find('#lead')
      return () => {
        const sentence = page!.sentence!
        find('#word').textContent = sentence[page!.kind]
        find('#noun').textContent = sentence.noun
        find('#form').textContent = formText(t, sentence.caseId, sentence.number)
        leadEl.textContent = sentence.lead
        leadEl.hidden = sentence.lead === ''
        find('#end').textContent = sentence.end
        // Only a wrong field shows its answer: every accepted form.
        page!.fields.forEach((field, i) => (answers[i]!.textContent = field.state === 'wrong' ? field.acceptedForms.join(' / ') : ''))
      }
    },
  }
}

/**
 * One sentence per round (see SentenceQuizPage, which decides everything this draws), with two fields: the first blank's
 * word and the noun in their base forms with the case and number above it, then the verb form, a field for the word and
 * one for the noun, and a full stop (see mountSentenceRounds for the rest of the page).
 */
export function mountSentenceQuiz<Noun extends SentenceNounItem, Kind extends string, C extends CaseId>(
  container: HTMLElement,
  host: QuizHost<unknown>,
  { page, t }: SentenceMountOptions<Noun, Kind, C>,
): QuizInstance {
  return mountSentenceRounds(container, host, { page, t, view: twoFields(page, t) })
}

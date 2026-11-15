import type { Item } from '../core/cell'
import { findByPrompt } from '../core/matching'
import type { Language } from '../languages'
import { enableShortcuts } from './shortcut-input'

/** The texts the line shows. `goTo.button` is shared; the label and the miss name the quiz's kind of word. */
export type GoToTextKey = 'goTo.label' | 'goTo.button' | 'goTo.notFound'

export interface GoTo {
  /** The field, so the quiz can send the special-character buttons to it. */
  readonly input: HTMLInputElement
  /** Redraws the miss message, for a new UI language. The static texts are filled in by the quiz's own fillTexts. */
  applyTexts(): void
}

/**
 * Fills `form` with the line to open one particular word: a label, a field and "Go". The word must be typed as the
 * prompt shows it (see findByPrompt), and nothing is suggested. A match clears the field and goes to `onFound`; a miss
 * says so under the field and leaves the text in it, to be corrected. `goTo.notFound` holds `{word}` where the typed
 * word goes.
 */
export function createGoTo<T extends Item>(
  form: HTMLFormElement,
  items: readonly T[],
  language: Language,
  t: (key: GoToTextKey) => string,
  onFound: (item: T) => void,
): GoTo {
  form.innerHTML = `
    <label for="go-to-input" data-i18n="goTo.label"></label>
    <div class="row">
      <input id="go-to-input" type="text" autocomplete="off" autocapitalize="none" spellcheck="false" autocorrect="off" />
      <button type="submit" data-i18n="goTo.button"></button>
    </div>
    <p class="go-to-miss" role="status" hidden></p>
  `
  const input = form.querySelector('input')!
  const miss = form.querySelector<HTMLElement>('.go-to-miss')!
  input.lang = language.htmlLang
  enableShortcuts(input, language.shortcuts)

  /** What was typed for the last miss, until the next try. */
  let missed: string | undefined

  function renderMiss(): void {
    miss.hidden = missed === undefined
    if (missed === undefined) return void miss.replaceChildren()
    const [before = '', after = ''] = t('goTo.notFound').split('{word}')
    const word = document.createElement('strong')
    word.lang = language.htmlLang
    word.textContent = missed
    miss.replaceChildren(before, word, after)
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault()
    if (input.value.trim() === '') return
    const found = findByPrompt(items, input.value)
    missed = found ? undefined : input.value.trim()
    renderMiss()
    if (!found) return input.focus()
    input.value = ''
    onFound(found)
  })

  return { input, applyTexts: renderMiss }
}

import type { Variant } from '../../core/cell'
import { getUiLanguage } from '../../i18n'
import { explanationOf, nounRemarkLabelKey, remarkCodesOf, type NounExplanation, type NounRemarkCode } from './remarks'
import { t } from './texts'

export interface ExplanationDialog {
  /** Opens the dialog on one variant with remarks, of a noun with or without its own explanation. */
  open(variant: Variant, explanation: NounExplanation | undefined): void
}

/** A remark's chip: its label in the UI language, in the numerals' `.remark` style. A language switch relabels it. */
export function remarkChip(code: NounRemarkCode): HTMLElement {
  const chip = document.createElement('span')
  chip.className = 'remark'
  chip.dataset.i18n = nounRemarkLabelKey(code)
  chip.textContent = t(nounRemarkLabelKey(code))
  return chip
}

/**
 * Builds the dialog an ⓘ opens inside `dialog` (a `<dialog>` the quiz put in its area): the variant with its chips as
 * the title, then what `explanationOf` gives (the shared explanation of each remark that has one, then the noun's own),
 * inserted as the HTML it is written in, since these are the owner's own bundled texts. It is filled in the UI language
 * each time it opens; its Close button is labelled by the quiz's `applyTexts`, with the rest of its area. Close, Esc or
 * a click outside closes it, and the focus goes back to where it was.
 */
export function createExplanationDialog(dialog: HTMLDialogElement, htmlLang: string): ExplanationDialog {
  dialog.innerHTML = `
    <form method="dialog" class="explanation-form">
      <h2 id="explanation-title" class="explanation-title"></h2>
      <div class="explanation-texts"></div>
      <div class="explanation-actions">
        <button type="submit" class="primary" data-i18n="explanation.close"></button>
      </div>
    </form>
  `
  dialog.setAttribute('aria-labelledby', 'explanation-title')
  const title = dialog.querySelector<HTMLElement>('.explanation-title')!
  const texts = dialog.querySelector<HTMLElement>('.explanation-texts')!
  let returnFocus: HTMLElement | undefined

  // A click on the backdrop lands on the dialog element itself; the form covers everything else.
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close()
  })
  dialog.addEventListener('close', () => {
    if (returnFocus?.isConnected) returnFocus.focus()
    returnFocus = undefined
  })

  return {
    open(variant, explanation) {
      const remarks = remarkCodesOf(variant)
      const form = document.createElement('strong')
      form.lang = htmlLang
      form.textContent = variant.value
      title.replaceChildren(form, ...remarks.flatMap((code) => [' ', remarkChip(code)]))
      texts.replaceChildren(
        ...explanationOf(remarks, explanation, getUiLanguage()).map((html) => {
          const text = document.createElement('div')
          text.className = 'explanation-text'
          text.innerHTML = html
          return text
        }),
      )
      returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : undefined
      dialog.showModal()
    },
  }
}

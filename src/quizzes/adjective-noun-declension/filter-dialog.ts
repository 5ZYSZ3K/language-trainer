import { nounCaseIds, nounCellId, nounNumbers, type CaseId, type GrammaticalNumber } from '../noun-declension/cells'
import type { FilterDraft } from './filter'
import { caseLabelKey, filterNumberKey, formText, t, type AdjectiveNounTextKey } from './texts'

export interface FilterDialog {
  /** Shows the dialog on the draft's ticks (open the draft first). */
  open(): void
  /** Names the checkboxes for the screen reader, in the UI language: "3. dative, singular". */
  applyTexts(): void
}

/**
 * Builds the filter inside `dialog` (a `<dialog>` the quiz put in its area), as the noun quiz's: a grid with a row per
 * case and a column per number, one checkbox in each of the 14 crossings, a heading button that switches its whole row
 * or column, and "Select all", "Clear all" and "Done". The ticks go to `draft` as they change; nothing is applied while
 * it is open. Closing it (Done, Esc, a click outside) calls `onClose` once, which applies the draft. Its texts are
 * `data-i18n` attributes, filled in with the rest of the quiz's area; the checkboxes' names are set by `applyTexts`.
 */
export function createFilterDialog(dialog: HTMLDialogElement, draft: FilterDraft, onClose: () => void): FilterDialog {
  dialog.innerHTML = `
    <form method="dialog" class="filters-form">
      <h2 id="filters-title" data-i18n="filters.title"></h2>
      <p class="filters-hint" data-i18n="filters.hint"></p>
      <div class="filter-grid" role="group" aria-labelledby="filters-title"></div>
      <div class="filters-actions">
        <button type="button" id="filters-select-all" data-i18n="filters.selectAll"></button>
        <button type="button" id="filters-clear-all" data-i18n="filters.clearAll"></button>
        <button type="submit" id="filters-done" class="primary" data-i18n="filters.done"></button>
      </div>
    </form>
  `
  dialog.setAttribute('aria-labelledby', 'filters-title')
  const grid = dialog.querySelector<HTMLElement>('.filter-grid')!
  /** Each checkbox with the case and number it stands for. */
  const boxes: { box: HTMLInputElement; caseId: CaseId; number: GrammaticalNumber }[] = []

  const headingButton = (textKey: AdjectiveNounTextKey, toggle: () => void): HTMLButtonElement => {
    const button = document.createElement('button')
    button.type = 'button'
    button.className = 'filter-heading'
    button.dataset.i18n = textKey
    button.addEventListener('click', () => {
      toggle()
      sync()
    })
    return button
  }

  // The first grid cell is empty: the corner above the case headings.
  grid.append(document.createElement('span'))
  for (const number of nounNumbers) grid.append(headingButton(filterNumberKey(number), () => draft.toggleNumber(number)))
  for (const caseId of nounCaseIds) {
    grid.append(headingButton(caseLabelKey(caseId), () => draft.toggleCase(caseId)))
    for (const number of nounNumbers) {
      const box = document.createElement('input')
      box.type = 'checkbox'
      box.addEventListener('change', () => draft.set(nounCellId(caseId, number), box.checked))
      boxes.push({ box, caseId, number })
      grid.append(box)
    }
  }

  function sync(): void {
    for (const { box, caseId, number } of boxes) box.checked = draft.ticked.has(nounCellId(caseId, number))
  }

  dialog.querySelector('#filters-select-all')!.addEventListener('click', () => {
    draft.selectAll()
    sync()
  })
  dialog.querySelector('#filters-clear-all')!.addEventListener('click', () => {
    draft.clearAll()
    sync()
  })

  // A click on the backdrop lands on the dialog element itself; the form covers everything else.
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close()
  })
  dialog.addEventListener('close', onClose)

  return {
    open() {
      sync()
      dialog.showModal()
    },
    applyTexts() {
      for (const { box, caseId, number } of boxes) box.setAttribute('aria-label', formText(t, caseId, number))
    },
  }
}

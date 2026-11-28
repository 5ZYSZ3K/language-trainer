import { nounCaseIds } from '../noun-declension/cells'
import type { FilterDraft } from './filter'
import { caseLabelKey } from './texts'

export interface CaseFilterDialog {
  /** Shows the dialog on the draft's ticks (open the draft first). */
  open(): void
}

/**
 * Builds the filter inside `dialog` (a `<dialog>` the quiz put in its area): a checkbox per case, all seven, and
 * "Select all", "Clear all" and "Done". The ticks go to `draft` as they change; nothing is applied while it is open.
 * Closing it (Done, Esc, a click outside) calls `onClose` once, which applies the draft. Its texts are `data-i18n`
 * attributes, filled in with the rest of the quiz's area.
 */
export function createCaseFilterDialog(dialog: HTMLDialogElement, draft: FilterDraft, onClose: () => void): CaseFilterDialog {
  dialog.innerHTML = `
    <form method="dialog" class="filters-form">
      <h2 id="filters-title" data-i18n="filters.title"></h2>
      <p class="filters-hint" data-i18n="filters.hint"></p>
      <div class="case-filter" role="group" aria-labelledby="filters-title"></div>
      <div class="filters-actions">
        <button type="button" id="filters-select-all" data-i18n="filters.selectAll"></button>
        <button type="button" id="filters-clear-all" data-i18n="filters.clearAll"></button>
        <button type="submit" id="filters-done" class="primary" data-i18n="filters.done"></button>
      </div>
    </form>
  `
  dialog.setAttribute('aria-labelledby', 'filters-title')
  const group = dialog.querySelector<HTMLElement>('.case-filter')!

  const boxes = nounCaseIds.map((caseId) => {
    const box = document.createElement('input')
    box.type = 'checkbox'
    box.addEventListener('change', () => draft.set(caseId, box.checked))
    const name = document.createElement('span')
    name.dataset.i18n = caseLabelKey(caseId)
    const label = document.createElement('label')
    label.append(box, name)
    group.append(label)
    return { caseId, box }
  })

  function sync(): void {
    for (const { caseId, box } of boxes) box.checked = draft.ticked.has(caseId)
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
  }
}

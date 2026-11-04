import { fillTexts } from '../../i18n/dom'
import { nounCaseIds, nounCaseLabelKey, nounCellId, nounNumberLabelKey, nounNumbers, type CaseId, type GrammaticalNumber } from './cells'
import { allCells, cellsOfCase, cellsOfNumber, sameFilter, toggleGroup, type CellFilter } from './filter'
import { t } from './texts'

export interface FilterDialog {
  /** Opens the dialog on `current`. When it closes, `onClose` gets the ticks the learner left, if they differ from `current`. */
  open(current: CellFilter): void
  /** Refills the texts the dialog shows, for a new UI language. */
  applyTexts(): void
}

/**
 * Builds the filter inside `dialog` (a `<dialog>` the quiz put in its area): a grid with a row per case and a column
 * per number, one checkbox in each of the 14 crossings, a heading button that switches its whole row or column, and
 * "Select all", "Clear all" and "Done". Nothing is applied while it is open; closing it (Done, Esc, a click outside)
 * reports the result once, and only if it changed.
 */
export function createFilterDialog(dialog: HTMLDialogElement, onClose: (filter: Set<string>) => void): FilterDialog {
  let before: CellFilter = allCells()
  let working: Set<string> = allCells()
  const boxes = new Map<string, HTMLInputElement>()
  /** Each checkbox with the case and number it stands for, to compose its accessible name. */
  const named: { box: HTMLInputElement; caseId: CaseId; number: GrammaticalNumber }[] = []

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

  const headingButton = (textKey: string, ids: readonly string[]): HTMLButtonElement => {
    const button = document.createElement('button')
    button.type = 'button'
    button.className = 'filter-heading'
    button.dataset.i18n = textKey
    button.addEventListener('click', () => {
      working = toggleGroup(working, ids)
      sync()
    })
    return button
  }

  // The first grid cell is empty: the corner above the case headings.
  grid.append(document.createElement('span'))
  for (const number of nounNumbers) grid.append(headingButton(nounNumberLabelKey(number), cellsOfNumber(number)))
  for (const caseId of nounCaseIds) {
    grid.append(headingButton(nounCaseLabelKey(caseId), cellsOfCase(caseId)))
    for (const number of nounNumbers) {
      const id = nounCellId(caseId, number)
      const box = document.createElement('input')
      box.type = 'checkbox'
      box.addEventListener('change', () => {
        if (box.checked) working.add(id)
        else working.delete(id)
      })
      boxes.set(id, box)
      named.push({ box, caseId, number })
      grid.append(box)
    }
  }

  function sync(): void {
    for (const [id, box] of boxes) box.checked = working.has(id)
  }

  dialog.querySelector('#filters-select-all')!.addEventListener('click', () => {
    working = allCells()
    sync()
  })
  dialog.querySelector('#filters-clear-all')!.addEventListener('click', () => {
    working = new Set()
    sync()
  })

  // A click on the backdrop lands on the dialog element itself; the form covers everything else.
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close()
  })
  dialog.addEventListener('close', () => {
    if (!sameFilter(before, working)) onClose(new Set(working))
  })

  function applyTexts(): void {
    fillTexts(dialog, t)
    for (const { box, caseId, number } of named) {
      box.setAttribute('aria-label', `${t(nounCaseLabelKey(caseId))} – ${t(nounNumberLabelKey(number))}`)
    }
  }

  return {
    open(current) {
      before = new Set(current)
      working = new Set(current)
      sync()
      dialog.showModal()
    },
    applyTexts,
  }
}

/**
 * Which of a round's two main buttons asks to be pressed. While something is still open, the check button is the
 * primary one and the next button only offers to skip; once everything is checked, the check button is disabled and
 * the next button becomes the primary one, under the quiz's own `next` text ("Next verb"). The labels are set through
 * `data-i18n`, so a later fillTexts (a new UI language) keeps them.
 */
export function syncRoundActions(
  check: HTMLButtonElement,
  next: HTMLButtonElement,
  done: boolean,
  t: (key: 'skip' | 'next') => string,
): void {
  check.disabled = done
  check.classList.toggle('primary', !done)
  next.classList.toggle('primary', done)
  const key = done ? 'next' : 'skip'
  next.dataset.i18n = key
  next.textContent = t(key)
}

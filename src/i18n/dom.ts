/**
 * Fills in the texts of the elements under `scope` that name a text key: `data-i18n` sets the text, `data-i18n-label`
 * the `aria-label`. Elements inside `skip` are left alone (another part of the page fills those in itself).
 */
export function fillTexts<Key extends string>(scope: ParentNode, t: (key: Key) => string, skip?: Node): void {
  const own = (el: Element) => !skip?.contains(el)
  scope.querySelectorAll<HTMLElement>('[data-i18n]').forEach((el) => {
    if (own(el)) el.textContent = t(el.dataset.i18n as Key)
  })
  scope.querySelectorAll<HTMLElement>('[data-i18n-label]').forEach((el) => {
    if (own(el)) el.setAttribute('aria-label', t(el.dataset.i18nLabel as Key))
  })
}

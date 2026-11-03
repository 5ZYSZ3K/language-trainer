/**
 * A look-up for the elements of markup the page wrote itself: `find('#status')` is the element under `root` that the
 * selector names. The markup is fixed, so an element that is not there is a bug, and the look-up throws instead of
 * handing back `null`.
 */
export function finder(root: ParentNode): <E extends HTMLElement = HTMLElement>(selector: string) => E {
  return <E extends HTMLElement = HTMLElement>(selector: string): E => {
    const element = root.querySelector<E>(selector)
    if (!element) throw new Error(`No element matches ${selector}.`)
    return element
  }
}

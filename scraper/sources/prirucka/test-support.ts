import { readFileSync } from 'node:fs'

/** The site the saved pages came from. */
export const SITE = 'https://prirucka.ujc.cas.cz/'

/** A saved page of the site: `fixtures/<name>.html`. */
export const fixture = (name: string): string => readFileSync(new URL(`./fixtures/${name}.html`, import.meta.url), 'utf8')

import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

// The dependency rule (README, "Code layout"): the page's code never reaches into the build-time code, and
// src/core/ knows nothing about languages, sources, quiz types or texts. Every way of referring to another module is
// scanned: imports, re-exports, dynamic imports, `import x = require()`, `require()` and `import.meta.glob`. A
// reference whose target is computed cannot be checked, so it counts as a violation too.

const here = fileURLToPath(import.meta.url)
const projectRoot = resolve(dirname(here), '..')
const srcDir = join(projectRoot, 'src')

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) return sourceFiles(path)
    return /\.(ts|tsx|js|mjs)$/.test(entry.name) ? [path] : []
  })
}

/** A module reference: the specifier as written, or `computed` (the argument's text) when it is not a plain string. */
type Reference = { specifier: string } | { computed: string }

/** The argument of `import()` / `require()`, if it is one plain string (a second argument, import attributes, is ignored). */
function literalArgument(argument: string): string | undefined {
  const text = argument.replace(/\/\*[\s\S]*?\*\//g, '').trim()
  return /^(['"])([^'"]*)\1\s*(?:,|$)/.exec(text)?.[2] ?? /^`([^`$]*)`\s*(?:,|$)/.exec(text)?.[1]
}

/** Every module a file refers to: static and dynamic imports, re-exports, `require()` calls and `import.meta.glob` patterns. */
function references(code: string): Reference[] {
  const literal = [
    /\b(?:import|export)\s[^'"`;]*?\bfrom\s*['"]([^'"]+)['"]/g, // import x from '...', export * from '...'
    /\bimport\s*['"]([^'"]+)['"]/g, // import '...'
    /\bimport\.meta\.glob(?:<[^()]*>)?\(\s*['"]([^'"]+)['"]/g,
  ].flatMap((pattern) => [...code.matchAll(pattern)].map((match): Reference => ({ specifier: match[1]! })))

  // import('...'), require('...') and `import x = require('...')`, which is a require() call; also the ones with computed arguments.
  const calls = [...code.matchAll(/\b(?:import|require)\s*\(([^)]*)\)/g)].map((match): Reference => {
    const specifier = literalArgument(match[1]!)
    return specifier === undefined ? { computed: match[1]!.trim() } : { specifier }
  })
  const globs = [...code.matchAll(/\bimport\.meta\.glob(?:<[^()]*>)?\(\s*(?!['"])([^)]*)\)/g)].map((match): Reference => ({
    computed: match[1]!.trim(),
  }))
  return [...literal, ...calls, ...globs]
}

/** Where a specifier points, relative to the project root; bare package names are returned as they are. */
function target(file: string, specifier: string): string {
  if (specifier.startsWith('.')) return relative(projectRoot, resolve(dirname(file), specifier)).split(sep).join('/')
  // Vite resolves a leading slash from the project root.
  if (specifier.startsWith('/')) return specifier.slice(1)
  return specifier
}

interface Found {
  /** The file, relative to the project root. */
  from: string
  /** Where it points, relative to the project root (or the package name); undefined if the reference is computed. */
  to?: string
  /** The argument's text, if the reference is computed. */
  computed?: string
}

function foundIn(file: string, code: string): Found[] {
  const from = relative(projectRoot, file).split(sep).join('/')
  return references(code).map((reference) =>
    'specifier' in reference ? { from, to: target(file, reference.specifier) } : { from, computed: reference.computed },
  )
}

const reachesBuildCode = ({ to }: Found) => to !== undefined && /^(scraper|scripts)(\/|$)/.test(to)
const cannotBeChecked = ({ computed }: Found) => computed !== undefined
const leavesCore = ({ from, to }: Found) =>
  from.startsWith('src/core/') && to !== undefined && !to.startsWith('src/core/') && to !== 'vitest'

// This file holds the scanner's scratch inputs and a computed import of its own (below), so it is not scanned.
const found = sourceFiles(srcDir)
  .filter((file) => file !== here)
  .flatMap((file) => foundIn(file, readFileSync(file, 'utf8')))

describe('dependency rule', () => {
  it('finds the imports it scans (sanity check of the scanner)', () => {
    expect(found).toContainEqual({ from: 'src/main.ts', to: 'src/style.css' })
    expect(found).toContainEqual({ from: 'src/datasets/load.ts', to: 'data/*/*/*.json' })
  })

  it('src/ never imports from scraper/ or scripts/', () => {
    expect(found.filter(reachesBuildCode)).toEqual([])
  })

  it('src/ refers to modules only in ways that can be checked (no computed import, require or glob)', () => {
    expect(found.filter(cannotBeChecked)).toEqual([])
  })

  it('src/core/ imports only from src/core/', () => {
    expect(found.filter(leavesCore)).toEqual([])
  })
})

describe('the scanner', () => {
  const inFile = (code: string) => foundIn(join(srcDir, 'app', 'example.ts'), code)

  it.each([
    ['a static import', `import { run } from '../../scraper/cli'`],
    ['a type import', `import type { Registries } from "../../scripts/check-data"`],
    ['an import that spans lines', `import {\n  a,\n  b,\n} from '../../scraper/cli'`],
    ['a re-export', `export * from '../../scraper/list'`],
    ['a side-effect import', `import '../../scraper/cli'`],
    ['a dynamic import', `const cli = await import('../../scraper/cli')`],
    ['a dynamic import with a template literal', 'const cli = await import(`../../scraper/cli`)'],
    ['a dynamic import with import attributes', `import('../../scripts/data.json', { with: { type: 'json' } })`],
    ['an import type query', `let cli: typeof import('../../scraper/cli')`],
    ['an import = require', `import cli = require('../../scraper/cli')`],
    ['a require call', `const cli = require("../../scripts/check-data")`],
    ['a glob', `const files = import.meta.glob<string>('../../scraper/*.ts')`],
  ])('finds %s of build-time code', (_form, code) => {
    const references = inFile(code)
    expect(references).toHaveLength(1)
    expect(references.filter(reachesBuildCode)).toEqual(references)
  })

  it.each([
    ['a dynamic import of a variable', `await import(path)`],
    ['a dynamic import of a joined string', `await import('../../scra' + 'per/cli')`],
    ['a dynamic import of a template with a substitution', 'await import(`../../${folder}/cli`)'],
    ['a dynamic import that explains itself first', `await import(/* @vite-ignore */ path)`],
    ['a dynamic import over several lines', `await import(\n  path,\n)`],
    ['a require of a variable', `const cli = require(name)`],
    ['an import = require of a variable', `import cli = require(name)`],
    ['a glob of a variable', `import.meta.glob(patterns)`],
    ['a glob of a list', `import.meta.glob(['../../scraper/*.ts'])`],
  ])('flags %s, whose target cannot be checked', (_form, code) => {
    const references = inFile(code)
    expect(references).toHaveLength(1)
    expect(references.filter(cannotBeChecked)).toEqual(references)
  })

  it.each([
    ['a relative import', `import { a } from './local'`],
    ['a package import', `import { describe } from 'vitest'`],
    ['a folder that only starts like a build-time one', `import { a } from '../scrapers/other'`],
    ['a dynamic import inside src', `await import('./local')`],
    ['a require inside src', `const local = require('./local')`],
    ['a method that merely ends in require', `jest.requireActual('x')`],
    ['a glob inside src', `import.meta.glob('/data/*.json')`],
  ])('lets %s through', (_form, code) => {
    const references = inFile(code)
    expect(references.filter(reachesBuildCode)).toEqual([])
    expect(references.filter(cannotBeChecked)).toEqual([])
  })

  it('resolves a specifier from the importing file, and a leading slash from the project root', () => {
    expect(inFile(`import a from '../core/cell'`)).toEqual([{ from: 'src/app/example.ts', to: 'src/core/cell' }])
    expect(inFile(`import.meta.glob('/data/*.json')`)).toEqual([{ from: 'src/app/example.ts', to: 'data/*.json' }])
  })

  it('applies the core rule to a file in src/core/', () => {
    const inCore = (code: string) => foundIn(join(srcDir, 'core', 'example.ts'), code)
    expect(inCore(`import { a } from './cell'`).filter(leavesCore)).toEqual([])
    expect(inCore(`import { a } from '../quizzes'`).filter(leavesCore)).toHaveLength(1)
    expect(inCore(`const m = require('../quizzes')`).filter(leavesCore)).toHaveLength(1)
  })
})

describe('import-time safety', () => {
  // The scraper and the Node-run tests import the registries for their contracts, so nothing the page is built from may
  // touch the DOM or storage while it is being imported. This suite runs without a DOM.
  it.each(['./quizzes/index.ts', './app/shell.ts', './ui/index.ts', './languages/index.ts', './sources/index.ts'])(
    '%s imports without a DOM',
    async (path) => {
      expect(typeof (globalThis as { document?: unknown }).document).toBe('undefined')
      await expect(import(/* @vite-ignore */ path)).resolves.toBeDefined()
    },
  )
})

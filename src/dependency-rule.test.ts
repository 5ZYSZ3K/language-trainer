import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

// The dependency rule (see the spec's "Architecture"): the page's code never reaches into the build-time code, and
// src/core/ knows nothing about languages, sources, quiz types or texts.

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const srcDir = join(projectRoot, 'src')

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) return sourceFiles(path)
    return /\.(ts|tsx|js|mjs)$/.test(entry.name) ? [path] : []
  })
}

/** Every module a file refers to: static and dynamic imports, re-exports and `import.meta.glob` patterns. */
function specifiers(code: string): string[] {
  const patterns = [
    /\b(?:import|export)\s[^'"`;]*?\bfrom\s*['"]([^'"]+)['"]/g,
    /\bimport\s*['"]([^'"]+)['"]/g,
    /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
    /\bimport\.meta\.glob(?:<[^>]*>)?\(\s*['"]([^'"]+)['"]/g,
  ]
  return patterns.flatMap((pattern) => [...code.matchAll(pattern)].map((match) => match[1]!))
}

/** Where a specifier points, relative to the project root; bare package names are returned as they are. */
function target(file: string, specifier: string): string {
  if (specifier.startsWith('.')) return relative(projectRoot, resolve(dirname(file), specifier)).split(sep).join('/')
  // Vite resolves a leading slash from the project root.
  if (specifier.startsWith('/')) return specifier.slice(1)
  return specifier
}

const imports = sourceFiles(srcDir).flatMap((file) => {
  const from = relative(projectRoot, file).split(sep).join('/')
  return specifiers(readFileSync(file, 'utf8')).map((specifier) => ({ from, specifier, to: target(file, specifier) }))
})

describe('dependency rule', () => {
  it('finds the imports it scans (sanity check of the scanner)', () => {
    expect(imports).toContainEqual(expect.objectContaining({ from: 'src/main.ts', to: 'src/style.css' }))
    expect(imports).toContainEqual(expect.objectContaining({ from: 'src/datasets/load.ts', to: 'data/*/*/*.json' }))
  })

  it('src/ never imports from scraper/ or scripts/', () => {
    const offending = imports.filter(({ to }) => /^(scraper|scripts)(\/|$)/.test(to))
    expect(offending).toEqual([])
  })

  it('src/core/ imports only from src/core/', () => {
    const offending = imports.filter(({ from, to }) => from.startsWith('src/core/') && !to.startsWith('src/core/') && to !== 'vitest')
    expect(offending).toEqual([])
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

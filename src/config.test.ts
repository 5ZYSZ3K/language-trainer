import { readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { REPOSITORY, REPOSITORY_URL } from './config'

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')

describe('repository coordinates', () => {
  it('name the repository the package is named after', () => {
    const pkg = JSON.parse(readFileSync(join(projectRoot, 'package.json'), 'utf8')) as { name: string }
    expect(REPOSITORY.name).toBe(pkg.name)
  })

  it('point at the project page of the owner on GitHub', () => {
    expect(REPOSITORY_URL).toBe('https://github.com/5ZYSZ3K/language-trainer')
  })

  it('keep the data on main, where the datasets are committed', () => {
    expect(REPOSITORY.branch).toBe('main')
  })
})

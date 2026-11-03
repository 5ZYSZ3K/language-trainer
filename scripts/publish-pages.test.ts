import { execFileSync } from 'node:child_process'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { PublishError, publishPages } from './publish-pages'

let root: string
let extraDirs: string[]
let logged: string[]
const log = (message: string) => void logged.push(message)

/** What `publishPages` rejects with, asserted to be a PublishError (one call, one message to match). */
async function refusal(): Promise<string> {
  const error = await publishPages({ root, log }).then(() => undefined, (e: unknown) => e)
  expect(error).toBeInstanceOf(PublishError)
  return (error as PublishError).message
}

const git = (args: string[], cwd = root) => execFileSync('git', args, { cwd, encoding: 'utf8' }).trim()

async function write(path: string, content: string, base = root) {
  await mkdir(dirname(join(base, path)), { recursive: true })
  await writeFile(join(base, path), content)
}

/** A repo on `main` with a committed src/page.ts and notes.txt and a fabricated, git-ignored dist/. */
async function makeRepo() {
  root = await mkdtemp(join(tmpdir(), 'publish-pages-test-'))
  git(['init', '-q', '-b', 'main'])
  git(['config', 'user.name', 'Test Owner'])
  git(['config', 'user.email', 'owner@example.test'])
  git(['config', 'commit.gpgsign', 'false'])
  await write('notes.txt', 'a\n')
  await write('src/page.ts', 'export {}\n')
  await write('.gitignore', 'dist/\n')
  git(['add', '-A'])
  git(['commit', '-q', '-m', 'Initial'])
  await write('dist/index.html', '<html>v1</html>')
  await write('dist/.nojekyll', '')
  await write('dist/assets/app.js', 'console.log(1)')
}

/** Everything that identifies the state of the main working copy. */
const mainState = () => ({
  branch: git(['rev-parse', '--abbrev-ref', 'HEAD']),
  head: git(['rev-parse', 'HEAD']),
  status: git(['status', '--porcelain']),
  index: git(['ls-files', '--stage']),
})

const pagesFiles = () => git(['ls-tree', '-r', '--name-only', 'gh-pages']).split('\n').sort()
const worktreeCount = () => git(['worktree', 'list', '--porcelain']).split('\n').filter((l) => l.startsWith('worktree ')).length

// The owner's global git config (commit signing, hooks, excludes) must not leak into the temporary repos.
const savedEnv = { global: process.env.GIT_CONFIG_GLOBAL, nosystem: process.env.GIT_CONFIG_NOSYSTEM }
beforeAll(() => {
  process.env.GIT_CONFIG_GLOBAL = '/dev/null'
  process.env.GIT_CONFIG_NOSYSTEM = '1'
})
afterAll(() => {
  for (const [key, value] of [
    ['GIT_CONFIG_GLOBAL', savedEnv.global],
    ['GIT_CONFIG_NOSYSTEM', savedEnv.nosystem],
  ] as const) {
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
  }
})

beforeEach(async () => {
  logged = []
  extraDirs = []
  await makeRepo()
})
afterEach(async () => {
  await Promise.all([root, ...extraDirs].map((dir) => rm(dir, { recursive: true, force: true })))
})

describe('publishPages preconditions', () => {
  it('refuses to run off main', async () => {
    git(['checkout', '-q', '-b', 'feature'])
    expect(await refusal()).toMatch(/main/)
    expect(() => git(['rev-parse', '--verify', '--quiet', 'refs/heads/gh-pages'])).toThrow()
  })

  it('refuses on a detached HEAD', async () => {
    git(['checkout', '-q', '--detach'])
    await expect(publishPages({ root, log })).rejects.toThrow(/main/)
  })

  it('refuses without dist/index.html and says to build', async () => {
    await rm(join(root, 'dist', 'index.html'))
    expect(await refusal()).toMatch(/npm run build/)
  })

  it('creates nothing when it refuses', async () => {
    await rm(join(root, 'dist', 'index.html'))
    await publishPages({ root, log }).catch(() => {})
    expect(() => git(['rev-parse', '--verify', '--quiet', 'refs/heads/gh-pages'])).toThrow()
    expect(worktreeCount()).toBe(1)
  })
})

describe('publishPages', () => {
  it('the first run creates an orphan gh-pages whose tree is exactly dist/, dotfiles included, nothing from main', async () => {
    const result = await publishPages({ root, log })
    expect(result.status).toBe('published')
    expect(pagesFiles()).toEqual(['.nojekyll', 'assets/app.js', 'index.html'])
    expect(git(['rev-list', '--parents', '-n', '1', 'gh-pages']).split(' ')).toHaveLength(1) // a root commit: no parent
    expect(git(['rev-list', '--count', 'gh-pages'])).toBe('1')
  })

  it('returns the new commit', async () => {
    const result = await publishPages({ root, log })
    expect(result).toEqual({ status: 'published', commit: git(['rev-parse', 'gh-pages']) })
  })

  it('tells the owner it is a local branch and how to push it', async () => {
    await publishPages({ root, log })
    expect(logged.join('\n')).toContain('Local branch only. To publish: git push origin gh-pages')
    expect(logged.join('\n')).toContain(git(['rev-parse', '--short', 'gh-pages']))
  })

  it('a second run with unchanged dist/ makes no commit', async () => {
    await publishPages({ root, log })
    const before = git(['rev-parse', 'gh-pages'])
    logged = []
    const result = await publishPages({ root, log })
    expect(result).toEqual({ status: 'unchanged' })
    expect(git(['rev-parse', 'gh-pages'])).toBe(before)
    expect(logged.join('\n')).toContain('gh-pages already matches dist/, nothing to publish')
  })

  it('a changed dist/ adds a commit on top of the previous gh-pages commit', async () => {
    await publishPages({ root, log })
    const first = git(['rev-parse', 'gh-pages'])
    await write('dist/index.html', '<html>v2</html>')
    await rm(join(root, 'dist', 'assets'), { recursive: true })
    const result = await publishPages({ root, log })
    expect(result.status).toBe('published')
    expect(git(['rev-parse', 'gh-pages^'])).toBe(first)
    expect(git(['show', 'gh-pages:index.html'])).toBe('<html>v2</html>')
    expect(pagesFiles()).toEqual(['.nojekyll', 'index.html']) // the removed file is gone
  })

  it('names the commit after the short sha of main', async () => {
    await publishPages({ root, log })
    expect(git(['log', '-1', '--format=%s', 'gh-pages'])).toBe(`Publish build of ${git(['rev-parse', '--short', 'HEAD'])}`)
  })

  it('says so in the message when the working tree has uncommitted changes', async () => {
    await write('notes.txt', 'a\nb\n')
    await publishPages({ root, log })
    expect(git(['log', '-1', '--format=%s', 'gh-pages'])).toBe(
      `Publish build of ${git(['rev-parse', '--short', 'HEAD'])} (uncommitted changes)`,
    )
  })

  it('commits with the repository git identity', async () => {
    await publishPages({ root, log })
    expect(git(['log', '-1', '--format=%an <%ae>', 'gh-pages'])).toBe('Test Owner <owner@example.test>')
  })

  it('leaves the main working tree, index, branch and HEAD exactly as they were', async () => {
    await write('notes.txt', 'a\nb\n') // an uncommitted change that must survive
    await write('untracked.txt', 'x')
    await write('src/page.ts', 'export const staged = true\n')
    git(['add', 'src/page.ts'])
    const before = mainState()
    await publishPages({ root, log })
    expect(mainState()).toEqual(before)
    await write('dist/index.html', '<html>v2</html>')
    await publishPages({ root, log })
    expect(mainState()).toEqual(before)
  })

  it('leaves only the main worktree behind, after publishing and after finding nothing to do', async () => {
    await publishPages({ root, log })
    expect(worktreeCount()).toBe(1)
    await publishPages({ root, log })
    expect(worktreeCount()).toBe(1)
  })

  it('needs no data or word list in the repository, and says nothing about them', async () => {
    await publishPages({ root, log })
    expect(logged).toHaveLength(1) // only the "Committed ... To publish" line
  })

  it('surfaces the git message when gh-pages is checked out in another worktree', async () => {
    await publishPages({ root, log })
    const elsewhere = await mkdtemp(join(tmpdir(), 'publish-pages-elsewhere-'))
    extraDirs.push(elsewhere)
    git(['worktree', 'add', '-q', join(elsewhere, 'pages'), 'gh-pages'])
    await write('dist/index.html', '<html>v2</html>')
    await expect(publishPages({ root, log })).rejects.toThrow(/gh-pages/)
    expect(worktreeCount()).toBe(2) // main and the owner's own; ours is cleaned up
  })
})

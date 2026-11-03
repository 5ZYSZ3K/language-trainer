/**
 * Usage: npm run publish-pages  (after `npm run build`)
 *
 * Commits dist/ on top of the local gh-pages branch (created as an orphan branch if it does not exist yet),
 * through a temporary git worktree, so the main working tree, its index and its branch are never touched.
 * It does not build and does not push; it prints the push command. See "Deployment" in the README.
 */
import { execFile } from 'node:child_process'
import { realpathSync } from 'node:fs'
import { cp, mkdtemp, readdir, readFile, rm, stat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'
import type { ExerciseData } from '../src/core/cell'
import { verbPresentTense } from '../src/quizzes/verb-present-tense'
import { parseVerbList } from '../scraper/verb-list'

const execFileAsync = promisify(execFile)

const BRANCH = 'gh-pages'

/** Something the owner has to fix before publishing; printed without a stack trace. */
export class PublishError extends Error {}

export interface PublishOptions {
  /** The repository root (where czech_verbs.txt and dist/ are). */
  root: string
  log: (message: string) => void
}

export type PublishResult = { status: 'unchanged' } | { status: 'published'; commit: string }

interface GitResult {
  code: number
  stdout: string
  stderr: string
}

/** Runs git and reports its exit code instead of throwing; only a failure to start git throws. */
async function run(cwd: string, args: string[]): Promise<GitResult> {
  try {
    const { stdout, stderr } = await execFileAsync('git', args, { cwd })
    return { code: 0, stdout, stderr }
  } catch (error) {
    const { code, stdout, stderr } = error as { code?: unknown; stdout?: string; stderr?: string }
    if (typeof code !== 'number') throw error
    return { code, stdout: stdout ?? '', stderr: stderr ?? '' }
  }
}

/** Runs git and returns its trimmed output. A failure becomes a PublishError carrying git's own message. */
async function git(cwd: string, args: string[]): Promise<string> {
  const { code, stdout, stderr } = await run(cwd, args)
  if (code !== 0) throw new PublishError(`git ${args.join(' ')} failed:\n${stderr.trim()}`)
  return stdout.trim()
}

async function exists(path: string): Promise<boolean> {
  try {
    await stat(path)
    return true
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false
    throw error
  }
}

/** Checks everything that can be checked before touching git, and returns the prompts in the built data file. */
async function checkPreconditions(root: string): Promise<string[]> {
  const branch = await git(root, ['rev-parse', '--abbrev-ref', 'HEAD'])
  if (branch !== 'main') {
    throw new PublishError(`Publish from main, not from ${branch === 'HEAD' ? 'a detached HEAD' : branch}. Run: git switch main`)
  }

  const dist = join(root, 'dist')
  if (!(await exists(join(dist, 'index.html')))) throw new PublishError('dist/index.html is missing. Run: npm run build')

  const dataPath = `dist/data/${verbPresentTense.id}.json`
  const remedy = 'Run: npm run scrape, then npm run build'
  let text: string
  try {
    text = await readFile(join(root, dataPath), 'utf8')
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') throw new PublishError(`${dataPath} is missing. ${remedy}`)
    throw error
  }
  let data: ExerciseData
  try {
    data = JSON.parse(text) as ExerciseData
  } catch {
    throw new PublishError(`${dataPath} is not valid JSON. ${remedy}`)
  }
  if (!Array.isArray(data.items) || data.items.length === 0) {
    throw new PublishError(`${dataPath} has no verbs, so the site would be empty. ${remedy}`)
  }
  return data.items.map((item) => item.prompt)
}

export async function publishPages({ root, log }: PublishOptions): Promise<PublishResult> {
  const promptsInBuiltData = await checkPreconditions(root)

  const present = new Set(promptsInBuiltData)
  const listed = [...new Set(parseVerbList(await readFile(join(root, 'czech_verbs.txt'), 'utf8')))]
  const missing = listed.filter((verb) => !present.has(verb))
  if (missing.length > 0) {
    log(`${missing.length} of ${listed.length} listed verbs are missing from the data and will not be on the site: ${missing.join(', ')}`)
  }

  const dirty = (await git(root, ['status', '--porcelain'])) !== ''
  const sha = await git(root, ['rev-parse', '--short', 'HEAD'])
  const branchExists = (await run(root, ['rev-parse', '--verify', '--quiet', `refs/heads/${BRANCH}`])).code === 0

  // A worktree of its own, so the main working tree, index, branch and HEAD stay exactly as they are.
  const worktree = await mkdtemp(join(tmpdir(), 'publish-pages-'))
  try {
    if (branchExists) {
      await git(root, ['worktree', 'add', '-q', worktree, BRANCH])
    } else {
      await git(root, ['worktree', 'add', '-q', '--detach', worktree, 'HEAD'])
      await git(worktree, ['checkout', '-q', '--orphan', BRANCH])
      await git(worktree, ['rm', '-rf', '--quiet', '.'])
    }

    for (const entry of await readdir(worktree)) {
      if (entry !== '.git') await rm(join(worktree, entry), { recursive: true, force: true })
    }
    await cp(join(root, 'dist'), worktree, { recursive: true })
    await git(worktree, ['add', '-A'])

    if (branchExists) {
      const diff = await run(worktree, ['diff', '--cached', '--quiet'])
      if (diff.code > 1) throw new PublishError(`git diff --cached failed:\n${diff.stderr.trim()}`)
      if (diff.code === 0) {
        log(`${BRANCH} already matches dist/, nothing to publish`)
        return { status: 'unchanged' }
      }
    }

    await git(worktree, ['commit', '-q', '-m', `Publish build of ${sha}${dirty ? ' (uncommitted changes)' : ''}`])
    const commit = await git(worktree, ['rev-parse', 'HEAD'])
    log(`Committed ${commit.slice(0, 7)} to ${BRANCH}. Local branch only. To publish: git push origin ${BRANCH}`)
    return { status: 'published', commit }
  } finally {
    // Cleaning up must never hide the error that got us here.
    await run(root, ['worktree', 'remove', '--force', worktree]).catch(() => {})
    await rm(worktree, { recursive: true, force: true })
  }
}

const isEntryPoint = process.argv[1] !== undefined && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))
if (isEntryPoint) {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
  publishPages({ root, log: console.log }).catch((error: unknown) => {
    console.error(error instanceof PublishError ? error.message : error)
    process.exitCode = 1
  })
}

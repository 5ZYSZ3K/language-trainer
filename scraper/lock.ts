import { readFileSync, unlinkSync } from 'node:fs'
import { readFile, unlink, writeFile } from 'node:fs/promises'

/** Another scrape holds the lock. `pid` is its process id when the lock file said. */
export class LockHeldError extends Error {
  constructor(
    readonly file: string,
    readonly pid?: number,
  ) {
    super(`${file} is held${pid === undefined ? '' : ` by process ${pid}`}`)
  }
}

export interface Lock {
  /**
   * Removes the lock file if it still holds this process's PID. Synchronous so it can run from a signal
   * handler or `process.on('exit')`; safe to call more than once.
   */
  release(): void
}

export interface LockOptions {
  /** Defaults to this process. */
  pid?: number
  /** Defaults to asking the OS with signal 0. */
  isAlive?: (pid: number) => boolean
}

function processIsAlive(pid: number): boolean {
  try {
    process.kill(pid, 0)
    return true
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code
    if (code === 'ESRCH') return false
    if (code === 'EPERM') return true // exists, but belongs to someone else
    throw error
  }
}

const isMissing = (error: unknown) => (error as NodeJS.ErrnoException).code === 'ENOENT'

/** The PID in a lock file, or undefined if the file is gone, empty or not a PID. */
async function readHolder(file: string): Promise<number | undefined> {
  let text: string
  try {
    text = await readFile(file, 'utf8')
  } catch (error) {
    if (isMissing(error)) return undefined
    throw error
  }
  const pid = /^\d+$/.test(text.trim()) ? Number(text) : 0
  return pid > 0 ? pid : undefined
}

/**
 * Takes the lock by creating `file` exclusively, containing this process's PID. A lock whose process is dead
 * (or whose content is not a PID) is left over from a crash and is replaced. Throws LockHeldError if a live
 * process holds it.
 */
export async function acquireLock(file: string, options: LockOptions = {}): Promise<Lock> {
  const { pid = process.pid, isAlive = processIsAlive } = options

  for (let attempt = 0; ; attempt++) {
    try {
      await writeFile(file, String(pid), { flag: 'wx' })
      break
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error
      const holder = await readHolder(file)
      // Losing the race to a second process on the retry means someone else just took it: not stale.
      if (attempt > 0 || (holder !== undefined && isAlive(holder))) throw new LockHeldError(file, holder)
      await unlink(file).catch((e: unknown) => {
        if (!isMissing(e)) throw e
      })
    }
  }

  return {
    release() {
      try {
        if (readFileSync(file, 'utf8').trim() === String(pid)) unlinkSync(file)
      } catch (error) {
        if (!isMissing(error)) throw error
      }
    },
  }
}

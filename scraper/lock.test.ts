import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { acquireLock, LockHeldError } from './lock'

let dir: string
let file: string
beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'lock-'))
  file = join(dir, '.scrape.lock')
})
afterEach(async () => {
  await rm(dir, { recursive: true, force: true })
})

describe('acquireLock', () => {
  it('creates the lock file containing the PID', async () => {
    await acquireLock(file, { pid: 4242 })
    expect(await readFile(file, 'utf8')).toBe('4242')
  })

  it('refuses while the process that holds the lock is alive', async () => {
    await writeFile(file, '999')
    const error = await acquireLock(file, { pid: 1, isAlive: () => true }).catch((e: unknown) => e)
    expect(error).toBeInstanceOf(LockHeldError)
    expect((error as LockHeldError).pid).toBe(999)
    expect((error as LockHeldError).message).toContain(file)
    expect(await readFile(file, 'utf8')).toBe('999') // left alone
  })

  it('asks about the PID found in the file', async () => {
    await writeFile(file, '999\n')
    const asked: number[] = []
    await acquireLock(file, {
      pid: 1,
      isAlive: (pid) => {
        asked.push(pid)
        return false
      },
    })
    expect(asked).toEqual([999])
  })

  it('replaces a stale lock whose process is dead', async () => {
    await writeFile(file, '999')
    await acquireLock(file, { pid: 4242, isAlive: () => false })
    expect(await readFile(file, 'utf8')).toBe('4242')
  })

  it.each([['empty', ''], ['garbage', 'not a pid'], ['a negative number', '-5'], ['zero', '0']])(
    'replaces a lock with %s content',
    async (_name, content) => {
      await writeFile(file, content)
      await acquireLock(file, { pid: 4242, isAlive: () => true })
      expect(await readFile(file, 'utf8')).toBe('4242')
    },
  )

  it('treats this very process as alive by default', async () => {
    await writeFile(file, String(process.pid))
    await expect(acquireLock(file)).rejects.toBeInstanceOf(LockHeldError)
  })

  it('treats a process that has exited as dead by default', async () => {
    const finished = spawnSync(process.execPath, ['-e', '']).pid
    await writeFile(file, String(finished))
    await acquireLock(file)
    expect(await readFile(file, 'utf8')).toBe(String(process.pid))
  })
})

describe('Lock.release', () => {
  it('removes the lock file, synchronously', async () => {
    const lock = await acquireLock(file, { pid: 4242 })
    lock.release()
    expect(existsSync(file)).toBe(false)
  })

  it('is safe to call twice', async () => {
    const lock = await acquireLock(file, { pid: 4242 })
    lock.release()
    expect(() => lock.release()).not.toThrow()
  })

  it('does not remove a lock that is now owned by another PID', async () => {
    const lock = await acquireLock(file, { pid: 4242 })
    await writeFile(file, '777')
    lock.release()
    expect(readFileSync(file, 'utf8')).toBe('777')
  })

  it('lets the next scrape take the lock', async () => {
    const lock = await acquireLock(file, { pid: 4242, isAlive: () => true })
    lock.release()
    await acquireLock(file, { pid: 5555, isAlive: () => true })
    expect(await readFile(file, 'utf8')).toBe('5555')
  })
})

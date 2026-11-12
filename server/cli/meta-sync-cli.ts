/**
 * Image entry for the manual Meta CLI. Replaces this process (process.execve)
 * with a CLI-sized heap (default 256 MB, via execArgv --max-old-space-size)
 * so it does not inherit the website's --max-old-space-size=640, then loads
 * the job bundle next to this file. execve leaves no wrapper process. If
 * execve is unavailable, the wrapper spawns the job, forwards
 * SIGTERM/SIGINT/SIGHUP, and waits so the SQLite lock and staging are
 * released first. The child also exits if the wrapper dies (IPC / ppid).
 */
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import {
  attachForwardedChild,
  execveMetaSyncCli,
  metaSyncCliHeapAlreadyApplied,
  metaSyncCliReexecArgs,
  resolveMetaSyncCliNodeOptions,
  shouldSpawnMetaSyncCliWrapper,
} from '../utils/metaSyncCliHeap'

const here = fileURLToPath(import.meta.url)

if (!metaSyncCliHeapAlreadyApplied()) {
  if (!shouldSpawnMetaSyncCliWrapper()) {
    try {
      execveMetaSyncCli(here)
    } catch {
      /* fall through to spawn */
    }
  }
  const child = spawn(process.execPath, metaSyncCliReexecArgs(here), {
    stdio: ['inherit', 'inherit', 'inherit', 'ipc'],
    env: {
      ...process.env,
      NODE_OPTIONS: resolveMetaSyncCliNodeOptions(process.env),
    },
  })
  attachForwardedChild(child)
} else {
  await import('./meta-sync-job.mjs')
}

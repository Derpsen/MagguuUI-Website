/**
 * Image entry for the manual Meta CLI. Re-execs with a CLI-sized heap
 * (default 256 MB, via execArgv --max-old-space-size) so it does not inherit
 * the website's --max-old-space-size=640, then loads the job bundle next to
 * this file. SIGTERM/SIGINT are forwarded to the child; the wrapper waits
 * for it to exit so the SQLite lock and staging are released first.
 */
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import {
  attachForwardedChild,
  metaSyncCliHeapAlreadyApplied,
  metaSyncCliReexecArgs,
  resolveMetaSyncCliNodeOptions,
} from '../utils/metaSyncCliHeap'

const here = fileURLToPath(import.meta.url)

if (!metaSyncCliHeapAlreadyApplied()) {
  const child = spawn(process.execPath, metaSyncCliReexecArgs(here), {
    stdio: 'inherit',
    env: {
      ...process.env,
      NODE_OPTIONS: resolveMetaSyncCliNodeOptions(process.env),
    },
  })
  attachForwardedChild(child)
} else {
  await import('./meta-sync-job.mjs')
}

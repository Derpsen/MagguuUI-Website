/**
 * Image entry for the manual Meta CLI. Re-execs with a CLI-sized heap
 * (default 256 MB) so it does not inherit the website's --max-old-space-size=640,
 * then loads the job bundle next to this file.
 */
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import {
  META_SYNC_CLI_HEAP_APPLIED_ENV,
  metaSyncCliHeapAlreadyApplied,
  resolveMetaSyncCliNodeOptions,
} from '../utils/metaSyncCliHeap'

const here = fileURLToPath(import.meta.url)

if (!metaSyncCliHeapAlreadyApplied()) {
  const child = spawn(process.execPath, [here, ...process.argv.slice(2)], {
    stdio: 'inherit',
    env: {
      ...process.env,
      NODE_OPTIONS: resolveMetaSyncCliNodeOptions(process.env),
      [META_SYNC_CLI_HEAP_APPLIED_ENV]: '1',
    },
  })
  child.on('exit', (code, signal) => {
    if (signal) {
      process.exit(1)
      return
    }
    process.exit(code ?? 1)
  })
} else {
  await import('./meta-sync-job.mjs')
}

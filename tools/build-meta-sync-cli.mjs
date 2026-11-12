/**
 * Bundle the manual Meta CLI into the Nitro server output so Unraid can
 * run `node .output/server/meta-sync-cli.mjs` via docker exec.
 * The wrapper re-execs with a CLI-sized heap; the job bundle is
 * meta-sync-job.mjs next to it. better-sqlite3 stays external.
 */
import * as esbuild from 'esbuild'
import { builtinModules } from 'node:module'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const nodeExternals = [
  ...builtinModules,
  ...builtinModules.map((name) => `node:${name}`),
]

const defaultRepoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')

const shared = {
  platform: 'node',
  format: 'esm',
  target: 'node22',
  legalComments: 'none',
}

export async function buildMetaSyncCli(input = {}) {
  const repoRoot = resolve(input.repoRoot || defaultRepoRoot)
  const outFile = input.outFile || join(repoRoot, '.output', 'server', 'meta-sync-cli.mjs')
  const jobFile = input.jobFile || join(dirname(outFile), 'meta-sync-job.mjs')
  const logLevel = input.logLevel || 'warning'
  await esbuild.build({
    ...shared,
    absWorkingDir: repoRoot,
    entryPoints: [join(repoRoot, 'server/cli/meta-sync.ts')],
    outfile: jobFile,
    bundle: true,
    // ofetch's CJS build calls require("node:http"). A bare ESM bundle
    // throws "Dynamic require of node:http is not supported"; createRequire
    // plus marking Node builtins as external fixes that in the image.
    banner: {
      js: "import { createRequire as __metaSyncCreateRequire } from 'node:module'; const require = __metaSyncCreateRequire(import.meta.url);",
    },
    external: ['better-sqlite3', ...nodeExternals],
    alias: {
      '~': repoRoot,
      '~~': repoRoot,
    },
    logLevel,
  })
  await esbuild.build({
    ...shared,
    absWorkingDir: repoRoot,
    entryPoints: [join(repoRoot, 'server/cli/meta-sync-cli.ts')],
    outfile: outFile,
    bundle: true,
    // The job is a sibling file in the image; do not inline it into the wrapper.
    external: ['./meta-sync-job.mjs', ...nodeExternals],
    logLevel,
  })
  return outFile
}

const isDirect = process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])
if (isDirect) {
  const outFile = await buildMetaSyncCli({
    repoRoot: process.argv[2],
    outFile: process.argv[3],
    jobFile: process.argv[4],
  })
  process.stdout.write(`${outFile}\n`)
}

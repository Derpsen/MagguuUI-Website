/**
 * Bundle server/cli/meta-sync.ts into the Nitro server output so Unraid can
 * run `node .output/server/meta-sync-cli.mjs` via docker exec.
 * better-sqlite3 stays external (native addon already in the server node_modules).
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

export async function buildMetaSyncCli(input = {}) {
  const repoRoot = resolve(input.repoRoot || defaultRepoRoot)
  const outFile = input.outFile || join(repoRoot, '.output', 'server', 'meta-sync-cli.mjs')
  await esbuild.build({
    absWorkingDir: repoRoot,
    entryPoints: [join(repoRoot, 'server/cli/meta-sync.ts')],
    outfile: outFile,
    bundle: true,
    platform: 'node',
    format: 'esm',
    target: 'node22',
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
    legalComments: 'none',
    logLevel: input.logLevel || 'warning',
  })
  return outFile
}

const isDirect = process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])
if (isDirect) {
  const outFile = await buildMetaSyncCli({
    repoRoot: process.argv[2],
    outFile: process.argv[3],
  })
  process.stdout.write(`${outFile}\n`)
}

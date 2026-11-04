import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

// Nuxt auto-imports every export of utils/ and composables/ (and Nitro every export of server/utils/).
// Two files exporting the same name make the build bind one of them silently ("Duplicated imports").
const ROOT = join(import.meta.dirname, '..', '..')
const EXPORT_RE = /^export\s+(?:async\s+)?(?:function\*?|const|let|class|type|interface|enum)\s+([A-Za-z_$][\w$]*)/gm

function exportsOf(dir: string, root = ROOT): Map<string, string[]> {
  const seen = new Map<string, string[]>()
  for (const sub of dir.split(',')) {
    const abs = join(root, sub)
    for (const f of readdirSync(abs)) {
      if (!/\.ts$/.test(f) || f.endsWith('.d.ts')) continue
      for (const m of readFileSync(join(abs, f), 'utf8').matchAll(EXPORT_RE)) {
        const name = m[1]!
        seen.set(name, [...(seen.get(name) ?? []), `${sub}/${f}`])
      }
    }
  }
  return seen
}

function collisions(dir: string, root = ROOT): string[] {
  return [...exportsOf(dir, root)].filter(([, files]) => new Set(files).size > 1).map(([n, files]) => `${n}: ${[...new Set(files)].join(', ')}`)
}

describe('auto-import scope has no duplicate export names', () => {
  it('utils + composables', () => assert.deepEqual(collisions('utils,composables'), []))
  it('server/utils', () => assert.deepEqual(collisions('server/utils'), []))
  it('the scanner reports a planted duplicate', () => {
    const tmp = mkdtempSync(join(tmpdir(), 'aic-'))
    try {
      mkdirSync(join(tmp, 'a')); mkdirSync(join(tmp, 'b'))
      writeFileSync(join(tmp, 'a', 'one.ts'), 'export function dup() {}\nexport type Only = 1\n')
      writeFileSync(join(tmp, 'b', 'two.ts'), 'export const dup = 1\n')
      assert.deepEqual(collisions('a,b', tmp), ['dup: a/one.ts, b/two.ts'])
    } finally { rmSync(tmp, { recursive: true, force: true }) }
  })
})

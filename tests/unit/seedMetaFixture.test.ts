import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'

const script = fileURLToPath(new URL('../../scripts/seed-meta-fixture.ts', import.meta.url))
const source = readFileSync(script, 'utf8')

describe('seed-meta-fixture production guard', () => {
  it('refuses production before any server/database import, and CI=true is not a bypass', () => {
    const guard = source.indexOf("NUXT_ALLOW_META_FIXTURE_SEED")
    const firstImport = source.indexOf("await import(")
    assert.ok(guard >= 0)
    assert.ok(firstImport > guard, 'dynamic imports must come after the production guard')
    assert.doesNotMatch(source, /^import .+ from ['"]\.\.\/server\/database['"]/m)
    assert.doesNotMatch(source, /process\.env\.CI/)
    assert.doesNotMatch(source, /process\.env\.GITHUB_ACTIONS/)

    const result = spawnSync(process.execPath, ['--import', 'tsx', script], {
      encoding: 'utf8',
      env: {
        ...process.env,
        NODE_ENV: 'production',
        CI: 'true',
        GITHUB_ACTIONS: 'true',
        NUXT_ALLOW_META_FIXTURE_SEED: '',
      },
    })
    assert.equal(result.status, 1)
    assert.match(result.stderr + result.stdout, /NUXT_ALLOW_META_FIXTURE_SEED=true/)
    assert.match(result.stderr + result.stdout, /Never run this on Unraid/)
  })
})

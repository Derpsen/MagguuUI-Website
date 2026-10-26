// The docs-drift template (docs/templates/docs-drift) is meant to be copied into other repos, so it must stay
// runnable and identical to the script this repo uses.
import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, writeFileSync, readFileSync, mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../../', import.meta.url))
const read = (p: string) => readFileSync(join(root, p), 'utf8')
const script = join(root, 'docs/templates/docs-drift/docs-drift.sh')

function run(files: Record<string, string>, rules: string) {
  const dir = mkdtempSync(join(tmpdir(), 'mgdrift-'))
  for (const [name, body] of Object.entries(files)) {
    mkdirSync(join(dir, name, '..'), { recursive: true })
    writeFileSync(join(dir, name), body)
  }
  mkdirSync(join(dir, '.github'), { recursive: true })
  writeFileSync(join(dir, '.github/docs-drift-rules.txt'), rules)
  const r = spawnSync('bash', [script], { cwd: dir, encoding: 'utf8', timeout: 30_000, killSignal: 'SIGKILL' })
  return { code: r.status, out: r.stdout, err: r.stderr }
}
const T = '\t'

describe('docs-drift template script', () => {
  test('is the same script as the one this repo runs (apart from the neutral header wording)', () => {
    const norm = (s: string) => s.replace('generic docs drift check for Magguu repos. Copy 1:1', 'generic docs drift check. Copy 1:1')
    assert.equal(read('docs/templates/docs-drift/docs-drift.sh'), norm(read('tools/docs-drift.sh')))
  })

  test('reports a hit with file:line and reason (exit 1)', () => {
    const r = run({ 'README.md': 'fine\nuse OldName here\n' }, `@files README*.md\n\\bOldName\\b${T}old name\n`)
    assert.equal(r.code, 1)
    assert.match(r.out, /README\.md:2: old name/)
  })

  test('a global allow (history line) and a rule allow-regex suppress the hit', () => {
    const rules = `@files README*.md\n@allow \\(2026-[0-9]{2}-[0-9]{2}: \nOldName${T}old name${T}formerly\n`
    const r = run({ 'README.md': '(2026-10-26: OldName was removed)\nformerly OldName\n' }, rules)
    assert.equal(r.code, 0, r.out)
  })

  test('the "!" allow ignores the global allow, and the file-regex scopes a rule', () => {
    const rules = `@files *.md\n@allow history\nsha256:[0-9a-f]{6,}${T}digest${T}!${T}^AGENTS\\.md$\n`
    const bad = run({ 'AGENTS.md': 'history sha256:abcdef12\n' }, rules)
    assert.equal(bad.code, 1)
    const scoped = run({ 'README.md': 'sha256:abcdef12\n' }, rules)
    assert.equal(scoped.code, 0, scoped.out)
  })

  test('clean docs exit 0; a missing rules file or a rule without TAB exits 2', () => {
    assert.equal(run({ 'README.md': 'ok\n' }, `@files README*.md\nOldName${T}x\n`).code, 0)
    assert.equal(run({ 'README.md': 'ok\n' }, `@files README*.md\nOldName without tab\n`).code, 2)
    assert.equal(run({ 'README.md': 'ok\n' }, `@files README*.md\n@bogus\n`).code, 2)
    const r = spawnSync('bash', [script, 'does-not-exist.txt'], { cwd: tmpdir(), encoding: 'utf8', timeout: 30_000, killSignal: 'SIGKILL' })
    assert.equal(r.status, 2)
  })
})

describe('docs-drift template files', () => {
  test('workflow has the three modes, a pinned checkout and least-privilege permissions', () => {
    const wf = read('docs/templates/docs-drift/docs-drift.yml')
    for (const m of ['issue', 'warn', 'fail']) assert.match(wf, new RegExp(`env\\.MODE == '${m}'`))
    assert.match(wf, /DOCS_DRIFT_MODE/)
    assert.match(wf, /actions\/checkout@[0-9a-f]{40}/)
    assert.match(wf, /contents: read/)
    assert.doesNotMatch(wf, /Derpsen|magguu/i)
  })
  test('the example rules file and the README are repo independent and parse cleanly', () => {
    const rules = read('docs/templates/docs-drift/docs-drift-rules.example.txt')
    assert.doesNotMatch(rules, /Derpsen|magguu|ui\.magguu/i)
    const r = run({ 'README.md': 'nothing to see\n' }, rules)
    assert.equal(r.code, 0, r.out + r.err)
    const readme = read('docs/templates/docs-drift/README.md')
    for (const needle of ['DOCS_DRIFT_MODE', '@files', '@allow', '@health-url', 'fail', 'warn']) assert.ok(readme.includes(needle), needle)
    assert.doesNotMatch(readme, /Derpsen|ui\.magguu/i)
  })
})

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'

function workflow(name: string): string {
  return readFileSync(new URL(`../../.github/workflows/${name}`, import.meta.url), 'utf8')
}

/** Slice the top-level `on:` / `concurrency:` mapping (stops at the next top-level key). */
function topLevelBlock(src: string, key: 'on' | 'concurrency'): string {
  const match = src.match(new RegExp(`^${key}:\\n`, 'm'))
  assert.ok(match && match.index !== undefined, `missing top-level ${key}:`)
  const start = match.index + match[0].length
  const rest = src.slice(start)
  const next = rest.search(/^[a-zA-Z].*:/m)
  return (next === -1 ? rest : rest.slice(0, next)).replace(/^[ \t]*#.*\n/gm, '')
}

function hasPushToNonMain(onBlock: string): boolean {
  // A top-level `push:` (2-space indent under `on:`) whose branches are missing
  // or include anything other than main.
  const push = onBlock.match(/^ {2}push:\n((?: {4}.+\n)*)/m)
  if (!push) return false
  const body = push[1] ?? ''
  if (!/^\s+branches:/m.test(body)) return true
  const branches = body.match(/branches:\s*\[([^\]]+)\]/)
  const list = branches?.[1]
  if (!list) return true
  const names = list.split(',').map(s => s.replace(/['"]/g, '').trim()).filter(Boolean)
  return names.some(name => name !== 'main')
}

describe('expensive CI jobs stay off feature-branch pushes', () => {
  it('Lighthouse, link-check and Quality do not push on feature branches', () => {
    const lighthouseOn = topLevelBlock(workflow('lighthouse.yml'), 'on')
    const linkOn = topLevelBlock(workflow('link-check.yml'), 'on')
    const qualityOn = topLevelBlock(workflow('quality.yml'), 'on')

    assert.equal(/^\s+push:/m.test(lighthouseOn), false, 'lighthouse.yml must not have a push trigger')
    assert.equal(/^\s+push:/m.test(linkOn), false, 'link-check.yml must not have a push trigger')
    assert.match(lighthouseOn, /^\s+pull_request:/m)
    assert.match(linkOn, /^\s+pull_request:/m)
    assert.match(qualityOn, /^\s+pull_request:/m)
    assert.equal(hasPushToNonMain(qualityOn), false, 'quality.yml push must stay on main only')
  })

  it('those advisory workflows cancel superseded runs on the same ref', () => {
    for (const name of ['lighthouse.yml', 'link-check.yml', 'quality.yml']) {
      const block = topLevelBlock(workflow(name), 'concurrency')
      assert.match(block, /cancel-in-progress:\s*true/, name)
      assert.match(block, /github\.ref/, `${name} concurrency must be per-ref`)
    }
  })

  it('does not cancel an in-progress docker publish on main or a version tag', () => {
    const block = topLevelBlock(workflow('docker.yml'), 'concurrency')
    assert.match(block, /cancel-in-progress:\s*false/)
    assert.match(block, /docker-\$\{\{\s*github\.ref\s*\}\}/)
  })
})

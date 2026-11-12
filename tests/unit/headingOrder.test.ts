import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'

function page(name: string): string {
  return readFileSync(new URL(`../../pages/${name}`, import.meta.url), 'utf8')
}

describe('guide and changelog heading order', () => {
  it('renders guide steps as h2 after the page h1 (no h1→h3 skip)', () => {
    const src = page('guide.vue')
    assert.match(src, /<h1[\s>][\s\S]*Installation Guide/)
    assert.match(src, /<h2 class="guide-step__title"/)
    assert.doesNotMatch(src, /<h3 class="guide-step__title"/)
  })

  it('gives changelog a page h1 and keeps every version as h2', () => {
    const src = page('changelog.vue')
    assert.match(src, /<h1 class="[^"]*"[^>]*>Changelog<\/h1>/)
    assert.match(src, /<h2\s+class="font-mono font-semibold[\s\S]*\{\{\s*release\.version\s*\}\}\s*<\/h2>/)
    assert.doesNotMatch(src, /isCurrent\([^)]*\)[^\n]*'h1'/)
    assert.doesNotMatch(src, /filtering \? 'h1'/)
  })
})

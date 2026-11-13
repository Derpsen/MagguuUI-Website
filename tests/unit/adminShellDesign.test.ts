import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, it } from 'node:test'
import { contrastRatio } from '../../utils/metaCatalog'

/** Redesign PR 5a: the admin shell sits on the `--mg-*` tokens (visual only; no auth, session or routing code). */
const read = (p: string) => readFileSync(join(process.cwd(), p), 'utf8')
const tokens = read('assets/css/tokens.css')
const admin = read('assets/css/admin.css')
const layout = read('layouts/admin.vue')
const tabBar = read('components/admin/TabBar.vue')

function block(css: string, selector: string): Record<string, string> {
  const start = css.indexOf(`${selector} {`)
  assert.ok(start >= 0, `${selector} block missing`)
  const body = css.slice(css.indexOf('{', start) + 1, css.indexOf('}', start))
  return Object.fromEntries([...body.matchAll(/--mg-([a-z0-9-]+):\s*(#[0-9a-fA-F]{6})\s*;/g)].map(m => [m[1]!, m[2]!]))
}

describe('admin shell design (PR 5a)', () => {
  it('the token scope includes .admin-shell in the shared, dark and light blocks', () => {
    assert.match(tokens, /\n\.admin-shell,\n\.public-shell \{/)
    assert.match(tokens, /\nhtml\.dark \.admin-shell,\nhtml\.dark \.public-shell \{/)
    assert.match(tokens, /\nhtml:not\(\.dark\) \.admin-shell,\nhtml:not\(\.dark\) \.public-shell \{/)
  })

  it('the --admin-* variables are aliases of the tokens, in both themes', () => {
    const start = admin.indexOf('html.dark .admin-shell,\nhtml:not(.dark) .admin-shell {')
    assert.ok(start >= 0, 'PR 5a block missing in admin.css')
    const body = admin.slice(start, admin.indexOf('}', start))
    const alias: Record<string, string> = {
      '--admin-bg-deep': 'var(--mg-bg)',
      '--admin-fg': 'var(--mg-fg)',
      '--admin-fg-muted': 'var(--mg-fg-muted)',
      '--admin-fg-faint': 'var(--mg-fg-subtle)',
      '--admin-border': 'var(--mg-line)',
      '--admin-border-strong': 'var(--mg-line-strong)',
      '--admin-sidebar': 'var(--mg-surface)',
      '--admin-header': 'var(--mg-surface)',
      '--admin-label': 'var(--mg-accent-text)',
      '--admin-accent': 'var(--mg-accent-text)',
    }
    for (const [name, value] of Object.entries(alias)) assert.ok(body.includes(`${name}: ${value};`), `${name} must be ${value}`)
  })

  it('the shell and the tab bar have no isDark class bindings and no hard-coded palette', () => {
    for (const [name, src] of [['layouts/admin.vue', layout], ['components/admin/TabBar.vue', tabBar]] as const) {
      assert.doesNotMatch(src, /:class="[^"]*isDark \? '[^']*(bg|text|border|from|hover)-/, `${name}: isDark class binding`)
      assert.doesNotMatch(src, /\[#0b1118\]|\[#dbe3ec\]|\[hsl\(|white\/\d|slate-\d|silver-\d/, `${name}: legacy palette class`)
    }
    // The notification bell badge uses the token badge, not red-500 + white text.
    assert.match(layout, /class="admin-notif-badge"/)
    assert.doesNotMatch(layout, /bg-red-500/)
  })

  it('the dashboard labels and links use the token accent, not brand steps', () => {
    const dash = admin.slice(admin.indexOf('/* ── Dashboard (plain sections'))
    const labels = dash.slice(0, dash.indexOf('.admin-dash__label { margin-bottom'))
    assert.match(labels, /color: var\(--admin-label\);/)
    assert.doesNotMatch(labels, /color-brand/)
    assert.match(dash, /\.admin-dash__link \{[^}]*color: var\(--admin-label\)/)
    assert.match(dash, /\.admin-dash__bad \{ color: var\(--mg-danger\)/)
  })

  it('the bell badge (danger fill, page colour on top) is AA in both themes', () => {
    for (const selector of ['html.dark .public-shell', 'html:not(.dark) .public-shell']) {
      const t = block(tokens, selector)
      assert.match(admin, /\.admin-notif-badge \{[^}]*background: var\(--mg-danger\);[^}]*color: var\(--mg-bg\);/)
      const ratio = contrastRatio(t['bg']!, t['danger']!)
      assert.ok(ratio >= 4.5, `${selector}: badge text ${ratio.toFixed(2)}`)
    }
  })
})

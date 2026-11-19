import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, it } from 'node:test'
import { contrastRatio } from '../../utils/contrast'

/** Redesign PR 5a: the admin shell sits on the `--mg-*` tokens (visual only; no auth, session or routing code). */
const read = (p: string) => readFileSync(join(process.cwd(), p), 'utf8')
const tokens = read('assets/css/tokens.css')
const admin = read('assets/css/admin.css')
const layout = read('layouts/admin.vue')
const tabBar = read('components/admin/TabBar.vue')
const drawer = read('components/admin/SettingsDrawer.vue')

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
    assert.match(dash, /\.admin-dash__type \{[^}]*overflow-wrap: anywhere/)
    assert.match(dash, /\.admin-dash__row \{[^}]*min-width: 0/)
  })

  it('the bell badge (danger fill, page colour on top) is AA in both themes', () => {
    for (const selector of ['html.dark .public-shell', 'html:not(.dark) .public-shell']) {
      const t = block(tokens, selector)
      assert.match(admin, /\.admin-notif-badge \{[^}]*background: var\(--mg-danger\);[^}]*color: var\(--mg-bg\);/)
      const ratio = contrastRatio(t['bg']!, t['danger']!)
      assert.ok(ratio >= 4.5, `${selector}: badge text ${ratio.toFixed(2)}`)
    }
  })

  it('does not nest the close button inside the tab link', () => {
    assert.match(tabBar, /<nav class="[^"]*" aria-label="Open admin pages"/)
    assert.match(tabBar, /aria-current="isActive\(tab.path\) \? 'page' : undefined"/)
    assert.match(tabBar, /Close tab \$\{tab\.label\}/)
    assert.doesNotMatch(tabBar, /role="tablist"/)
    assert.doesNotMatch(tabBar, /role="tab"/)
    assert.doesNotMatch(tabBar, /<NuxtLink[\s\S]*?<button[\s\S]*?<\/NuxtLink>/)
  })

  it('lets Tailwind hide desktop-only header actions on small viewports', () => {
    assert.doesNotMatch(layout, /\.vben-header-btn \{[^}]*display:\s*inline-flex/)
    assert.match(layout, /nav class="[^"]*flex-1[^"]*overflow-hidden[^"]*"/)
    assert.match(layout, /vben-header-btn hidden md:inline-flex/)
    assert.match(layout, /vben-header-btn inline-flex md:hidden/)
    assert.match(layout, /aria-label="More actions"/)
    assert.match(layout, /aria-controls="admin-header-more-panel"/)
    assert.match(layout, /id="admin-header-more-panel"/)
    assert.match(layout, /onMoreEscape/)
    assert.match(layout, /onMoreFocusOut/)
    assert.doesNotMatch(layout, /aria-haspopup/)
    assert.doesNotMatch(layout, /role="menu"/)
    assert.doesNotMatch(layout, /role="menuitem"/)
    assert.match(layout, /openSettingsFromMenu/)
    assert.match(layout, /toggleFullscreenFromMenu/)
    assert.match(layout, /async function toggleFullscreenFromMenu\(\) \{[\s\S]*?closeMoreMenu\(\)[\s\S]*?restoreFullscreenFocus\(moreButtonRef\.value\)/)
    assert.match(layout, /data-testid="admin-settings-trigger"/)
    assert.match(layout, /data-testid="admin-fullscreen-trigger"/)
    assert.match(layout, /restoreFullscreenFocus/)
    assert.match(layout, /data-testid="admin-breadcrumb-current"/)
    assert.match(layout, /admin-breadcrumb-current" class="[^"]*flex-1[^"]*truncate/)
  })

  it('the settings drawer uses --mg tokens and has no faint legacy palette classes', () => {
    assert.doesNotMatch(drawer, /isDark \?/)
    assert.doesNotMatch(drawer, /text-white\/\d|text-slate-\d|bg-primary\/|\[hsl\(/)
    assert.match(drawer, /text-mg-accent-text/)
    assert.match(drawer, /bg-mg-surface/)
    assert.match(drawer, /text-mg-fg-muted/)
    assert.match(drawer, /border-mg-line/)
  })

  it('the settings drawer is a dialog that moves and restores focus', () => {
    assert.match(drawer, /role="dialog"/)
    assert.match(drawer, /aria-modal="true"/)
    assert.match(drawer, /aria-labelledby="admin-settings-title"/)
    assert.match(drawer, /function close\(\)/)
    assert.match(drawer, /function openFrom\(/)
    assert.match(drawer, /event\.key === 'Escape'/)
    assert.match(drawer, /focusAfterClose/)
    assert.match(drawer, /focusDrawer/)
    assert.match(drawer, /admin-settings-trigger/)
    assert.match(drawer, /aria-label="Close settings"/)
  })

  it('closing a tab from the keyboard moves focus to the neighbour tab', () => {
    assert.match(tabBar, /function closeTabAndMoveFocus\(/)
    assert.match(tabBar, /closeTabAndMoveFocus\(tab\.path\)/)
    assert.match(tabBar, /el\?\.focus\(\)/)
  })
})

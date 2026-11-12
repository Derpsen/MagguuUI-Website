import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, it } from 'node:test'
import { MENU_DESKTOP_QUERY, MENU_SCROLL_LOCK_CLASS, focusElement, onMenuBreakpoint, setScrollLock } from '../../utils/menuLock'

describe('menuLock: scroll lock', () => {
  it('sets and clears the class on the root element', () => {
    const classes = new Set<string>()
    const root = { classList: { toggle: (name: string, force?: boolean) => { if (force) classes.add(name); else classes.delete(name); return !!force } } }
    setScrollLock(root, true)
    assert.ok(classes.has(MENU_SCROLL_LOCK_CLASS))
    setScrollLock(root, false)
    assert.equal(classes.size, 0)
  })
})

describe('menuLock: focus return', () => {
  it('focuses the target, and tolerates a missing one', () => {
    let focused = 0
    focusElement({ focus: () => { focused++ } })
    assert.equal(focused, 1)
    assert.doesNotThrow(() => focusElement(null))
  })
})

describe('menuLock: breakpoint', () => {
  function fakeMatchMedia() {
    const listeners = new Set<(e: { matches: boolean }) => void>()
    const queries: string[] = []
    const mm = (query: string) => {
      queries.push(query)
      return {
        matches: false,
        addEventListener: (_t: 'change', l: (e: { matches: boolean }) => void) => { listeners.add(l) },
        removeEventListener: (_t: 'change', l: (e: { matches: boolean }) => void) => { listeners.delete(l) },
      }
    }
    return { mm, listeners, queries }
  }

  it('closes only when the viewport becomes desktop, and cleans up', () => {
    const { mm, listeners, queries } = fakeMatchMedia()
    let closed = 0
    const stop = onMenuBreakpoint(mm, () => { closed++ })
    assert.deepEqual(queries, [MENU_DESKTOP_QUERY])
    for (const l of listeners) l({ matches: false })
    assert.equal(closed, 0)
    for (const l of listeners) l({ matches: true })
    assert.equal(closed, 1)
    stop()
    assert.equal(listeners.size, 0)
  })

  it('uses the same breakpoint as the layout (Tailwind xl = 1280px)', () => {
    assert.equal(MENU_DESKTOP_QUERY, '(min-width: 1280px)')
    const layout = readFileSync(join(process.cwd(), 'layouts/default.vue'), 'utf8')
    assert.match(layout, /id="mobile-menu" class="[^"]*xl:hidden/)
  })
})

/** Layout wiring: the helpers above are only worth anything if the layout calls them on these paths. */
describe('menuLock: layout wiring', () => {
  const layout = readFileSync(join(process.cwd(), 'layouts/default.vue'), 'utf8')

  it('scroll lock follows mobileOpen and is released on unmount', () => {
    assert.match(layout, /watch\(mobileOpen, async \(open\) => \{[\s\S]*?setScrollLock\(document\.documentElement, open\)/)
    assert.match(layout, /onUnmounted\(\(\) => \{[\s\S]*?setScrollLock\(document\.documentElement, false\)/)
  })

  it('Escape and the backdrop close with focus return; focus goes to the hamburger', () => {
    assert.match(layout, /if \(e\.key === 'Escape'\) \{\s*closeMenu\(true\)/)
    assert.match(layout, /@click="closeMenu\(true\)"/)
    assert.match(layout, /if \(returnFocus\) nextTick\(\(\) => focusMenuButton\(\)\)/)
    assert.match(layout, /function focusMenuButton\(\) \{\s*focusElement\(menuButton\.value\)/)
    assert.match(layout, /ref="menuButton"/)
  })

  it('crossing the breakpoint closes the menu and the listener is removed on unmount', () => {
    assert.match(layout, /stopMenuBreakpoint = onMenuBreakpoint\(query => window\.matchMedia\(query\), \(\) => closeMenu\(\)\)/)
    assert.match(layout, /onUnmounted\(\(\) => \{[\s\S]*?stopMenuBreakpoint\?\.\(\)/)
  })
})

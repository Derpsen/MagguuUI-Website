/**
 * Unhead v2/v3 hookOnce compatibility for SPA shells.
 *
 * @nuxt/ui@4.9 colors plugin calls:
 *   injectHead().hooks.hookOnce('dom:rendered', ...)
 * when isHydrating && !serverRendered (exactly /admin/** with ssr:false).
 *
 * Nuxt 4.5 uses Unhead v3 HookableCore (hook/removeHook/callHook only).
 * That throws during app init and surfaces as client 500 on hard reload of
 * /admin/login (NUXT_E1005). Public SSR pages skip the branch because
 * serverRendered is true; SPA navigation after a public page also works
 * because the colors plugin already ran with serverRendered=true.
 *
 * Upstream: nuxt/ui#6658. This polyfill avoids a broader @nuxt/ui bump.
 */
export default defineNuxtPlugin({
  name: 'unhead-hookonce-compat',
  enforce: 'pre',
  setup() {
    if (!import.meta.client) return

    let head: ReturnType<typeof injectHead> | undefined
    try {
      head = injectHead()
    }
    catch {
      return
    }

    if (!head?.hooks) return

    type HookFn = (...args: unknown[]) => unknown
    type Unhook = () => undefined
    const hooks = head.hooks as {
      hook?: (name: string, fn: HookFn) => Unhook | undefined
      hookOnce?: (name: string, fn: HookFn) => Unhook | undefined
    }

    const baseHook = hooks.hook
    if (typeof hooks.hookOnce === 'function' || typeof baseHook !== 'function') {
      return
    }

    hooks.hookOnce = (name, fn) => {
      const state: { stop?: Unhook } = {}
      state.stop = baseHook(name, (...args: unknown[]) => {
        state.stop?.()
        return fn(...args)
      })
      return state.stop
    }
  },
})

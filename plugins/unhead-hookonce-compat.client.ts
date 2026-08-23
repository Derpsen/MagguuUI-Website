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

    let head: ReturnType<typeof injectHead> | null = null
    try {
      head = injectHead()
    }
    catch {
      return
    }

    const hooks = head?.hooks as {
      hook?: (name: string, fn: (...args: unknown[]) => unknown) => (() => void) | void
      hookOnce?: (name: string, fn: (...args: unknown[]) => unknown) => (() => void) | void
    } | undefined

    if (!hooks || typeof hooks.hookOnce === 'function' || typeof hooks.hook !== 'function') {
      return
    }

    hooks.hookOnce = (name, fn) => {
      const unhook = hooks.hook?.(name, (...args: unknown[]) => {
        unhook?.()
        return fn(...args)
      })
      return unhook
    }
  },
})
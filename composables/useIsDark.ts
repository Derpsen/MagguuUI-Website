/**
 * useIsDark — Unified dark mode detection
 *
 * Single source of truth for theme state across all components.
 *
 * SSR note: when `nuxt.config.ts` has `preference: 'system'`, `colorMode.value`
 * returns the literal `'system'` on the server because the OS preference can't
 * be read there. Meanwhile the pre-hydration script from @nuxtjs/color-mode
 * puts the `fallback` ('dark') onto `<html>` so CSS selectors render dark.
 * Without accounting for this, `isDark` is false on SSR while CSS renders
 * dark — producing a dark nav + light Tailwind content mismatch until the
 * first client toggle. Treat `'system'` as dark to match the configured
 * fallback and keep both systems in sync.
 */

export function useIsDark() {
  const colorMode = useColorMode()
  return computed(() => {
    const v = colorMode.value
    return v === 'dark' || v === 'system'
  })
}

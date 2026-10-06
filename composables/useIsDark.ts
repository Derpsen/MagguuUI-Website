/**
 * Single source of truth for public/admin dark-mode classes.
 *
 * With `colorMode.preference: 'system'`, SSR cannot know the user's OS theme.
 * The server renders the configured fallback (`dark`). Keep the first client
 * render on the same fallback value to avoid Vue hydration class mismatches;
 * after mount, use the resolved client-side color mode.
 *
 * Explicit light/dark preference (theme toggle) always wins so Vue classes stay
 * aligned with the `html.light` / `html.dark` CSS that drives glass-card etc.
 */
export function useIsDark() {
  const colorMode = useColorMode()
  const hydrated = useState('magguuui-color-mode-hydrated', () => false)

  if (import.meta.client) {
    onMounted(() => {
      hydrated.value = true
    })
  }

  return computed(() => {
    const preference = colorMode.preference
    if (preference === 'light') return false
    if (preference === 'dark') return true

    // preference === 'system' (or unknown): match color-mode fallback until mount
    if (!hydrated.value) return true

    const value = colorMode.value
    if (value === 'light') return false
    if (value === 'dark') return true

    // Unresolved 'system' — trust the class color-mode already applied on <html>
    if (import.meta.client) {
      if (document.documentElement.classList.contains('light')) return false
      if (document.documentElement.classList.contains('dark')) return true
      return window.matchMedia('(prefers-color-scheme: dark)').matches
    }
    return true
  })
}

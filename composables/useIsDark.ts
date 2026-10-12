/**
 * Single source of truth for public/admin dark-mode classes.
 *
 * Default preference is `dark`. SSR and the first client paint stay on that fallback.
 * The server renders the configured fallback (`dark`). Keep the first client
 * render on the same fallback value to avoid Vue hydration class mismatches;
 * after mount, use the resolved client-side color mode.
 *
 * This also applies to an explicit `light` preference: color-mode stores it in
 * localStorage, so the server cannot know it and renders dark classes. If the
 * client returned `false` during hydration, Vue would keep the SSR (dark) class
 * attributes in production (class mismatches are not patched), leaving dark-mode
 * text colors on a light page after reload. So: fallback until mounted, then the
 * real preference re-renders reactively.
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
    // Match the SSR fallback (dark) until mount for every preference.
    if (!hydrated.value) return true

    const preference = colorMode.preference
    if (preference === 'light') return false
    if (preference === 'dark') return true

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

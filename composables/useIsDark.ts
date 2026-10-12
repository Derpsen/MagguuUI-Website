/**
 * Single source of truth for public/admin dark-mode classes.
 *
 * SSR (and SWR-cached HTML) cannot know the visitor's stored preference, so the
 * server always renders the `dark` fallback. On the client, @nuxtjs/color-mode
 * reads the stored preference (e.g. `light`) *before* hydration. Returning that
 * value during hydration makes Vue hydrate dark SSR classes against a light
 * vnode tree; in production Vue does not patch class mismatches, so dark-mode
 * text colours stayed on a light page after reload.
 *
 * Therefore: stay on the dark fallback until the app is hydrated
 * (flag set in plugins/color-mode.client.ts on `app:suspense:resolve`), then
 * follow the resolved colour mode so Vue re-renders the correct classes.
 */
export function useIsDark() {
  const colorMode = useColorMode()
  const hydrated = useState('magguuui-color-mode-hydrated', () => false)

  return computed(() => {
    if (!hydrated.value) return true

    const preference = colorMode.preference
    if (preference === 'light') return false
    if (preference === 'dark') return true

    const value = colorMode.value
    if (value === 'light') return false
    if (value === 'dark') return true

    if (import.meta.client) {
      if (document.documentElement.classList.contains('light')) return false
      if (document.documentElement.classList.contains('dark')) return true
    }
    return true
  })
}

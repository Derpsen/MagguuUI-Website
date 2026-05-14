/**
 * Single source of truth for public/admin dark-mode classes.
 *
 * With `colorMode.preference: 'system'`, SSR cannot know the user's OS theme.
 * The server renders the configured fallback (`dark`). Keep the first client
 * render on the same fallback value to avoid Vue hydration class mismatches;
 * after mount, use the resolved client-side color mode.
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
    if (!hydrated.value) {
      return colorMode.preference !== 'light'
    }

    const value = colorMode.value
    return value === 'dark' || (value === 'system' && colorMode.preference !== 'light')
  })
}

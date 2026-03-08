/**
 * useIsDark — Unified dark mode detection
 *
 * Single source of truth for theme state across all components.
 * Uses computed() for reactivity without ref+watch pattern.
 */

export function useIsDark() {
  const colorMode = useColorMode()
  return computed(() => colorMode.value === 'dark')
}

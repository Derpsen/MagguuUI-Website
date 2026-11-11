/**
 * Shared text/rule classes for /meta components. Wraps `useIsDark` so every
 * Meta component follows the repo's hydration-safe dark fallback.
 */
export function useMetaTone() {
  const isDark = useIsDark()
  return {
    isDark,
    label: computed(() => (isDark.value ? 'text-brand-300' : 'text-brand-700')),
    strong: computed(() => (isDark.value ? 'text-white' : 'text-gray-950')),
    muted: computed(() => (isDark.value ? 'text-silver-400' : 'text-gray-600')),
    rule: computed(() => (isDark.value ? 'border-white/10' : 'border-gray-200')),
    track: computed(() => (isDark.value ? 'bg-white/10' : 'bg-gray-200')),
    fill: computed(() => (isDark.value ? 'bg-brand-400' : 'bg-brand-600')),
  }
}

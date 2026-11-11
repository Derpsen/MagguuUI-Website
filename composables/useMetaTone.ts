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
    // Low-sample rows: an inset rail, never opacity or a background wash
    // (both drop class-colored text below 4.5:1 on the page backgrounds).
    lowRow: computed(() => (isDark.value
      ? 'shadow-[inset_3px_0_0_0_rgba(255,255,255,0.35)]'
      : 'shadow-[inset_3px_0_0_0_rgba(17,24,39,0.35)]')),
  }
}

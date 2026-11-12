/**
 * Shared text/rule classes for /meta components. Wraps `useIsDark` for the
 * few places that still need a boolean (inline colours computed in JS).
 *
 * Class tokens always include both light and `dark:` variants so they follow
 * `html.dark` / `html.light` without waiting for a component to mount. That
 * keeps delayed-hydration islands (heatmap, gear, tooltips) contrast-safe
 * after a light preference is applied to <html>, while SSR and the first
 * client render stay class-string identical (no hydration mismatch).
 */
export function useMetaTone() {
  const isDark = useIsDark()
  return {
    isDark,
    label: computed(() => 'text-brand-700 dark:text-brand-300'),
    strong: computed(() => 'text-gray-950 dark:text-white'),
    muted: computed(() => 'text-gray-600 dark:text-silver-400'),
    // On heatmap cells the brand wash drops silver-400 below 4.5:1 in dark.
    heatMuted: computed(() => 'text-gray-600 dark:text-silver-300'),
    rule: computed(() => 'border-gray-200 dark:border-white/10'),
    track: computed(() => 'bg-gray-200 dark:bg-white/10'),
    fill: computed(() => 'bg-brand-600 dark:bg-brand-400'),
    // Low-sample rows: an inset rail, never opacity or a background wash
    // (both drop class-colored text below 4.5:1 on the page backgrounds).
    lowRow: computed(() => 'shadow-[inset_3px_0_0_0_rgba(17,24,39,0.35)] dark:shadow-[inset_3px_0_0_0_rgba(255,255,255,0.35)]'),
  }
}

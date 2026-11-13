/**
 * Shared text/rule classes for /meta components (redesign PR 4). They are design tokens (`--mg-*`, tokens.css), so they
 * follow `html.dark` / `html:not(.dark)` in CSS alone, without waiting for a component to mount: delayed-hydration
 * islands (heatmap, gear, tooltips) stay contrast-safe after a light preference is applied to <html>, and SSR and the
 * first client render are class-string identical. `isDark` stays for the few inline colours computed in JS (class colours).
 */
export function useMetaTone() {
  const isDark = useIsDark()
  return {
    isDark,
    label: computed(() => 'text-mg-accent-text'),
    strong: computed(() => 'text-mg-fg'),
    muted: computed(() => 'text-mg-fg-muted'),
    // On heatmap cells the accent wash drops fg-muted below 4.5:1 in dark, so the cell text uses the full foreground.
    heatMuted: computed(() => 'text-mg-fg'),
    rule: computed(() => 'border-mg-line'),
    track: computed(() => 'bg-mg-surface-3'),
    fill: computed(() => 'bg-mg-accent-text'),
    // Low-sample rows: an inset rail, never opacity or a background wash
    // (both drop class-colored text below 4.5:1 on the page backgrounds).
    lowRow: computed(() => 'shadow-[inset_3px_0_0_0_var(--mg-fg-subtle)]'),
  }
}

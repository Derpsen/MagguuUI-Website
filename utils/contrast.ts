/** WCAG 2 relative-luminance of a #rrggbb color. */
function hexLuminance(hex: string): number {
  const raw = hex.replace('#', '')
  if (raw.length !== 6) return 0
  const r = Number.parseInt(raw.slice(0, 2), 16) / 255
  const g = Number.parseInt(raw.slice(2, 4), 16) / 255
  const b = Number.parseInt(raw.slice(4, 6), 16) / 255
  const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
}

/** WCAG 2 relative-luminance contrast ratio of two #rrggbb colors. */
export function contrastRatio(foreground: string, background: string): number {
  const a = hexLuminance(foreground)
  const b = hexLuminance(background)
  const hi = Math.max(a, b)
  const lo = Math.min(a, b)
  return (hi + 0.05) / (lo + 0.05)
}

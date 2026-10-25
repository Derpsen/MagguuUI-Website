/** Country code → flag emoji and English name for the admin views. Pure; falls back to the code / "Unknown". */

const CODE = /^[A-Za-z]{2}$/

/** Cloudflare uses XX (no data) and T1 (Tor); the log stores 'unknown' when there is no usable header. */
export function isKnownCountry(code: string | null | undefined): code is string {
  if (!code || !CODE.test(code)) return false
  const c = code.toUpperCase()
  return c !== 'XX' && c !== 'T1'
}

export function countryFlag(code: string | null | undefined): string {
  if (!isKnownCountry(code)) return '\u{1F3F3}\uFE0F'
  return String.fromCodePoint(...[...code.toUpperCase()].map(ch => 0x1F1E6 + ch.charCodeAt(0) - 65))
}

export function countryName(code: string | null | undefined): string {
  if (!code || code === 'unknown') return 'Unknown'
  if (code.toUpperCase() === 'T1') return 'Tor network'
  if (!isKnownCountry(code)) return 'Unknown'
  try {
    return new Intl.DisplayNames(['en'], { type: 'region' }).of(code.toUpperCase()) || code.toUpperCase()
  } catch {
    return code.toUpperCase()
  }
}

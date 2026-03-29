export const DEFAULT_CONTENT_LOCALE = 'en'
export const LEGACY_CONTENT_FALLBACK_LOCALE = 'de'

export function normalizeContentLocale(locale?: string | null) {
  const normalized = locale?.trim().toLowerCase()
  return normalized || DEFAULT_CONTENT_LOCALE
}

export function getContentLocaleChain(locale?: string | null) {
  const normalized = normalizeContentLocale(locale)

  return Array.from(new Set([
    normalized,
    DEFAULT_CONTENT_LOCALE,
    LEGACY_CONTENT_FALLBACK_LOCALE,
  ]))
}

export function createContentLocaleBuckets<T>(createValue: () => T) {
  return {
    [LEGACY_CONTENT_FALLBACK_LOCALE]: createValue(),
    [DEFAULT_CONTENT_LOCALE]: createValue(),
  }
}

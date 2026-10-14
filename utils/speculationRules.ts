/**
 * Speculation Rules: prefetch same-origin public pages on hover/pointerdown
 * (`moderate`). Admin, API, OG images and downloads are never speculated.
 * Browsers without support ignore the script; nothing else changes.
 */
export const SPECULATION_RULES = {
  prefetch: [
    {
      source: 'document',
      where: {
        and: [
          { href_matches: '/*' },
          { not: { href_matches: ['/admin', '/admin/*', '/api/*', '/_og/*', '/__og-image__/*', '/*.*'] } },
          { not: { selector_matches: '[rel~=nofollow], [download], [target=_blank]' } },
        ],
      },
      eagerness: 'moderate',
    },
  ],
} as const

/**
 * Display typography for public headings: typographic apostrophes and
 * non-breaking spaces so short phrases (Season 2, December 8) stay together.
 */
const NBSP = '\u00A0'
const RSQUO = '\u2019'
const MONTHS = 'January|February|March|April|May|June|July|August|September|October|November|December'

export function formatPublicHeading(text: string): string {
  if (!text) return text
  let s = text.normalize('NFC')
  // Possessives and contractions: 2's, Warcraft's, Kith'ix, don't.
  s = s.replace(/(\p{L}|\p{N})'(?=\p{L})/gu, `$1${RSQUO}`)
  // Keep numbered labels and dates on one line.
  s = s.replace(/\b(Season|Patch|Phase|Chapter|Week|Part|Volume|Issue)\s+(\d+(?:\.\d+)*)/g, `$1${NBSP}$2`)
  s = s.replace(new RegExp(`\\b(${MONTHS})\\s+(\\d{1,2}(?:st|nd|rd|th)?)\\b`, 'g'), `$1${NBSP}$2`)
  s = s.replace(new RegExp(`\\b(\\d{1,2})\\s+to\\s+(${MONTHS})\\b`, 'g'), `$1${NBSP}to${NBSP}$2`)
  return s
}

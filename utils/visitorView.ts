/** Client-safe types and limits of the admin Visitors view (shared by the page, the report module and the tests). */

export const VISITOR_PAGE_SIZE = 25
export const VISITOR_PAGE_SIZE_MAX = 100
/** Deepest row offset the list will page to; beyond that the filters or the CSV export are the way. */
export const VISITOR_MAX_OFFSET = 10_000
export const VISITOR_EXPORT_MAX_ROWS = 50_000

export interface VisitorListRow {
  id: string, startedAt: number, lastSeen: number, durationS: number, ip: string | null, userAgent: string | null,
  browser: string, os: string, device: string, country: string, city: string | null, referrerUrl: string | null, referrerHost: string | null,
  utm: string, utmSource: string | null, utmMedium: string | null, utmCampaign: string | null, utmTerm: string | null, utmContent: string | null,
  landingPath: string, exitPath: string | null, pages: number, returning: boolean,
  screen: string | null, language: string | null, timezone: string | null,
}

export interface VisitorDetail {
  hits: Array<{ path: string, at: number, dwellS: number | null, scrollMax: number }>
  events: Array<{ path: string, kind: string, target: string, at: number }>
}

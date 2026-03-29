import { PUBLIC_SITE_ORIGIN, PUBLIC_SITE_SETTINGS_DEFAULTS } from './siteSettingsDefaults'

export const PUBLIC_SITE_BASE_URL = PUBLIC_SITE_ORIGIN

export function buildPublicPageTitle(pageTitle: string, siteName?: string | null) {
  const resolvedSiteName = siteName || PUBLIC_SITE_SETTINGS_DEFAULTS.site_name
  return `${pageTitle} - ${resolvedSiteName}`
}

export function buildGitHubIssuesUrl(githubUrl?: string | null) {
  const baseUrl = githubUrl || PUBLIC_SITE_SETTINGS_DEFAULTS.github_url
  return baseUrl.endsWith('/issues') ? baseUrl : `${baseUrl.replace(/\/$/, '')}/issues`
}

export function buildPublicUrl(path: string, baseUrl = PUBLIC_SITE_BASE_URL) {
  return new URL(path, baseUrl).toString()
}

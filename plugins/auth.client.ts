/**
 * Client-side auth hydration
 *
 * Restores the admin session from the HttpOnly cookie on every page load,
 * including public pages. Without this, admin edit buttons on public pages
 * (FAQ, Changelog, Strings, Guide etc.) disappear after a full reload.
 */

export default defineNuxtPlugin(async () => {
  const { restoreSession } = useAuth()
  await restoreSession()
})

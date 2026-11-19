import type { RouterConfig } from '@nuxt/schema'
import { useNuxtApp, useRouter } from '#app'
import { START_LOCATION } from 'vue-router'

/**
 * Back/Forward must land on the saved position in one step. Nuxt's default
 * returns `savedPosition` without a behavior, so `* { scroll-behavior: smooth }`
 * in main.css (wanted for in-page anchors) turns the restore into a long
 * animation. When the next page's body arrives a frame later, that animation
 * is aborted mid-way (Code-Review #210: Back from /addons to /changelog
 * stalled around 903 px instead of the saved 1400). Instant is the same rule
 * `plugins/scroll-reset.client.ts` already uses for a footer-click reset.
 *
 * We apply the position ourselves and return `false` so vue-router does not
 * start a competing smooth scroll. `page:loading:end` can already have fired
 * by the time this runs (a cached /guide or /strings page), so hookOnce alone
 * would hang; a microtask fallback covers that. A short ResizeObserver
 * re-applies if the document grows after the first paint.
 */
export default {
  scrollBehavior(to, from, savedPosition) {
    const nuxtApp = useNuxtApp()
    const samePath = to.path.replace(/\/$/, '') === from.path.replace(/\/$/, '')
    if (samePath) {
      if (from.hash && !to.hash) {
        return savedPosition
          ? { ...savedPosition, behavior: 'instant' as const }
          : { left: 0, top: 0, behavior: 'instant' as const }
      }
      if (to.hash) {
        return {
          el: to.hash,
          top: hashScrollMargin(to.hash),
          behavior: 'auto' as const,
        }
      }
      return false
    }
    const scrollToTop = typeof to.meta.scrollToTop === 'function'
      ? to.meta.scrollToTop(to, from)
      : to.meta.scrollToTop
    if (scrollToTop === false) return false

    if (savedPosition) {
      restoreSavedPosition(to.fullPath, savedPosition, nuxtApp)
      return false
    }

    // Hash targets must win over the default top-of-page reset. Building the
    // position inside the callback means hashScrollMargin sees the element
    // after the new page has painted (Code-Review #211: a first load of
    // /changelog#release-… or a footer/FAQ link to /about#contact used to
    // land at 0).
    const positionFor = () => to.hash
      ? { el: to.hash, top: hashScrollMargin(to.hash), behavior: 'auto' as const }
      : { left: 0, top: 0, behavior: 'instant' as const }
    if (from === START_LOCATION) return positionFor()

    return new Promise((resolve) => {
      let settled = false
      const doScroll = () => {
        requestAnimationFrame(() => {
          if (settled) return
          settled = true
          if (useRouter().currentRoute.value.fullPath !== to.fullPath) {
            resolve(false)
            return
          }
          resolve(positionFor())
        })
      }
      nuxtApp.hooks.hookOnce('page:loading:end', doScroll)
      // Same race as Back: the hook may already have run on a cached page.
      requestAnimationFrame(doScroll)
    })
  },
} satisfies RouterConfig

function restoreSavedPosition(
  fullPath: string,
  savedPosition: { left?: number, top?: number },
  nuxtApp: ReturnType<typeof useNuxtApp>,
) {
  if (typeof document === 'undefined') return
  const apply = () => {
    if (useRouter().currentRoute.value.fullPath !== fullPath) return
    window.scrollTo({
      top: savedPosition.top ?? 0,
      left: savedPosition.left ?? 0,
      behavior: 'instant',
    })
  }
  let observer: ResizeObserver | undefined
  const start = () => {
    apply()
    requestAnimationFrame(apply)
    if (observer) return
    observer = new ResizeObserver(apply)
    observer.observe(document.documentElement)
    setTimeout(() => observer?.disconnect(), 500)
  }
  nuxtApp.hooks.hookOnce('page:loading:end', start)
  nuxtApp.hooks.hookOnce('page:finish', start)
  queueMicrotask(start)
}

function hashScrollMargin(hash: string): number {
  const elem = document.getElementById(hash.slice(1))
  if (!elem) return 0
  return (Number.parseFloat(getComputedStyle(elem).scrollMarginTop) || 0)
    + (Number.parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0)
}

import { START_LOCATION } from 'vue-router'

/**
 * Reset the scroll position when a navigation to ANOTHER page starts, not after the new page has rendered.
 *
 * Why (found while bisecting the /addons soft-navigation CLS): Nuxt scrolls to the top after the new page has rendered,
 * and `* { scroll-behavior: smooth }` (main.css, wanted for in-page anchors) turns that into a ~450 ms animation. A footer
 * link click on a long page therefore swapped in the new page under the footer-sized viewport. That is a layout shift
 * of the footer of up to 1.0 per swap, and it counts as soon as the swap lands more than 500 ms after the click
 * (slow chunk or CPU), where the click no longer excuses it. With the scroll already at the top, the footer is
 * out of the viewport in both frames and nothing moves. Back/forward keep their saved position: Nuxt restores it after
 * render exactly as before. Same-page anchors and `scrollToTop: false` routes are untouched.
 */
export default defineNuxtPlugin(() => {
  const router = useRouter()
  router.beforeEach((to, from) => {
    if (from === START_LOCATION || to.path === from.path || to.meta.scrollToTop === false) return
    if (window.scrollY > 0) window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
  })
})

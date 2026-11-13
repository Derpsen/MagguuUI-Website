import { START_LOCATION } from 'vue-router'
import { createScrollResetFlow } from '~/utils/scrollReset'

/**
 * Reset the scroll position when a navigation to ANOTHER page has been committed, before the new page renders, not
 * after it (rule: `utils/scrollReset.ts`).
 *
 * Why (found while bisecting the /addons soft-navigation CLS): Nuxt scrolls to the top only after the new page has
 * rendered, and `* { scroll-behavior: smooth }` (main.css, wanted for in-page anchors) turns that into a ~450 ms
 * animation. A footer link click on a long page therefore swapped in the new page under the footer-sized viewport:
 * a footer layout shift of up to 1.0 per swap, which counts as soon as the swap lands more than 500 ms after the click.
 * With the scroll already at the top the footer is out of the viewport in both frames and nothing moves.
 *
 * Order matters (Code-Review #201): vue-router stores the leaving page's scroll position in `history.state` while it
 * commits the navigation, which is after `beforeEach`/`beforeResolve`. Resetting earlier made Back/Forward restore 0. So
 * this runs in `afterEach` (after the commit, still before the next render), and never for Back/Forward: a capturing
 * `popstate` listener runs before vue-router's own and flags the navigation, so Nuxt's saved-position restore is untouched.
 */
export default defineNuxtPlugin(() => {
  const router = useRouter()
  const flow = createScrollResetFlow()
  window.addEventListener('popstate', () => flow.markPopped(), { capture: true })

  router.afterEach((to, from, failure) => {
    if (!flow.shouldReset({
      firstNavigation: from === START_LOCATION,
      fromPath: from.path,
      toPath: to.path,
      scrollToTop: to.meta.scrollToTop,
      failure,
      scrollY: window.scrollY,
    })) return
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
  })
})

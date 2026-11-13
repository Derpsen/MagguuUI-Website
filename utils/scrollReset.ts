/**
 * When to jump to the top at the start of a client-side page change (see plugins/scroll-reset.client.ts).
 * Pure so it is unit-tested: the plugin only wires it to the router and to `popstate`.
 */
export interface ScrollResetInput {
  /** `from` is the initial route (first navigation of the page load). */
  firstNavigation: boolean
  fromPath: string
  toPath: string
  /** `route.meta.scrollToTop` of the target. */
  scrollToTop: unknown
  /** The navigation was started by Back/Forward (`popstate`): vue-router restores the saved position itself. */
  popped: boolean
  /** The failure vue-router reports for a navigation that was aborted, cancelled or duplicated (`afterEach` third argument). */
  failure: unknown
  scrollY: number
}

export function shouldResetScroll(input: ScrollResetInput): boolean {
  if (input.failure || input.popped || input.firstNavigation) return false
  if (input.toPath === input.fromPath) return false
  if (input.scrollToTop === false) return false
  return input.scrollY > 0
}

/**
 * The state around the rule: a `popstate` (Back/Forward) marks the NEXT committed navigation, and that navigation
 * consumes the mark, so a later footer click resets the scroll again.
 */
export function createScrollResetFlow() {
  let popped = false
  return {
    markPopped() {
      popped = true
    },
    shouldReset(input: Omit<ScrollResetInput, 'popped'>): boolean {
      const wasPopped = popped
      popped = false
      return shouldResetScroll({ ...input, popped: wasPopped })
    },
  }
}

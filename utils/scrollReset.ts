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
  /** The navigation failed or was cancelled. */
  failed: boolean
  scrollY: number
}

export function shouldResetScroll(input: ScrollResetInput): boolean {
  if (input.failed || input.popped || input.firstNavigation) return false
  if (input.toPath === input.fromPath) return false
  if (input.scrollToTop === false) return false
  return input.scrollY > 0
}

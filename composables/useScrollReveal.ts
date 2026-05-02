/**
 * useScrollReveal — Smooth scroll-triggered fade-in animations
 *
 * Usage in template:
 *   <div :ref="(el) => observe(el as HTMLElement)">...</div>
 *
 * The observer is created eagerly on the client so template-`:ref` callbacks
 * (which fire during render, before the parent's `onMounted`) can register
 * targets immediately. Without eager creation, every above-the-fold target
 * registered before mount silently fell through and never animated in.
 */

export function useScrollReveal() {
  const observer = import.meta.client
    ? new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) {
              const el = entry.target as HTMLElement
              el.classList.add('scroll-revealed')
              observer?.unobserve(el)
            }
          }
        },
        { threshold: 0.1, rootMargin: '0px 0px -60px 0px' },
      )
    : null

  onUnmounted(() => {
    observer?.disconnect()
  })

  function observe(el: HTMLElement | null) {
    if (el && observer) {
      el.classList.add('scroll-reveal')
      observer.observe(el)
    }
  }

  return { observe, observer }
}

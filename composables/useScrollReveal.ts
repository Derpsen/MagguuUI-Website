/**
 * useScrollReveal — Smooth scroll-triggered fade-in animations
 *
 * Usage in template:
 *   <div v-scroll-reveal>...</div>
 *   <div v-scroll-reveal.delay-200>...</div>
 *
 * Or use the directive directly:
 *   const vScrollReveal = useScrollReveal()
 */

export function useScrollReveal() {
  const observer = ref<IntersectionObserver | null>(null)

  onMounted(() => {
    observer.value = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const el = entry.target as HTMLElement
            el.classList.add('scroll-revealed')
            observer.value?.unobserve(el)
          }
        }
      },
      { threshold: 0.1, rootMargin: '0px 0px -60px 0px' }
    )
  })

  onUnmounted(() => {
    observer.value?.disconnect()
  })

  // Returns a ref callback to use with template refs
  function observe(el: HTMLElement | null) {
    if (el && observer.value) {
      el.classList.add('scroll-reveal')
      observer.value.observe(el)
    }
  }

  return { observe, observer }
}

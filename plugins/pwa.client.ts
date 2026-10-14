/** Registers /sw.js (offline Strings + Guide) in production, public pages only. */
export default defineNuxtPlugin(() => {
  if (import.meta.dev || !('serviceWorker' in navigator)) return
  if (useRouter().currentRoute.value.path.startsWith('/admin')) return
  const register = () => {
    navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' }).catch(() => {})
  }
  if (document.readyState === 'complete') register()
  else addEventListener('load', register, { once: true })
})

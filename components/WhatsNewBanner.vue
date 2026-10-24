<!--
  WhatsNewBanner — one small notice after a new release (public layout).
  Client-only and position:fixed, so it never shifts layout (no CLS) and never
  appears in the server HTML. State lives in localStorage `lastSeenVersion`; no
  cookies. The release list is fetched once after mount, when the browser is idle.
-->
<template>
  <section
    v-if="shown"
    role="region"
    aria-label="New release"
    data-testid="whats-new"
    class="whats-new fixed bottom-4 left-4 right-16 sm:right-auto sm:max-w-md z-40 border px-4 py-3 text-sm"
    :class="isDark ? 'border-white/15 bg-[#0b1118] text-silver-200' : 'border-gray-300 bg-white text-gray-800'"
    @keydown.esc="dismiss"
  >
    <p class="font-mono text-[11px] uppercase tracking-[0.16em]" :class="isDark ? 'text-brand-300' : 'text-brand-700'">New release</p>
    <p class="mt-1">
      MagguuUI {{ displayVersion(latest) }} is out.
      <NuxtLink
        :to="changelogSinceHref(previous)"
        class="underline underline-offset-4 font-medium"
        :class="isDark ? 'text-white' : 'text-gray-950'"
        data-testid="whats-new-link"
        @click="dismiss"
      >See what changed since {{ displayVersion(previous) }}</NuxtLink>.
    </p>
    <button
      type="button"
      class="mt-2 text-xs underline underline-offset-4"
      :class="isDark ? 'text-silver-400 hover:text-white' : 'text-gray-600 hover:text-gray-950'"
      data-testid="whats-new-dismiss"
      @click="dismiss"
    >Dismiss</button>
  </section>
</template>

<script setup lang="ts">
import { LAST_SEEN_KEY, changelogSinceHref, decideWhatsNew, displayVersion, latestReleaseVersion } from '~/utils/whatsNew'

const isDark = useIsDark()
const route = useRoute()
const shown = ref(false)
const latest = ref('')
const previous = ref('')

function readLastSeen(): string | null {
  try { return localStorage.getItem(LAST_SEEN_KEY) } catch { return null }
}
function remember(version: string) {
  try { localStorage.setItem(LAST_SEEN_KEY, version) } catch { /* storage blocked: banner just stays quiet */ }
}
function dismiss() {
  if (latest.value) remember(latest.value)
  shown.value = false
}

async function check() {
  let stamps: { version: string }[] = []
  try {
    const res = await $fetch<{ data: { version: string }[] }>('/api/v1/release-stamps')
    stamps = res.data
  } catch { return }
  const newest = latestReleaseVersion(stamps)
  const decision = decideWhatsNew(newest, readLastSeen())
  if (decision.action === 'record') remember(decision.latest)
  if (decision.action !== 'show') return
  latest.value = decision.latest
  previous.value = decision.previous
  // Reading the changelog counts as seeing it.
  if (route.path.startsWith('/changelog')) { remember(decision.latest); return }
  shown.value = true
}

// Hide when the visitor lands on the changelog itself.
watch(() => route.path, (path) => { if (shown.value && path.startsWith('/changelog')) dismiss() })

onMounted(() => {
  const run = () => { void check() }
  if ('requestIdleCallback' in window) window.requestIdleCallback(run, { timeout: 3000 })
  else setTimeout(run, 1500)
})
</script>

<style scoped>
@media (prefers-reduced-motion: no-preference) {
  .whats-new {
    animation: whats-new-in 0.25s ease-out;
  }
}
@keyframes whats-new-in {
  from { opacity: 0; }
  to { opacity: 1; }
}
</style>

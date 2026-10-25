<!--
  ConsentBanner — cookie / visitor statistics choice (public layout, client only).
  position:fixed bar at the bottom, so it never shifts the page (no CLS) and is not in the server HTML.
  Not a modal: nothing is blocked, focus is not taken on first load and is never trapped. The three actions are
  equal (same size, same style, no pre-selection); the optional statistics toggle starts OFF.
  Closing without a choice is not possible on the first visit, and a closed bar never means "yes".
  With Do-Not-Track / Global Privacy Control there is no banner at all; the footer link explains that instead.
-->
<template>
  <section
    v-if="open"
    ref="root"
    role="region"
    aria-labelledby="consent-title"
    data-testid="consent-banner"
    class="consent-bar fixed inset-x-0 bottom-0 z-[60] border-t px-4 py-3 text-sm sm:px-6"
    :class="isDark ? 'border-white/15 bg-[#0b1118] text-silver-200' : 'border-gray-300 bg-white text-gray-800'"
    @keydown.esc="onEscape"
  >
    <div class="mx-auto max-w-5xl">
      <h2 id="consent-title" ref="title" tabindex="-1" class="font-semibold outline-none" :class="isDark ? 'text-white' : 'text-gray-950'">
        Cookies and visitor statistics
      </h2>

      <template v-if="optedOut">
        <p class="mt-1 max-w-3xl">
          Your browser sends a Global Privacy Control or Do Not Track signal. We treat it as a refusal: no cookies are set
          and no visitor statistics are recorded. You do not need to do anything.
        </p>
        <div class="mt-3">
          <button type="button" :class="buttonClass" data-testid="consent-close" @click="close">Close</button>
        </div>
      </template>

      <template v-else-if="view === 'banner'">
        <p class="mt-1 max-w-3xl">
          Without your agreement this site sets no tracking cookie and records no IP address or user agent: it only counts page views,
          copy clicks and page load speed anonymously, with no identifier, and keeps your theme choice in your browser. Your choice is
          remembered in one small cookie (mg_consent, 6 months). If you click “Accept all”, it also records detailed visitor
          statistics so the site owner can see where visitors come from and how they use it: IP address, country, referrer and the pages
          you visit, linked by two random cookies (30 minutes and 13 months).
          Details are in the <NuxtLink to="/privacy" class="underline underline-offset-4">privacy notice</NuxtLink>.
          <span v-if="reopened && choice !== null" data-testid="consent-current">
            Current choice: {{ choice ? 'visitor statistics allowed' : 'necessary only' }}.
          </span>
        </p>
        <p v-if="failed" role="alert" class="mt-1" data-testid="consent-failed">Your choice could not be saved. Please try again.</p>
        <div class="mt-3 flex flex-wrap gap-2">
          <button type="button" :class="buttonClass" :disabled="busy" data-testid="consent-accept" @click="save(true)">Accept all</button>
          <button type="button" :class="buttonClass" :disabled="busy" data-testid="consent-necessary" @click="save(false)">Necessary only</button>
          <button type="button" :class="buttonClass" :disabled="busy" data-testid="consent-settings" @click="view = 'settings'">Settings</button>
        </div>
      </template>

      <template v-else>
        <p class="mt-1 max-w-3xl">Necessary cookies (this choice itself) are always on. Optional:</p>
        <div class="mt-2 max-w-3xl">
          <label class="flex items-start gap-2">
            <input v-model="statsOn" type="checkbox" class="mt-1 h-4 w-4" data-testid="consent-stats-toggle" aria-describedby="consent-stats-help" />
            <span class="font-medium" :class="isDark ? 'text-white' : 'text-gray-950'">Visitor statistics</span>
          </label>
          <p id="consent-stats-help" class="ml-6 mt-1">
            Records your IP address, user agent, country, referrer, visited pages, time on page, scroll depth, clicks on links and buttons,
            screen size, language and time zone, linked by a random session cookie (30 minutes) and a random visitor cookie (13 months).
            Records are kept in full, including IP address and user agent, for 13 months and then deleted. Off by default.
          </p>
        </div>
        <p v-if="failed" role="alert" class="mt-1" data-testid="consent-failed">Your choice could not be saved. Please try again.</p>
        <div class="mt-3 flex flex-wrap gap-2">
          <button type="button" :class="buttonClass" :disabled="busy" data-testid="consent-save" @click="save(statsOn)">Save</button>
          <button type="button" :class="buttonClass" :disabled="busy" data-testid="consent-back" @click="view = 'banner'">Back</button>
        </div>
      </template>
    </div>
  </section>
</template>

<script setup lang="ts">
const isDark = useIsDark()
const route = useRoute()
const { choice, open, view, optedOut, busy, failed, reopened, init, close, save } = useConsent()
const root = ref<HTMLElement | null>(null)
const title = ref<HTMLElement | null>(null)
const statsOn = ref(false)
let trigger: HTMLElement | null = null

const buttonClass = computed(() => [
  'border px-3 py-1.5 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-60',
  isDark.value
    ? 'border-white/30 text-white hover:bg-white/[0.06] focus-visible:outline-brand-300'
    : 'border-gray-400 text-gray-950 hover:bg-gray-100 focus-visible:outline-brand-700',
])

function onEscape() {
  // Escape closes only a bar the visitor reopened; on the first visit it must not count as a choice.
  if (reopened.value || optedOut.value) close()
}

watch(view, (v) => { if (v === 'settings') statsOn.value = choice.value === true })

// A bar the visitor opened (footer link) takes focus once and gives it back on close; the first-visit bar never does.
watch(open, async (isOpen, wasOpen) => {
  if (isOpen && reopened.value) {
    trigger = document.activeElement instanceof HTMLElement ? document.activeElement : null
    await nextTick()
    title.value?.focus()
  } else if (!isOpen && wasOpen && reopened.value) {
    trigger?.focus()
    trigger = null
  }
})

onMounted(() => init(route.path))
</script>

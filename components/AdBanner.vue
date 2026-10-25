<script setup lang="ts">
/**
 * AdBanner — Google AdSense display ad.
 *
 * Reads publisher ID and slot from site settings.
 * Only renders when AdSense is enabled, the slot is configured AND the visitor
 * has agreed in the cookie banner (consent gate, default off): before that
 * nothing is requested from Google. Do-Not-Track / Global Privacy Control
 * count as a refusal. Withdrawing the consent stops further ads on the next
 * page load (an already loaded script cannot be unloaded).
 * NOTE: the banner and the Privacy text describe the statistics purpose only.
 * Before AdSense is switched on, add a separate "advertising" purpose to both.
 */

const props = defineProps<{
  /** Which slot to use: 'header' | 'content' | 'footer' */
  placement: 'header' | 'content' | 'footer'
  /** Ad format — defaults to 'auto' */
  format?: string
  /** Full-width responsive — defaults to true */
  fullWidth?: boolean
}>()

const settings = usePublicSiteSettings()

const publisherId = computed(() => settings.value.adsense_publisher_id || '')
const enabled = computed(() => settings.value.adsense_enabled === 'true')
const slotId = computed(() => settings.value[`adsense_slot_${props.placement}`] || '')

const consent = useConsent()
const consented = computed(() => consent.enabled.value && consent.choice.value === true && !consent.optedOut.value)

const shouldShow = computed(() => enabled.value && consented.value && publisherId.value && slotId.value)

// Load AdSense script once
const scriptLoaded = ref(false)

function loadAdSenseScript() {
  if (scriptLoaded.value || !import.meta.client) return
  if (document.querySelector('script[src*="adsbygoogle"]')) {
    scriptLoaded.value = true
    return
  }

  const script = document.createElement('script')
  script.async = true
  script.crossOrigin = 'anonymous'
  script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${publisherId.value}`
  document.head.appendChild(script)
  scriptLoaded.value = true
}

interface AdSenseWindow extends Window {
  adsbygoogle?: Array<Record<string, unknown>>
}

let pushed = false
function showAd() {
  loadAdSenseScript()
  nextTick(() => {
    try {
      const w = window as AdSenseWindow
      w.adsbygoogle = w.adsbygoogle || []
      w.adsbygoogle.push({})
    } catch {
      // Ad blocker or script not loaded
    }
  })
}

// Runs on mount and again when the visitor agrees later (consent.revision / choice change).
watch(shouldShow, (on) => {
  if (!import.meta.client || !on || pushed) return
  pushed = true
  showAd()
}, { immediate: true, flush: 'post' })
</script>

<template>
  <div v-if="shouldShow" class="ad-banner" :class="`ad-banner--${placement}`">
    <ins
      class="adsbygoogle"
      :style="{ display: 'block' }"
      :data-ad-client="publisherId"
      :data-ad-slot="slotId"
      :data-ad-format="format || 'auto'"
      :data-full-width-responsive="fullWidth !== false ? 'true' : 'false'"
    />
  </div>
</template>

<style scoped>
.ad-banner {
  width: 100%;
  overflow: hidden;
  text-align: center;
}
.ad-banner--header {
  margin-bottom: 1rem;
}
.ad-banner--content {
  margin-top: 1.5rem;
  margin-bottom: 1.5rem;
}
.ad-banner--footer {
  margin-top: 1rem;
}
</style>

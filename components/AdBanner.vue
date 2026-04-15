<script setup lang="ts">
/**
 * AdBanner — Google AdSense display ad.
 *
 * Reads publisher ID and slot from site settings.
 * Only renders when AdSense is enabled and the slot is configured.
 * Loads the AdSense script once on first mount.
 */

const props = defineProps<{
  /** Which slot to use: 'header' | 'content' | 'footer' */
  placement: 'header' | 'content' | 'footer'
  /** Ad format — defaults to 'auto' */
  format?: string
  /** Full-width responsive — defaults to true */
  fullWidth?: boolean
}>()

const { data: settings } = await useFetch('/api/v1/settings')

const publisherId = computed(() => settings.value?.data?.adsense_publisher_id || '')
const enabled = computed(() => settings.value?.data?.adsense_enabled === 'true')
const slotId = computed(() => {
  const key = `adsense_slot_${props.placement}` as string
  return settings.value?.data?.[key] || ''
})

const shouldShow = computed(() => enabled.value && publisherId.value && slotId.value)

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

onMounted(() => {
  if (shouldShow.value) {
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
})
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

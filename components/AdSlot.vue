<template>
  <!--
    Neutral reserved slot. When NUXT_ADS is off (the default) this renders
    no markup. When on, the height is fixed on SSR so consent cannot cause
    CLS. This PR does not load AdSense or pass spec/class data into the slot.
  -->
  <aside
    v-if="flagOn"
    class="ad-slot"
    :class="`ad-slot--${variant}`"
    :style="{ height: `${height}px` }"
    aria-label="Advertisement"
    :data-ad-placement="placement"
  >
    <p class="ad-slot__label" :class="tone.muted.value">Advertisement</p>
  </aside>
</template>

<script setup lang="ts">
import { isNuxtAdsEnabled } from '~/utils/metaUiCopy'

export type AdSlotPlacement = 'after-build' | 'sidebar' | 'between-sections' | 'index-inline'

const props = withDefaults(defineProps<{
  placement: AdSlotPlacement
  reserve?: number
}>(), { reserve: 0 })

const tone = useMetaTone()
const config = useRuntimeConfig()
const flagOn = computed(() => isNuxtAdsEnabled(config.public.ads))
const variant = computed(() => (props.placement === 'sidebar' ? 'sidebar' : 'inline'))
const height = computed(() => props.reserve || (props.placement === 'sidebar' ? 250 : 100))
</script>

<style scoped>
.ad-slot {
  position: relative;
  overflow: hidden;
  contain: layout size;
  width: 100%;
}
.ad-slot--sidebar {
  max-width: 300px;
}
.ad-slot__label {
  font-size: 12px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  margin-bottom: 0.25rem;
}
</style>

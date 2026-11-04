<script setup lang="ts">
import { retailDownloadLinks } from '~/utils/downloadLinks'

/** Retail download row. `primary` makes CurseForge the one filled button; the rest stay outlined. */
const props = withDefaults(defineProps<{ primary?: boolean, label?: string }>(), { primary: false, label: 'Download MagguuUI' })

const isDark = useIsDark()
const siteSettings = usePublicSiteSettings()
const links = computed(() => retailDownloadLinks(siteSettings.value.curseforge_url))
const outline = computed(() => isDark.value
  ? 'border-white/15 text-silver-200 hover:text-white hover:border-white/35'
  : 'border-gray-300 bg-white text-gray-800 hover:text-gray-950 hover:border-gray-400')
</script>

<template>
  <nav class="flex flex-wrap gap-2" :aria-label="props.label" data-testid="download-buttons">
    <a
      v-for="(item, i) in links"
      :key="item.id"
      :href="item.href"
      target="_blank"
      rel="noopener noreferrer"
      :data-download="item.id"
      class="dl-btn inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-semibold border"
      :class="props.primary && i === 0 ? 'btn-gradient border-transparent text-white' : outline"
    >
      {{ item.label }}
      <UIcon name="i-heroicons-arrow-up-right" class="w-3.5 h-3.5 opacity-70" aria-hidden="true" />
    </a>
  </nav>
</template>

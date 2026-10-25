<template>
  <section class="mt-14 border-t pt-8" :class="isDark ? 'border-white/10' : 'border-gray-200'" aria-labelledby="community-presets-heading" data-testid="community-presets">
    <h2 id="community-presets-heading" class="font-mono text-[11px] uppercase tracking-[0.16em] mb-3" :class="isDark ? 'text-brand-300' : 'text-brand-700'">Community presets</h2>
    <p class="text-sm leading-relaxed" :class="isDark ? 'text-silver-300' : 'text-gray-700'" data-testid="community-disclaimer">
      Community-submitted, not verified or endorsed by MagguuUI; import at your own risk.
    </p>
    <p class="mt-1 text-sm leading-relaxed" :class="muted">
      These are not official Magguu profiles. Each one was sent in by a visitor and approved only after a quick look at its label.
      An import string can change your addon settings, so use ones you trust.
      <NuxtLink to="/submit-preset" data-cta="submit-preset" class="underline underline-offset-2" :class="isDark ? 'text-brand-300' : 'text-brand-700'" data-testid="community-submit-link">Submit your own preset</NuxtLink>.
    </p>

    <p v-if="!loaded" class="mt-6 text-sm" :class="faint">Loading...</p>
    <p v-else-if="!items.length" class="mt-6 text-sm" :class="muted" data-testid="community-empty">No community presets yet.</p>
    <ul v-else class="mt-6 divide-y border-y" :class="isDark ? 'divide-white/10 border-white/10' : 'divide-gray-200 border-gray-200'" data-testid="community-list">
      <li v-for="p in items" :key="p.id" class="flex flex-wrap items-start justify-between gap-x-4 gap-y-2 py-4" :data-testid="`community-item-${p.id}`">
        <div class="min-w-0 flex-1 text-sm">
          <p class="font-medium break-words" :class="strong" data-testid="community-name">{{ p.name }}</p>
          <p class="mt-0.5 text-xs break-words" :class="faint" data-testid="community-meta">
            {{ p.addon }}<template v-if="p.testedVersion"> · Tested with {{ p.addon }} version {{ p.testedVersion }}</template>
          </p>
          <p v-if="p.note" class="mt-1 break-words whitespace-pre-line" :class="muted" data-testid="community-note">{{ p.note }}</p>
        </div>
        <StringCopyButton text="Copy" :copied="copiedId === p.id" :label="`Copy community preset ${p.name} for ${p.addon}`" @copy="copyPreset(p)" />
      </li>
    </ul>
  </section>
</template>

<script setup lang="ts">
import { trackCopy } from '~/utils/beacon'
import { copyTextToClipboard } from '~/utils/clipboard'

interface CommunityPreset { id: number, name: string, addon: string, testedVersion: string, note: string, stringLength: number }

const isDark = useIsDark()
const toast = useToast()
const muted = computed(() => isDark.value ? 'text-silver-400' : 'text-gray-600')
const faint = computed(() => isDark.value ? 'text-silver-500' : 'text-gray-500')
const strong = computed(() => isDark.value ? 'text-white' : 'text-gray-950')

// Client-side on purpose: the list must show an approval at once, not after a cached page expires.
// `loaded` is false during SSR and hydration, so the server and the first client render agree.
const items = ref<CommunityPreset[]>([])
const loaded = ref(false)
onMounted(async () => {
  try {
    items.value = (await $fetch<{ success: boolean, data: CommunityPreset[] }>('/api/v1/community-presets')).data
  } catch {
    items.value = []
  } finally {
    loaded.value = true
  }
})

const copiedId = ref(0)
async function copyPreset(p: CommunityPreset) {
  try {
    const res = await $fetch<{ success: boolean, data: { string: string } }>(`/api/v1/community-presets/${p.id}`)
    if (!(await copyTextToClipboard(res.data.string))) throw new Error('clipboard')
    copiedId.value = p.id
    toast.add({ title: 'Copied', icon: 'i-heroicons-check-circle', color: 'success', duration: 2000 })
    trackCopy('community', p.id)
    setTimeout(() => { if (copiedId.value === p.id) copiedId.value = 0 }, 2000)
  } catch {
    toast.add({ title: 'Could not copy. Please try again.', color: 'error' })
  }
}
</script>

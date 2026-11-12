<template>
  <section class="community" aria-labelledby="community-presets-heading" data-testid="community-presets">
    <h2 id="community-presets-heading" class="mg-kicker mb-3">Community presets</h2>
    <p class="mg-small text-mg-fg" data-testid="community-disclaimer">
      Community-submitted, not verified or endorsed by MagguuUI; import at your own risk.
    </p>
    <p class="community__lead community__lead--tight">
      These are not official Magguu profiles. Each one was sent in by a visitor and approved only after a quick look at its label.
      An import string can change your addon settings, so use ones you trust.
      <NuxtLink to="/submit-preset" data-cta="submit-preset" data-testid="community-submit-link">Submit your own preset</NuxtLink>.
    </p>

    <p v-if="!loaded" class="mt-6 mg-small mg-subtle">Loading...</p>
    <div v-else-if="!items.length" class="community__empty" data-testid="community-empty">
      <p class="font-bold text-mg-fg">No community presets yet.</p>
      <p class="mt-1">
        Share a setup that works for you.
        <NuxtLink to="/submit-preset" class="mg-link">Submit the first one</NuxtLink>.
      </p>
    </div>
    <ul v-else class="community__list" data-testid="community-list">
      <li v-for="p in items" :key="p.id" class="community__item" :data-testid="`community-item-${p.id}`">
        <div class="text-sm">
          <p class="font-bold text-mg-fg" data-testid="community-name">{{ p.name }}</p>
          <p class="mt-0.5 mg-small mg-subtle" data-testid="community-meta">
            {{ p.addon }}<template v-if="p.testedVersion"> · Tested with {{ p.addon }} version {{ p.testedVersion }}</template>
          </p>
          <p v-if="p.note" class="mt-1 whitespace-pre-line mg-muted" data-testid="community-note">{{ p.note }}</p>
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

const toast = useToast()

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

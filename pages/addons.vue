<template>
  <div class="setup-page mg-container pt-8 pb-20">
    <header class="setup-head">
      <p class="mg-kicker setup-rise" style="--i: 0">Catalog</p>
      <h1 class="mg-display mg-title-grad mt-3 setup-rise" style="--i: 1">Addons</h1>
      <div class="setup-head__lead mg-lead space-y-3 setup-rise" style="--i: 2">
        <p>
          EllesmereUI is required. Download it and MagguuUI from CurseForge, Wago, or WoWInterface. The Starter pack addons are recommended; everything else is optional.
        </p>
        <p>
          MagguuUI applies a profile when that addon is installed and skips it otherwise.
          Copy WowUp lists from Setup, or from <NuxtLink to="/strings" class="mg-link">Import Strings</NuxtLink>.
        </p>
      </div>
    </header>

    <p v-if="!groups.length" class="mg-small text-mg-fg-muted" role="status">The addon list could not be loaded. Reload the page to try again.</p>

    <section v-for="(group, index) in groups" :key="group.key" class="addon-group" :aria-labelledby="`addons-${group.key}`">
      <div class="addon-group__head">
        <span class="addon-group__n" aria-hidden="true">{{ String(index + 1).padStart(2, '0') }}</span>
        <h2 :id="`addons-${group.key}`" class="addon-group__title">{{ group.label }}</h2>
        <p class="addon-group__hint">{{ group.hint }}</p>
      </div>

      <template v-if="group.key === 'required'">
        <ul class="addon-required-list">
          <li v-for="addon in group.items" :key="addon.slug">
            <a :href="addon.url ?? undefined" target="_blank" rel="noopener noreferrer" class="addon-required group">
              <img v-if="iconFor(addon.slug)" :src="iconFor(addon.slug)" alt="" width="64" height="64" class="addon-row__icon" loading="lazy" decoding="async" />
              <span v-else class="addon-row__emoji" aria-hidden="true">{{ addon.emoji }}</span>
              <span class="addon-row__body">
                <span class="addon-row__name">{{ addon.name }}<UIcon name="i-heroicons-arrow-up-right" class="addon-row__go w-4 h-4" aria-hidden="true" /></span>
                <span class="addon-row__desc">{{ addon.description }}</span>
              </span>
            </a>
          </li>
        </ul>
      </template>
      <ul v-else class="addon-list">
        <li v-for="addon in group.items" :key="addon.slug">
          <a :href="addon.url ?? undefined" target="_blank" rel="noopener noreferrer" class="addon-row group">
            <img v-if="iconFor(addon.slug)" :src="iconFor(addon.slug)" alt="" width="44" height="44" class="addon-row__icon" loading="lazy" decoding="async" />
            <span v-else class="addon-row__emoji" aria-hidden="true">{{ addon.emoji }}</span>
            <span class="addon-row__body">
              <span class="addon-row__name">{{ addon.name }}<UIcon name="i-heroicons-arrow-up-right" class="addon-row__go w-4 h-4" aria-hidden="true" /></span>
              <span class="addon-row__desc">{{ addon.description }}</span>
            </span>
          </a>
        </li>
      </ul>
    </section>
  </div>
</template>

<script setup lang="ts">
import '~/assets/css/setup.css'
import '~/assets/css/setup-addons.css'
import { ADDON_ICONS } from '~/utils/addonIcons'
import { addonThumbPath } from '~/utils/featureCardMeta'
import { addonGroupForSlug, addonGroupSubtitle } from '~/utils/addonChipMeta'
import type { AddonGroupKey } from '~/utils/addonChipMeta'

usePublicPageSeo({
  title: 'Addons',
  description: 'EllesmereUI is required. Every other addon MagguuUI can set up is optional, with a link to its CurseForge page.',
  path: '/addons',
})

interface Addon {
  slug: string
  name: string
  emoji: string | null
  description: string | null
  url: string | null
  sortOrder?: number
}

interface AddonsResponse {
  required: Addon[]
  core: Addon[]
  optional: Addon[]
  total: number
}

// Awaited on purpose: without it a client-side navigation to /addons renders the page with an empty list first and
// the footer, already on screen, jumps down when the data lands (soft-navigation CLS). SSR output is unchanged.
// Bounded (8 s): a slow API ends in the empty-state note below instead of a navigation that never finishes.
const { data } = await useFetch<{ data: AddonsResponse }>('/api/v1/addons', { timeout: 8000 })

function iconFor(slug: string): string | undefined {
  return addonThumbPath(ADDON_ICONS[slug])
}

// Same grouping as the home page (utils/addonChipMeta.ts): Required, Starter pack, Optional.
const GROUP_HINTS: Partial<Record<AddonGroupKey, string>> = {
  required: 'MagguuUI does not load without EllesmereUI.',
  starter: 'In the Starter WowUp pack with EllesmereUI and MagguuUI. Recommended; missing addons are skipped.',
  optional: 'Install the ones you want. Missing addons are skipped.',
}

const groups = computed(() => {
  const payload = data.value?.data
  const all = [
    ...(payload?.required ?? []).map(addon => ({ addon, category: 'required' as const })),
    ...(payload?.core ?? []).map(addon => ({ addon, category: 'core' as const })),
    ...(payload?.optional ?? []).map(addon => ({ addon, category: 'optional' as const })),
  ].filter(entry => entry.addon.url)
  const order: AddonGroupKey[] = ['required', 'starter', 'optional']
  return order
    .map(key => ({
      key,
      label: addonGroupSubtitle(key),
      hint: GROUP_HINTS[key] ?? '',
      items: all
        .filter(entry => addonGroupForSlug(entry.addon.slug, entry.category) === key)
        .map(entry => entry.addon)
        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.name.localeCompare(b.name)),
    }))
    .filter(group => group.items.length > 0)
})
</script>

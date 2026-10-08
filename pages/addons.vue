<template>
  <div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-20">
    <p class="font-mono text-[11px] uppercase tracking-[0.16em] mb-3" :class="isDark ? 'text-brand-300' : 'text-brand-700'">Catalog</p>
    <h1 class="text-4xl font-semibold tracking-tight" :class="isDark ? 'text-white' : 'text-gray-950'">Addons</h1>
    <div class="mt-4 space-y-3 text-sm leading-relaxed max-w-2xl" :class="isDark ? 'text-silver-400' : 'text-gray-600'">
      <p>
        EllesmereUI is required. Download it and MagguuUI from CurseForge, Wago, or WoWInterface. Everything else is optional.
      </p>
      <p>
        MagguuUI applies a profile when that addon is installed and skips it otherwise.
        Copy WowUp lists from Setup, or from <NuxtLink to="/strings" class="underline underline-offset-4" :class="isDark ? 'text-white' : 'text-gray-950'">Import Strings</NuxtLink>.
      </p>
    </div>

    <section v-for="group in groups" :key="group.key" class="mt-12">
      <h2 class="font-mono text-[11px] uppercase tracking-[0.14em]" :class="isDark ? 'text-brand-300' : 'text-brand-700'">{{ group.label }}</h2>
      <p class="mt-2 text-sm" :class="isDark ? 'text-silver-500' : 'text-gray-500'">{{ group.hint }}</p>
      <ul class="mt-4 grid sm:grid-cols-2 gap-3">
        <li v-for="addon in group.items" :key="addon.slug">
          <a
            :href="addon.url"
            target="_blank"
            rel="noopener noreferrer"
            class="flex h-full gap-3 border p-4"
            :class="isDark ? 'border-white/10 hover:border-white/25' : 'border-gray-200 hover:border-gray-400'"
          >
            <img
              v-if="iconFor(addon.slug)"
              :src="iconFor(addon.slug)"
              :alt="''"
              width="48"
              height="48"
              class="h-12 w-12 shrink-0 object-contain"
            />
            <span v-else class="flex h-12 w-12 shrink-0 items-center justify-center text-2xl" aria-hidden="true">{{ addon.emoji }}</span>
            <span class="min-w-0">
              <span class="block text-sm font-semibold" :class="isDark ? 'text-white' : 'text-gray-950'">{{ addon.name }}</span>
              <span class="mt-1 block text-sm leading-relaxed" :class="isDark ? 'text-silver-400' : 'text-gray-600'">{{ addon.description }}</span>
            </span>
          </a>
        </li>
      </ul>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ADDON_ICONS } from '~/utils/addonIcons'

const isDark = useIsDark()

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

const { data } = useFetch<{ data: AddonsResponse }>('/api/v1/addons')

function iconFor(slug: string): string | undefined {
  return ADDON_ICONS[slug]
}

const groups = computed(() => {
  const payload = data.value?.data
  const required = payload?.required ?? []
  const optional = [...(payload?.core ?? []), ...(payload?.optional ?? [])]
    .filter(addon => addon.url)
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.name.localeCompare(b.name))
  return [
    required.length ? {
      key: 'required',
      label: 'Required',
      hint: 'MagguuUI does not load without EllesmereUI.',
      items: required.filter(addon => addon.url),
    } : null,
    optional.length ? {
      key: 'optional',
      label: 'Optional',
      hint: 'Install the ones you want. Missing addons are skipped.',
      items: optional,
    } : null,
  ].filter((group): group is { key: string, label: string, hint: string, items: Addon[] } => group !== null)
})
</script>

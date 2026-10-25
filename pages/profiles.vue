<template>
  <div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-20">
    <p class="font-mono text-[11px] uppercase tracking-[0.16em] mb-3" :class="isDark ? 'text-brand-300' : 'text-brand-700'">Catalog</p>
    <h1 class="text-4xl font-semibold tracking-tight" :class="isDark ? 'text-white' : 'text-gray-950'">Profile previews</h1>
    <div class="mt-4 space-y-3 text-sm leading-relaxed max-w-2xl" :class="isDark ? 'text-silver-400' : 'text-gray-600'">
      <p>
        See what MagguuUI sets up for each supported addon. The profile names below come from the same data as
        <NuxtLink to="/strings" class="underline underline-offset-4" :class="isDark ? 'text-white' : 'text-gray-950'">Import Strings</NuxtLink>,
        so they always match what you can copy.
      </p>
      <p>MagguuUI applies a profile only when that addon is installed.</p>
    </div>

    <ul v-if="items.length" class="mt-12 grid gap-x-8 gap-y-14 md:grid-cols-2" data-testid="profile-previews">
      <li v-for="(item, index) in items" :key="item.slug" :data-testid="`profile-preview-${item.slug}`">
        <figure class="m-0">
          <img
            v-if="item.image"
            :src="item.image.src"
            :alt="`${item.name} with the MagguuUI profile applied`"
            :width="item.image.width"
            :height="item.image.height"
            :loading="index === 0 ? 'eager' : 'lazy'"
            :fetchpriority="index === 0 ? 'high' : 'auto'"
            decoding="async"
            class="profile-preview__frame block w-full h-auto object-cover border"
            :class="isDark ? 'border-white/10' : 'border-gray-200'"
          />
          <div
            v-else
            class="profile-preview__frame profile-preview__placeholder flex items-center justify-center border border-dashed text-center"
            :class="isDark ? 'border-white/20 text-silver-500' : 'border-gray-300 text-gray-500'"
            data-testid="profile-preview-placeholder"
          >
            <span class="font-mono text-[11px] uppercase tracking-[0.14em]">Preview image to be added</span>
          </div>
          <figcaption class="mt-4">
            <p class="font-mono text-[11px] uppercase tracking-[0.14em]" :class="isDark ? 'text-brand-300' : 'text-brand-700'">{{ categoryLabel(item.category) }}</p>
            <h2 class="mt-1 text-lg font-semibold" :class="isDark ? 'text-white' : 'text-gray-950'">{{ item.name }}</h2>
            <p v-if="item.description" class="mt-1 text-sm leading-relaxed" :class="isDark ? 'text-silver-400' : 'text-gray-600'">{{ item.description }}</p>
            <p class="mt-2 text-sm" :class="isDark ? 'text-silver-400' : 'text-gray-600'">
              <span class="font-mono text-[11px] uppercase tracking-[0.14em]" :class="isDark ? 'text-silver-500' : 'text-gray-500'">Profiles</span>
              <span class="ml-2" data-testid="profile-preview-names">{{ item.profiles.join(', ') }}</span>
            </p>
            <p class="mt-2 text-sm">
              <NuxtLink :to="item.stringsHref" class="underline underline-offset-4" :class="isDark ? 'text-white' : 'text-gray-950'">Open import string</NuxtLink>
            </p>
          </figcaption>
        </figure>
      </li>
    </ul>

    <p v-else class="mt-12 text-sm" :class="isDark ? 'text-silver-400' : 'text-gray-600'" data-testid="profile-previews-empty">
      No profiles are published yet. Check back after the next MagguuUI update.
    </p>
  </div>
</template>

<script setup lang="ts">
import type { ProfilePreviewItem } from '~/server/utils/profilePreviews'

const isDark = useIsDark()

usePublicPageSeo({
  title: 'Profile previews',
  description: 'See what MagguuUI sets up for EllesmereUI, BigWigs, Northern Sky and every other supported addon, with the profile names you can import.',
  path: '/profiles',
})

const { data } = await useFetch<{ data: ProfilePreviewItem[] }>('/api/v1/profile-previews')
const items = computed(() => data.value?.data ?? [])

const CATEGORY_LABELS: Record<ProfilePreviewItem['category'], string> = { required: 'Required', core: 'Core', optional: 'Optional' }
const categoryLabel = (c: ProfilePreviewItem['category']) => CATEGORY_LABELS[c]
</script>

<style scoped>
/* One fixed 16:10 frame for image and placeholder: lazy images never shift the layout. */
.profile-preview__frame { aspect-ratio: 16 / 10; }
.profile-preview__placeholder { padding: 1rem; }
</style>

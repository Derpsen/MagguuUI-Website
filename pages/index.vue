<!--
  Home — install sheet. Content from API with static fallbacks.
-->

<template>
  <div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 sm:pt-14 pb-20">
    <div v-if="isLoggedIn" class="flex justify-end mb-4">
      <NuxtLink to="/admin/content/home"
        class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border"
        :class="isDark ? 'text-silver-400 hover:text-white border-white/10' : 'text-gray-500 hover:text-gray-900 border-gray-200'">
        Edit page
      </NuxtLink>
    </div>

    <section aria-label="Hero" class="grid lg:grid-cols-[minmax(0,1.4fr)_minmax(14rem,0.7fr)] gap-10 lg:gap-16 items-start">
      <div>
        <p class="font-mono text-[11px] uppercase tracking-[0.16em] mb-4" :class="isDark ? 'text-brand-300' : 'text-brand-700'">
          WoW Retail · EllesmereUI
        </p>
        <h1 class="text-5xl sm:text-6xl font-semibold tracking-tight leading-[0.95]" :class="isDark ? 'text-white' : 'text-gray-950'">
          {{ content?.hero?.title || 'MagguuUI' }}
          <span v-if="heroTitle2" class="block mt-3 text-xl sm:text-2xl font-medium tracking-normal leading-snug" :class="isDark ? 'text-silver-400' : 'text-gray-500'">{{ heroTitle2 }}</span>
        </h1>
        <SafeHtml class="home-hero-copy mt-6 max-w-xl text-base sm:text-lg leading-relaxed"
          :class="isDark ? 'text-silver-300' : 'text-gray-600'"
          :html="content?.hero?.description || 'Native <strong>EllesmereUI</strong> module for WoW Retail. Designed for 4K. Install EllesmereUI + four MagguuUI folders, open <code>/mui</code>, and run <strong>Apply Magguu profiles</strong>.'"
        />
        <div class="mt-8 flex flex-wrap gap-3">
          <NuxtLink to="/guide" class="btn-gradient px-5 py-2.5 rounded-md text-white text-sm font-semibold">
            Install &amp; Setup
          </NuxtLink>
          <NuxtLink to="/strings"
            class="px-5 py-2.5 rounded-md text-sm font-semibold border"
            :class="isDark ? 'border-white/15 text-silver-200 hover:text-white' : 'border-gray-300 text-gray-700 hover:text-gray-950'">
            Import Strings
          </NuxtLink>
        </div>
      </div>

      <ol class="lg:pt-9" :class="isDark ? 'border-white/10' : 'border-gray-200'">
        <li class="grid grid-cols-[1.4rem_1fr] gap-3 py-3 border-b text-sm leading-relaxed" :class="isDark ? 'border-white/10 text-silver-300' : 'border-gray-200 text-gray-700'">
          <span class="font-mono text-xs pt-0.5" :class="isDark ? 'text-brand-300' : 'text-brand-700'">1</span>
          <span>Install EllesmereUI and the four MagguuUI folders.</span>
        </li>
        <li class="grid grid-cols-[1.4rem_1fr] gap-3 py-3 border-b text-sm leading-relaxed" :class="isDark ? 'border-white/10 text-silver-300' : 'border-gray-200 text-gray-700'">
          <span class="font-mono text-xs pt-0.5" :class="isDark ? 'text-brand-300' : 'text-brand-700'">2</span>
          <span>Open <code class="font-mono text-[0.92em]" :class="isDark ? 'text-white' : 'text-gray-950'">/mui</code>.</span>
        </li>
        <li class="grid grid-cols-[1.4rem_1fr] gap-3 py-3 border-b text-sm leading-relaxed" :class="isDark ? 'border-white/10 text-silver-300' : 'border-gray-200 text-gray-700'">
          <span class="font-mono text-xs pt-0.5" :class="isDark ? 'text-brand-300' : 'text-brand-700'">3</span>
          <span>Run <strong class="font-semibold" :class="isDark ? 'text-white' : 'text-gray-950'">Apply Magguu profiles</strong>.</span>
        </li>
      </ol>
    </section>

    <section aria-label="Screenshots" class="mt-16">
      <h2 class="text-base font-semibold" :class="isDark ? 'text-white' : 'text-gray-950'">In game</h2>
      <figure class="mt-4">
        <img
          src="/screenshots/hud.jpg"
          alt="MagguuUI dungeon HUD: unit frames, cast bars, and action bars."
          width="2000"
          height="1125"
          class="w-full border"
          :class="isDark ? 'border-white/10' : 'border-gray-200'"
          loading="lazy"
          decoding="async"
        />
        <figcaption class="mt-2 font-mono text-[11px] uppercase tracking-[0.14em]" :class="isDark ? 'text-brand-300' : 'text-brand-700'">HUD</figcaption>
      </figure>
      <div class="mt-6 grid sm:grid-cols-2 gap-6">
        <figure>
          <img
            src="/screenshots/edit-mode.jpg"
            alt="Edit Mode with the Magguu frame layout."
            width="2000"
            height="1125"
            class="w-full border"
            :class="isDark ? 'border-white/10' : 'border-gray-200'"
            loading="lazy"
            decoding="async"
          />
          <figcaption class="mt-2 font-mono text-[11px] uppercase tracking-[0.14em]" :class="isDark ? 'text-brand-300' : 'text-brand-700'">Edit Mode</figcaption>
        </figure>
        <figure>
          <img
            src="/screenshots/setup.jpg"
            alt="EllesmereUI MagguuUI Setup, with Apply Magguu profiles."
            width="2000"
            height="1125"
            class="w-full border"
            :class="isDark ? 'border-white/10' : 'border-gray-200'"
            loading="lazy"
            decoding="async"
          />
          <figcaption class="mt-2 font-mono text-[11px] uppercase tracking-[0.14em]" :class="isDark ? 'text-brand-300' : 'text-brand-700'">Setup</figcaption>
        </figure>
      </div>
    </section>

    <section aria-label="Addons and latest release" class="mt-16 grid lg:grid-cols-[minmax(0,1.25fr)_minmax(15rem,0.75fr)] gap-12 lg:gap-16 items-start">
      <div>
        <h2 class="text-base font-semibold" :class="isDark ? 'text-white' : 'text-gray-950'">{{ content?.addons?.title || 'Supported Addons' }}</h2>
        <p class="mt-2 text-sm max-w-xl leading-relaxed" :class="isDark ? 'text-silver-500' : 'text-gray-500'">{{ content?.addons?.subtitle || 'Grouped Required / Optional / WowUp. Chat pack: Whisper Messenger (not WIM).' }}</p>
        <div v-if="addonGroups.length" class="mt-6 space-y-5">
          <div v-for="group in addonGroups" :key="group.key">
            <p class="font-mono text-[11px] uppercase tracking-[0.14em] mb-1.5" :class="isDark ? 'text-brand-300' : 'text-brand-700'">{{ group.label }}</p>
            <p class="text-sm leading-7" :class="isDark ? 'text-silver-300' : 'text-gray-700'">
              <template v-for="(item, index) in group.items" :key="item.key">
                <span v-if="index > 0" class="px-1.5" :class="isDark ? 'text-white/25' : 'text-gray-300'">·</span>
                <NuxtLink :to="item.href" class="hover:underline underline-offset-4">{{ item.name }}</NuxtLink>
              </template>
            </p>
          </div>
        </div>
      </div>

      <div v-if="latestCard">
        <p class="font-mono text-[11px] uppercase tracking-[0.14em]" :class="isDark ? 'text-brand-300' : 'text-brand-700'">Latest</p>
        <NuxtLink to="/changelog" class="group block mt-2">
          <span class="font-mono text-2xl font-semibold tracking-tight" :class="isDark ? 'text-white group-hover:text-brand-200' : 'text-gray-950 group-hover:text-brand-700'">{{ latestCard.version }}</span>
          <span v-if="latestCard.date" class="block mt-1 text-xs" :class="isDark ? 'text-silver-500' : 'text-gray-500'">{{ latestCard.date }}</span>
        </NuxtLink>
        <ul class="mt-4 space-y-2 text-sm leading-relaxed" :class="isDark ? 'text-silver-400' : 'text-gray-600'">
          <li v-for="(bullet, index) in latestCard.bullets" :key="index">{{ bullet }}</li>
        </ul>
      </div>
    </section>

    <section aria-label="Features" class="mt-16 pt-10 border-t" :class="isDark ? 'border-white/10' : 'border-gray-200'">
      <h2 class="text-base font-semibold" :class="isDark ? 'text-white' : 'text-gray-950'">{{ content?.features_heading?.title || 'The module' }}</h2>
      <p class="mt-2 text-sm max-w-xl" :class="isDark ? 'text-silver-500' : 'text-gray-500'">{{ content?.features_heading?.subtitle || 'An EllesmereUI setup with optional raid tools' }}</p>
      <div class="mt-2" :class="isDark ? 'divide-white/10' : 'divide-gray-200'">
        <article v-for="(feat, index) in features" :key="index" class="py-6 border-b" :class="isDark ? 'border-white/10' : 'border-gray-200'">
          <h3 class="text-sm font-semibold mb-2" :class="isDark ? 'text-white' : 'text-gray-950'">{{ feat.title }}</h3>
          <SafeHtml
            class="home-feature-copy text-sm leading-relaxed max-w-3xl"
            :class="isDark ? 'text-silver-400' : 'text-gray-600'"
            :html="feat.text"
          />
        </article>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { buildPublicUrl } from '~/utils/publicSite'
import {
  addonGroupForSlug,
  addonGroupSubtitle,
  changelogPreviewBullets,
  groupAddonChips,
  profileHrefForSlug,
} from '~/utils/addonChipMeta'

const { isLoggedIn } = useAuth()
const isDark = useIsDark()
const siteSettings = usePublicSiteSettings()
const homeMetaTitle = computed(() => siteSettings.value.meta_title || 'MagguuUI — Ellesmere setup')
const homeMetaDescription = computed(() => siteSettings.value.meta_description || 'Native overhaul for EllesmereUI, designed for 4K. Install EllesmereUI and the four MagguuUI folders, open /mui, and run Apply Magguu profiles.')
const homeOgImage = computed(() => siteSettings.value.og_image_url || buildPublicUrl('/logo.png'))
const homeCanonical = buildPublicUrl('/')
const homeSiteName = computed(() => siteSettings.value.site_name || 'MagguuUI')

useHead({
  link: [
    { rel: 'canonical', href: homeCanonical },
  ],
  script: [
    {
      type: 'application/ld+json',
      innerHTML: () => JSON.stringify([
        {
          '@context': 'https://schema.org',
          '@type': 'WebApplication',
          name: siteSettings.value.site_name || 'MagguuUI',
          url: homeCanonical,
          description: homeMetaDescription.value,
          image: homeOgImage.value,
          applicationCategory: 'GameApplication',
          operatingSystem: 'Web',
          offers: {
            '@type': 'Offer',
            price: '0',
            priceCurrency: 'EUR',
          },
          author: {
            '@type': 'Organization',
            name: siteSettings.value.site_name || 'MagguuUI',
            url: homeCanonical,
          },
        },
        {
          '@context': 'https://schema.org',
          '@type': 'WebSite',
          name: siteSettings.value.site_name || 'MagguuUI',
          url: homeCanonical,
          description: homeMetaDescription.value,
          publisher: {
            '@type': 'Organization',
            name: siteSettings.value.site_name || 'MagguuUI',
            url: homeCanonical,
            logo: {
              '@type': 'ImageObject',
              url: buildPublicUrl('/logo.png'),
            },
            ...(siteSettings.value.github_url ? { sameAs: [siteSettings.value.github_url] } : {}),
          },
        },
      ]),
    },
  ],
})

useSeoMeta({
  title: () => homeMetaTitle.value,
  description: () => homeMetaDescription.value,
  ogTitle: () => homeMetaTitle.value,
  ogDescription: () => homeMetaDescription.value,
  ogSiteName: () => homeSiteName.value,
  ogUrl: homeCanonical,
  ogImage: () => homeOgImage.value,
  ogImageWidth: 1200,
  ogImageHeight: 630,
  ogImageType: 'image/png',
  twitterCard: 'summary_large_image',
  twitterTitle: () => homeMetaTitle.value,
  twitterDescription: () => homeMetaDescription.value,
  twitterImage: () => homeOgImage.value,
})

interface HomeContent {
  hero?: { badge?: string, title?: string, title2?: string, description?: string, [k: string]: unknown }
  features?: Record<string, string>
  features_heading?: { title?: string, subtitle?: string }
  addons?: { title?: string, subtitle?: string }
  [k: string]: unknown
}

interface PublicAddonChip {
  slug: string
  name: string
  category: 'required' | 'core' | 'optional'
  emoji: string | null
}

interface AddonsPayload {
  required: PublicAddonChip[]
  core: PublicAddonChip[]
  optional: PublicAddonChip[]
}

const { data: contentData } = useFetch<{ data: HomeContent }>('/api/v1/content/home')
const { data: addonsData } = useFetch<{ data: AddonsPayload }>('/api/v1/addons')

const content = computed(() => contentData.value?.data)
const heroTitle2 = computed(() => {
  const raw = content.value?.hero?.title2
  if (typeof raw !== 'string') return 'Ellesmere setup.'
  return raw.trim()
})

function toChip(addon: PublicAddonChip) {
  const kind = addonGroupForSlug(addon.slug, addon.category)
  const subtitle = addonGroupSubtitle(kind)
  // Whisper Messenger = WowUp; WIM = Optional Magguu import only (never WowUp).
  const badge = kind
  return {
    key: addon.slug,
    name: addon.name,
    href: profileHrefForSlug(addon.slug),
    kind,
    badge,
    subtitle,
  }
}

const allAddonChips = computed(() => {
  const data = addonsData.value?.data
  if (!data) return []
  return [...(data.required ?? []), ...(data.core ?? []), ...(data.optional ?? [])].map(toChip)
})

const addonGroups = computed(() => groupAddonChips(allAddonChips.value))

const { data: changelogListData } = useFetch<{ data: Array<{ version: string, content: string, publishedAt: string | number | null }> }>('/api/v1/changelogs')
const latestCard = computed(() => {
  const entry = changelogListData.value?.data?.[0]
  if (!entry?.version) return null
  const bullets = changelogPreviewBullets(entry.content || '', 3)
  if (!bullets.length) return null
  const date = entry.publishedAt
    ? new Date(entry.publishedAt).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })
    : ''
  return { version: entry.version, date, bullets }
})

const features = computed(() => [
  {
    title: content.value?.features?.feature_1_title || 'Native Ellesmere setup',
    text: content.value?.features?.feature_1_text || 'Two sidebar rows: Options (Setup, Skinning, QoL) and Changelog. Gold <strong>Apply Magguu profiles</strong>, Magguu Settings, Load profiles, required and optional imports, and WowUp copy strings live on Setup. Open with <code>/mui</code>. Tools via <code>/mui tools</code> or 10 clicks on the MagguuUI header.',
  },
  {
    title: content.value?.features?.feature_2_title || 'Current Retail layouts',
    text: content.value?.features?.feature_2_text || 'Ellesmere profile <strong>MagguuUI</strong> at scale <strong>0.58</strong> with a fixed tooltip. Class layouts import as <strong>Magguu - Class Spec</strong>. Optional Magguu profiles for BigWigs, Northern Sky, EXBoss, WIM, Whisper Messenger, Waypoint UI, HandyNotes, Talent Tree Tweaks, GTFO, BugSack, Premade Groups Filter, and Smart Reminders.',
  },
  {
    title: content.value?.features?.feature_3_title || 'Skinning and QoL included',
    text: content.value?.features?.feature_3_text || 'Skinning is one <strong>NAMES &amp; COLORS</strong> section (two columns): split unit-frame names, split party and raid names, and class-colored keybind modifiers. QoL covers Death Release, Co-Tank, Stealth/Stance, Spell Alerts, party and raid item level (and 2P/4P), <strong>Smart Tab</strong>, Hide Services on General, <strong>Quick Focus</strong>, an <strong>Audio device switcher</strong> on the Ellesmere speaker, <strong>Boiling Point</strong>, and <strong>Targeted Spell Bars</strong> via Ellesmere (leave EXBoss MythicCast off).',
  },
])

</script>

<style scoped>
.home-hero-copy :deep(p),
.home-feature-copy :deep(p) {
  margin: 0;
}

.home-hero-copy :deep(p + p),
.home-feature-copy :deep(p + p) {
  margin-top: 0.6em;
}

.home-hero-copy :deep(strong),
.home-feature-copy :deep(strong) {
  color: inherit;
  font-weight: 700;
}

.home-hero-copy :deep(em),
.home-feature-copy :deep(em) {
  color: inherit;
}

.home-hero-copy :deep(code),
.home-feature-copy :deep(code) {
  padding: 0.1em 0.4em;
  border-radius: 4px;
  font-size: 0.9em;
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  background: color-mix(in srgb, currentColor 12%, transparent);
}

.home-hero-copy :deep(a),
.home-feature-copy :deep(a) {
  color: var(--color-brand-300, #45e0bb);
  text-decoration: underline;
  text-underline-offset: 0.18em;
}

.home-feature-copy :deep(ul),
.home-feature-copy :deep(ol),
.home-hero-copy :deep(ul),
.home-hero-copy :deep(ol) {
  margin: 0.6em 0 0;
  padding-left: 1.25em;
}

.home-feature-copy :deep(li),
.home-hero-copy :deep(li) {
  margin-top: 0.2em;
}
</style>

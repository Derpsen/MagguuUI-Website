<!--
  Landing Page — Full fade-in + scroll reveal animations
  Content from API with static fallbacks
-->

<template>
  <div>
    <!-- Hero Section — full viewport, fade in on load -->
    <section aria-label="Hero" class="relative flex flex-col" style="min-height: calc(100dvh - 5rem);">
      <!-- Admin Edit Button -->
      <div v-if="isLoggedIn" class="absolute top-4 right-4 sm:right-8 z-10">
        <NuxtLink to="/admin/content/home"
          class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
          :class="isDark ? 'bg-white/5 text-silver-400 hover:text-white hover:bg-white/10 border border-brand-400/15 backdrop-blur' : 'bg-white/80 text-gray-500 hover:text-gray-900 hover:bg-white border border-gray-200 backdrop-blur'">
          <svg aria-hidden="true" class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" /></svg>
          Edit Page
        </NuxtLink>
      </div>
      <div class="relative max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-10 sm:pt-14 pb-4">
        <div class="relative px-6 py-8 sm:px-10 sm:py-12 lg:px-12 lg:py-14">
          <div class="max-w-4xl mx-auto flex flex-col items-center text-center">
            <!-- Badge — links to changelog, shows last change -->
            <NuxtLink to="/changelog" class="hero-badge inline-flex items-center gap-2 px-5 py-2 rounded-full text-sm font-medium mb-10 fade-in cursor-pointer transition-all hover:scale-105"
              :style="isDark
                ? 'background: rgba(59, 139, 255, 0.08); border: 1px solid rgba(59, 139, 255, 0.15); color: #60a5fa;'
                : 'background: rgba(59, 139, 255, 0.06); border: 1px solid rgba(59, 139, 255, 0.15); color: #2563EB;'">
              <span>🚀</span>
              <span>{{ latestBadgeText }}</span>
            </NuxtLink>

            <h1 class="text-5xl sm:text-6xl lg:text-7xl font-extrabold leading-[1.1] mb-8 fade-in fade-in-delay-1">
              <span class="text-gradient">{{ content?.hero?.title || 'Your WoW Interface,' }}</span> <br />
              <span class="text-gradient">{{ content?.hero?.title2 || 'perfected.' }}</span>
            </h1>

            <div class="home-hero-copy text-lg sm:text-xl max-w-2xl mx-auto mb-12 leading-relaxed fade-in fade-in-delay-2"
              :class="isDark ? 'text-silver-400' : 'text-gray-500'"
              v-html="renderHomeRichText(content?.hero?.description || 'High-quality import strings for cooldowns, addon profiles, and more. Simply copy and paste into WoW.')"
            />

            <div class="flex items-center justify-center gap-4 fade-in fade-in-delay-3">
              <NuxtLink to="/strings" class="btn-gradient px-8 py-4 rounded-xl text-white font-semibold text-lg inline-flex items-center gap-2">
                <svg aria-hidden="true" class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M13 2L4.09 12.11A1 1 0 005 14h6v6a1 1 0 001.91.59l8.91-10.11A1 1 0 0021 8.89h-6V3a1 1 0 00-1.91-.59L13 2z" /></svg>
                Import Strings
              </NuxtLink>
              <NuxtLink to="/guide"
                class="glass glass-hover px-8 py-4 rounded-xl font-semibold text-lg inline-flex items-center gap-2 transition-all"
                :class="isDark ? 'text-silver-300 hover:text-white' : 'text-gray-600 hover:text-gray-900'">
                📖 Guides
              </NuxtLink>
            </div>

            <div class="mt-14 w-full fade-in fade-in-delay-4">
              <div class="w-full max-w-md mx-auto h-px mb-10"
                :class="isDark ? 'bg-gradient-to-r from-transparent via-brand-400/20 to-transparent' : 'bg-gradient-to-r from-transparent via-blue-200 to-transparent'" />
              <div class="flex items-center justify-center gap-16 sm:gap-24">
                <div v-for="stat in stats" :key="stat.label" class="text-center">
                  <div class="text-4xl sm:text-5xl font-extrabold text-gradient mb-1.5">{{ stat.value }}</div>
                  <div class="text-sm font-medium" :class="isDark ? 'text-silver-500' : 'text-gray-500'">{{ stat.label }}</div>
                </div>
              </div>
            </div>
          </div>

          <div class="mt-12 pt-10 border-t"
            :class="isDark ? 'border-white/8' : 'border-blue-100'">
            <div ref="addonsHeading" class="text-center mb-8 scroll-reveal">
              <h2 class="text-3xl sm:text-4xl font-bold mb-4"><span class="text-gradient">{{ content?.addons?.title || 'Supported Addons' }}</span></h2>
              <p :class="isDark ? 'text-silver-500' : 'text-gray-500'">{{ content?.addons?.subtitle || 'Profiles for the most popular WoW addons' }}</p>
            </div>
            <div v-if="addonNames.length" ref="addonPills" class="scroll-reveal scroll-reveal-delay-1">
              <div class="flex flex-wrap justify-center gap-3 py-1">
                <NuxtLink v-for="addon in addonNames" :key="addon" :to="`/strings?addon=${encodeURIComponent(addon)}`"
                  class="addon-pill px-5 py-3 rounded-xl text-sm font-medium transition-all group inline-flex items-center gap-2"
                  :class="isDark ? 'text-silver-300 hover:text-brand-400' : 'text-gray-600 hover:text-brand-500'">
                  <span class="w-2 h-2 rounded-full bg-brand-400/40 group-hover:bg-brand-400 transition-colors" />
                  {{ addon }}
                  <svg aria-hidden="true" class="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 -translate-x-1 group-hover:translate-x-0 transition-all" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                  </svg>
                </NuxtLink>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Scroll indicator — fixed overlay, fades out on scroll -->
    <div
      class="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex justify-center fade-in fade-in-delay-4 pointer-events-none transition-opacity duration-500"
      :style="{ opacity: scrollIndicatorOpacity }">
      <div class="scroll-bounce backdrop-blur-sm rounded-full p-2"
        :class="isDark ? 'bg-brand-950/60' : 'bg-white/60'">
        <svg aria-hidden="true" class="w-7 h-7" :class="isDark ? 'text-brand-400/70' : 'text-blue-400'" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </div>

    <div class="section-divider" />

    <!-- Features — scroll reveal -->
    <section aria-label="Features" class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
      <div ref="featuresHeading" class="text-center mb-16 scroll-reveal">
        <h2 class="text-3xl sm:text-4xl font-bold mb-4"><span class="text-gradient">{{ content?.features_heading?.title || 'Why MagguuUI?' }}</span></h2>
        <p :class="isDark ? 'text-silver-500' : 'text-gray-500'" class="text-lg">{{ content?.features_heading?.subtitle || 'Everything you need — in one package' }}</p>
      </div>
      <div class="grid md:grid-cols-3 gap-6">
        <div v-for="(feat, idx) in features" :key="idx"
          class="feature-card feature-reveal-item rounded-2xl p-8 group scroll-reveal"
          :class="`scroll-reveal-delay-${idx + 1}`">
          <div class="w-14 h-14 rounded-xl bg-brand-400/10 flex items-center justify-center mb-6 group-hover:bg-brand-400/15 transition-colors">
            <span class="text-2xl">{{ feat.emoji }}</span>
          </div>
          <h3 class="text-lg font-semibold text-gradient-subtle mb-3">{{ feat.title }}</h3>
          <div
            class="home-feature-copy text-sm leading-relaxed"
            :class="isDark ? 'text-silver-500' : 'text-gray-500'"
            v-html="renderHomeRichText(feat.text)"
          />
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { sanitizeRichHtml } from '~/utils/richText'

const { isLoggedIn } = useAuth()
const isDark = useIsDark()
const siteSettings = usePublicSiteSettings()
const homeMetaTitle = computed(() => siteSettings.value.meta_title || 'MagguuUI - Your WoW Interface, perfected.')
const homeMetaDescription = computed(() => siteSettings.value.meta_description || 'High-quality import strings for ElvUI, Plater, BigWigs, Details & more. Simply copy and paste into WoW.')
const homeOgImage = computed(() => siteSettings.value.og_image_url || 'https://ui.magguu.xyz/logo.png')

useHead({
  link: [
    { rel: 'canonical', href: 'https://ui.magguu.xyz/' },
  ],
  script: [
    {
      type: 'application/ld+json',
      innerHTML: () => JSON.stringify([
        {
          '@context': 'https://schema.org',
          '@type': 'WebApplication',
          name: siteSettings.value.site_name || 'MagguuUI',
          url: 'https://ui.magguu.xyz',
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
            url: 'https://ui.magguu.xyz',
          },
        },
        {
          '@context': 'https://schema.org',
          '@type': 'WebSite',
          name: siteSettings.value.site_name || 'MagguuUI',
          url: 'https://ui.magguu.xyz',
          description: homeMetaDescription.value,
          publisher: {
            '@type': 'Organization',
            name: siteSettings.value.site_name || 'MagguuUI',
            url: 'https://ui.magguu.xyz',
            logo: {
              '@type': 'ImageObject',
              url: 'https://ui.magguu.xyz/logo.png',
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
  ogImage: () => homeOgImage.value,
  twitterTitle: () => homeMetaTitle.value,
  twitterDescription: () => homeMetaDescription.value,
  twitterImage: () => homeOgImage.value,
})

// Content fetching
const { data: contentData } = await useFetch('/api/v1/content/home')
const { data: profileData } = await useFetch('/api/v1/profiles')
const { data: layoutData } = await useFetch('/api/v1/layouts')
const { data: wowupData } = await useFetch('/api/v1/wowup')
const { data: changelogData } = await useFetch('/api/v1/changelogs')
const { data: latestChangeData } = await useFetch('/api/v1/latest-change')

const content = computed(() => (contentData.value as any)?.data)
const addonNames = computed(() => {
  const grouped = (profileData.value as any)?.data
  if (!grouped || typeof grouped !== 'object') return []
  return Object.keys(grouped)
})

// Badge text: show last changed string name
const latestBadgeText = computed(() => {
  const change = (latestChangeData.value as any)?.data
  if (change?.name) {
    const actionMap: Record<string, string> = { created: 'New', updated: 'Updated', deleted: 'Removed' }
    const action = actionMap[change.action] || 'Updated'
    return `${action}: ${change.name}`
  }
  return content.value?.hero?.badge || 'New: String updates'
})

// Features — fallbacks must mirror DEFAULT_HOME_CONTENT in
// server/database/defaultContent.ts so the page reads the same on a fresh
// install (CMS empty) and after seeding.
const features = computed(() => [
  {
    emoji: '⚡',
    title: content.value?.features?.feature_1_title || 'One-click setup',
    text: content.value?.features?.feature_1_text || 'Install MagguuUI from CurseForge, log in once, click Install All. Every supported addon gets its profile applied automatically — missing addons are simply skipped.',
  },
  {
    emoji: '🔄',
    title: content.value?.features?.feature_2_title || 'Always up to date',
    text: content.value?.features?.feature_2_text || 'Profiles are tuned for the current WoW patch and updated regularly. MagguuUI tells you in chat or via popup whenever a new version is available.',
  },
  {
    emoji: '🎯',
    title: content.value?.features?.feature_3_title || 'Class layouts included',
    text: content.value?.features?.feature_3_text || 'Cooldown layouts are pre-built for every class and specialization, and re-applied automatically when you change spec.',
  },
])

const totalStrings = computed(() => {
  let count = 0
  const grouped = (profileData.value as any)?.data
  if (grouped && typeof grouped === 'object') { for (const profiles of Object.values(grouped)) { count += (profiles as any[]).length } }
  const layouts = (layoutData.value as any)?.data
  if (Array.isArray(layouts)) count += layouts.length
  const wowup = (wowupData.value as any)?.data
  if (wowup && typeof wowup === 'object') count += Object.keys(wowup).length
  return count
})

const categoryCount = computed(() => {
  let count = 0
  const grouped = (profileData.value as any)?.data
  if (grouped && typeof grouped === 'object') count += Object.keys(grouped).length
  const layouts = (layoutData.value as any)?.data
  if (Array.isArray(layouts) && layouts.length > 0) count++
  const wowup = (wowupData.value as any)?.data
  if (wowup && typeof wowup === 'object' && Object.keys(wowup).length > 0) count++
  return count
})

const updateCount = computed(() => {
  const entries = (changelogData.value as any)?.data
  return Array.isArray(entries) ? entries.length : 0
})

// Animated counter — counts up from 0 to target with easeOutCubic
function useAnimatedCounter(target: Ref<number>, duration = 1200) {
  const current = ref(0)
  if (!import.meta.client) {
    watch(target, (val) => { current.value = val }, { immediate: true })
    return current
  }
  let started = false
  watch(target, (val) => {
    if (val <= 0 || started) { if (val <= 0) current.value = 0; return }
    started = true
    const start = performance.now()
    function step(now: number) {
      const progress = Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      current.value = Math.round(val * eased)
      if (progress < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }, { immediate: true })
  return current
}

const animatedTotal = useAnimatedCounter(totalStrings)
const animatedCategories = useAnimatedCounter(categoryCount)
const animatedUpdates = useAnimatedCounter(updateCount)

const stats = computed(() => [
  { value: animatedTotal.value, label: 'Import Strings' },
  { value: animatedCategories.value, label: 'Categories' },
  { value: animatedUpdates.value, label: 'Updates' },
])

function renderHomeRichText(text: string): string {
  return sanitizeRichHtml(text)
}

// ─── Scroll Indicator ─────────────────────
const scrollIndicatorOpacity = ref(1)
let homeRevealObserver: IntersectionObserver | null = null

function handleHeroScroll() {
  const y = window.scrollY
  scrollIndicatorOpacity.value = y < 80 ? 1 : Math.max(0, 1 - (y - 80) / 120)
}

// ─── Scroll Reveal ─────────────────────
const featuresHeading = ref<HTMLElement | null>(null)
const addonsHeading = ref<HTMLElement | null>(null)
const addonPills = ref<HTMLElement | null>(null)
onMounted(() => {
  window.addEventListener('scroll', handleHeroScroll, { passive: true })
  handleHeroScroll()

  homeRevealObserver = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        (entry.target as HTMLElement).classList.add('scroll-revealed')
        homeRevealObserver?.unobserve(entry.target)
      }
    }
  }, { threshold: 0.1, rootMargin: '0px 0px -60px 0px' })

  const featureItems = document.querySelectorAll('.feature-reveal-item')
  const targets = [featuresHeading.value, ...Array.from(featureItems), addonsHeading.value, addonPills.value]
  for (const el of targets) {
    if (el) homeRevealObserver.observe(el)
  }
})

onUnmounted(() => {
  if (import.meta.client) {
    window.removeEventListener('scroll', handleHeroScroll)
  }
  homeRevealObserver?.disconnect()
  homeRevealObserver = null
})
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

.home-hero-copy :deep(a),
.home-feature-copy :deep(a) {
  color: var(--color-brand-300, #90bbff);
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

<!--
  Home — install sheet. Content from API with static fallbacks.
-->

<template>
  <div class="home">
    <div v-if="isLoggedIn" class="mg-container pt-4 flex justify-end">
      <NuxtLink to="/admin/content/home" class="mg-btn mg-btn--ghost mg-btn--sm">Edit page</NuxtLink>
    </div>

    <!-- Hero: centred, huge type, layered aurora, the HUD as a framed product shot that flattens while you scroll (CSS only). -->
    <div class="home-hero-wrap">
      <section aria-label="Hero" class="mg-container home-hero">
        <p class="mg-badge mg-badge--accent home-hero__eyebrow home-rise" style="--i: 0">
          <span class="home-hero__dot" aria-hidden="true" />
          {{ heroEyebrow }}
        </p>
        <h1 class="mg-display home-hero__title home-rise" style="--i: 1">
          <span class="home-hero__name">{{ content?.hero?.title || 'MagguuUI' }}</span>
          <span v-if="heroTitle2" class="home-hero__sub">{{ heroTitle2 }}</span>
        </h1>
        <SafeHtml class="home-hero-copy mg-lead home-hero__lead home-rise" style="--i: 2"
          :html="content?.hero?.description || 'Native <strong>EllesmereUI</strong> module for WoW Retail. Designed for 4K. Open <code>/mui</code> and run <strong>Apply Magguu profiles</strong>.'"
        />
        <div class="home-cta home-rise" style="--i: 3">
          <NuxtLink to="/guide" data-cta="hero-setup" class="mg-btn mg-btn--primary mg-btn--lg btn-gradient home-cta__main">
            Install &amp; Setup
          </NuxtLink>
          <NuxtLink to="/strings" class="mg-btn mg-btn--secondary mg-btn--lg">
            Import Strings
          </NuxtLink>
        </div>
        <div class="home-dl home-rise" style="--i: 4">
          <p class="mg-kicker mg-subtle">Download</p>
          <DownloadButtons />
        </div>
        <p v-if="trustLine.length" class="home-trust home-rise" style="--i: 5" data-testid="home-trust-line">
          <template v-for="(part, i) in trustLine" :key="part">
            <span v-if="i > 0" class="px-1.5" aria-hidden="true">·</span>{{ part }}
          </template>
        </p>

        <div class="home-shot">
          <div class="home-shot__frame">
            <ScreenshotFrame
              src="/screenshots/hud.jpg"
              alt="MagguuUI dungeon HUD: unit frames, cast bars, and action bars."
              caption="HUD"
              description="Dungeon HUD: unit frames, cast bars and action bars."
              :width="2000"
              :height="1125"
              eager
            />
          </div>
        </div>
      </section>
    </div>

    <!-- Facts: what you need to know before you install. -->
    <section aria-label="At a glance" class="mg-container home-facts-wrap">
      <ul class="home-facts">
        <li><span class="home-facts__v">Free</span><span class="home-facts__l">Free to download</span></li>
        <li><span class="home-facts__v">4K</span><span class="home-facts__l">Designed for 4K</span></li>
        <li><span class="home-facts__v">1 click</span><span class="home-facts__l">Apply Magguu profiles in Setup</span></li>
        <li v-if="extraProfiles"><span class="home-facts__v">{{ extraProfiles }}</span><span class="home-facts__l">More addon profiles, set up when installed</span></li>
      </ul>
    </section>

    <section aria-label="How it works" class="mg-container home-section reveal">
      <p class="mg-kicker">How it works</p>
      <h2 class="home-h2 mt-2">Three steps. No installer.</h2>
      <ol class="home-steps" data-testid="home-hero-steps" aria-label="How to install">
        <li v-for="(step, index) in heroSteps" :key="index" class="home-step">
          <span class="home-step__n" aria-hidden="true">0{{ index + 1 }}</span>
          <SafeHtml class="home-hero-step" :html="step" />
        </li>
      </ol>
    </section>

    <section aria-label="Screenshots" class="mg-container home-section reveal">
      <p class="mg-kicker">Screenshots</p>
      <h2 class="home-h2 mt-2">In game</h2>
      <div class="home-bento">
        <div class="home-bento__item">
          <ScreenshotFrame
            src="/screenshots/edit-mode.jpg"
            sizes="(min-width: 1280px) 600px, (min-width: 640px) 50vw, 100vw"
            alt="Edit Mode with the Magguu frame layout."
            caption="Edit Mode"
            description="The Magguu frame layout in Blizzard Edit Mode."
            :width="2000"
            :height="1125"
          />
        </div>
        <div class="home-bento__item">
          <ScreenshotFrame
            src="/screenshots/setup.jpg"
            sizes="(min-width: 1280px) 600px, (min-width: 640px) 50vw, 100vw"
            alt="EllesmereUI MagguuUI Setup, with Apply Magguu profiles."
            caption="Setup"
            description="MagguuUI Setup inside EllesmereUI, with Apply Magguu profiles."
            :width="2000"
            :height="1125"
          />
        </div>
      </div>
    </section>

    <div class="home-tint">
      <section aria-label="Addons and latest release" class="mg-container home-section home-split reveal">
        <div>
          <p class="mg-kicker">Addons</p>
          <h2 class="home-h2 mt-2">{{ content?.addons?.title || 'Supported Addons' }}</h2>
          <p class="mt-2 mg-muted max-w-xl">{{ content?.addons?.subtitle || 'EllesmereUI is required. Everything else is optional.' }}</p>
          <ul v-if="addonRows.length" class="home-addons" data-testid="home-addon-list">
            <li v-for="item in addonRows" :key="item.key">
              <NuxtLink :to="item.href" class="home-addon group">
                <img v-if="item.icon" :src="item.icon" alt="" width="28" height="28" loading="lazy" decoding="async" class="w-7 h-7 rounded shrink-0" />
                <span v-else class="w-7 h-7 shrink-0 grid place-items-center text-base" aria-hidden="true">{{ item.emoji }}</span>
                <span class="min-w-0 flex-1">
                  <span class="flex items-center gap-2">
                    <span class="home-addon__name truncate">{{ item.name }}</span>
                    <span class="mg-kicker shrink-0 home-addon__tag">{{ item.subtitle }}</span>
                  </span>
                  <span v-if="item.line" class="block mg-small mg-muted truncate">{{ item.line }}</span>
                </span>
              </NuxtLink>
            </li>
          </ul>
          <p class="mt-5">
            <NuxtLink to="/addons" class="home-link">All addons and profiles</NuxtLink>
          </p>
        </div>

        <div v-if="latestCard" class="home-latest">
          <p class="mg-kicker">Latest</p>
          <NuxtLink to="/changelog" class="group block mt-3">
            <span class="home-latest__version">{{ latestCard.version }}</span>
            <span v-if="latestCard.date" class="block mt-1 mg-small mg-subtle">{{ latestCard.date }}</span>
          </NuxtLink>
          <ul class="mt-4 space-y-2 mg-small mg-muted">
            <li v-for="(bullet, index) in latestCard.bullets" :key="index">{{ bullet }}</li>
          </ul>
          <p class="mt-5"><NuxtLink to="/changelog" class="home-link">Full changelog</NuxtLink></p>
        </div>
      </section>
    </div>

    <section aria-label="Features" class="mg-container home-section reveal">
      <p class="mg-kicker">Module</p>
      <h2 class="home-h2 mt-2">{{ content?.features_heading?.title || 'The module' }}</h2>
      <p class="mt-2 mg-muted max-w-xl">{{ content?.features_heading?.subtitle || 'An EllesmereUI setup with optional raid tools' }}</p>
      <div class="home-features">
        <article v-for="(feat, index) in features" :key="index" class="feature-item home-feature">
          <p class="home-feature__n" aria-hidden="true">0{{ index + 1 }}</p>
          <h3 class="mg-h3 home-feature__title">{{ feat.title }}</h3>
          <SafeHtml class="home-feature-copy mt-3 mg-muted" :html="feat.text" />
          <div v-if="feat.commands.length" class="mt-5">
            <p class="mg-kicker mb-1.5">Commands</p>
            <div class="flex flex-wrap gap-x-3 gap-y-1">
              <CopyBadge v-for="cmd in feat.commands" :key="cmd" :command="cmd" />
            </div>
          </div>
          <div v-if="feat.addons.length" class="mt-5">
            <p class="mg-kicker mb-1.5">Optional profiles</p>
            <ul class="mg-small leading-7 mg-muted" aria-label="Optional Magguu profiles">
              <li v-for="(addon, aIndex) in feat.addons" :key="addon.name" class="inline">
                <span v-if="aIndex > 0" class="px-1.5 mg-subtle" aria-hidden="true">·</span><wbr><span class="whitespace-nowrap">{{ addon.name }}</span>
              </li>
            </ul>
          </div>
        </article>
      </div>
    </section>

    <section aria-labelledby="home-get" class="mg-container home-section home-section--last reveal" data-testid="home-closing-cta">
      <div class="home-band">
        <p class="mg-kicker">Free</p>
        <h2 id="home-get" class="home-band__title">Get MagguuUI</h2>
        <p class="mt-4 mg-lead max-w-xl mx-auto">
          Needs EllesmereUI 9.0.6 or newer. Install both, open <code class="font-mono">/mui</code> and run <strong>Apply Magguu profiles</strong>.
        </p>
        <div class="mt-8 flex flex-wrap items-center justify-center gap-x-5 gap-y-3">
          <DownloadButtons primary />
        </div>
        <p class="mt-6 flex flex-wrap justify-center gap-x-6 gap-y-2">
          <NuxtLink to="/guide" class="home-link">Installation guide</NuxtLink>
          <NuxtLink to="/strings" class="home-link">Import Strings</NuxtLink>
        </p>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { isPrivateRepoUrl } from '~/utils/privateRepoLinks'
import { buildPublicUrl } from '~/utils/publicSite'
import {
  addonGroupForSlug,
  addonGroupSubtitle,
  addonOneLiner,
  changelogPreviewBullets,
  emojiForAddonName,
  groupAddonChips,
  profileHrefForSlug,
} from '~/utils/addonChipMeta'
import { addonThumbPath, extractMuiCommands, splitFeatureAddons } from '~/utils/featureCardMeta'
import { ADDON_ICONS, addonIconForName } from '~/utils/addonIcons'
import { HOME_HERO_EXTRA_DEFAULTS, HOME_HERO_TITLE2_DEFAULT } from '~/utils/pageCopyDefaults'
import { patchFromChangelog } from '~/utils/downloadLinks'

const { isLoggedIn } = useAuth()
const siteSettings = usePublicSiteSettings()
const homeMetaTitle = computed(() => siteSettings.value.meta_title || 'MagguuUI — Ellesmere setup')
const homeMetaDescription = computed(() => siteSettings.value.meta_description || 'Native overhaul for EllesmereUI, designed for 4K. Download EllesmereUI and MagguuUI from CurseForge, Wago or WoWInterface, open /mui, and run Apply Magguu profiles.')
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
            ...(siteSettings.value.github_url && !isPrivateRepoUrl(siteSettings.value.github_url) ? { sameAs: [siteSettings.value.github_url] } : {}),
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
  ogImage: () => siteSettings.value.og_image_url || undefined,
  ogImageWidth: () => siteSettings.value.og_image_url ? 1200 : undefined,
  ogImageHeight: () => siteSettings.value.og_image_url ? 630 : undefined,
  ogImageType: () => siteSettings.value.og_image_url ? 'image/png' : undefined,
  twitterCard: 'summary_large_image',
  twitterTitle: () => homeMetaTitle.value,
  twitterDescription: () => homeMetaDescription.value,
  twitterImage: () => siteSettings.value.og_image_url || undefined,
})

if (!siteSettings.value.og_image_url) {
  defineOgImage('MagguuOg', { description: homeMetaDescription.value })
}

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
  description?: string | null
}

interface AddonsPayload {
  required: PublicAddonChip[]
  core: PublicAddonChip[]
  optional: PublicAddonChip[]
}

const { data: contentData } = useFetch<{ data: HomeContent }>('/api/v1/content/home')
const { data: addonsData } = useFetch<{ data: AddonsPayload }>('/api/v1/addons')

const content = computed(() => contentData.value?.data)
const heroEyebrow = computed(() => (content.value?.hero?.eyebrow as string | undefined)?.trim() || HOME_HERO_EXTRA_DEFAULTS.eyebrow)
const heroSteps = computed(() => ([1, 2, 3] as const).map((n) => {
  const key = `step_${n}` as const
  const stored = content.value?.hero?.[key]
  return typeof stored === 'string' && stored.trim() ? stored : HOME_HERO_EXTRA_DEFAULTS[key]
}))
const heroTitle2 = computed(() => {
  const raw = content.value?.hero?.title2
  if (typeof raw !== 'string') return HOME_HERO_TITLE2_DEFAULT
  return raw.trim()
})

function toChip(addon: PublicAddonChip) {
  const kind = addonGroupForSlug(addon.slug, addon.category)
  const subtitle = addonGroupSubtitle(kind)
  // Whisper Messenger is the whisper addon. WIM is retired.
  const badge = kind
  return {
    key: addon.slug,
    name: addon.name,
    href: profileHrefForSlug(addon.slug),
    kind,
    badge,
    subtitle,
    icon: addonThumbPath(ADDON_ICONS[addon.slug] ?? addonIconForName(addon.name)),
    emoji: addon.emoji || emojiForAddonName(addon.name),
    line: addonOneLiner(addon.description),
  }
}

const allAddonChips = computed(() => {
  const data = addonsData.value?.data
  if (!data) return []
  return [...(data.required ?? []), ...(data.core ?? []), ...(data.optional ?? [])].map(toChip)
})

/** One list in Required, Starter pack, Optional order; the badge on each row names the group. */
const addonRows = computed(() => groupAddonChips(allAddonChips.value).flatMap(g => g.items))
/** Addon profiles beyond the required EllesmereUI (starter pack + optional). */
const extraProfiles = computed(() => allAddonChips.value.filter(a => a.kind !== 'required').length)

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

/** Version, date and patch of the newest release: only what the changelog says. */
const trustLine = computed(() => {
  const entry = changelogListData.value?.data?.[0]
  if (!entry?.version) return []
  const parts = [`Latest ${entry.version}`]
  if (latestCard.value?.date) parts.push(latestCard.value.date)
  const patch = patchFromChangelog(entry.content)
  if (patch) parts.push(`Ready for ${patch}`)
  return parts
})

const featureCopy = computed(() => [
  {
    title: content.value?.features?.feature_1_title || 'Native Ellesmere setup',
    text: content.value?.features?.feature_1_text || 'Two sidebar rows: Options (Setup, Skinning, QoL) and Changelog. Gold <strong>Apply Magguu profiles</strong>, Magguu Settings, Load profiles, required and optional imports, and WowUp copy strings live on Setup. Open with <code>/mui</code>. Tools via <code>/mui tools</code> or 10 clicks on the MagguuUI header.',
  },
  {
    title: content.value?.features?.feature_2_title || 'Current Retail layouts',
    text: content.value?.features?.feature_2_text || 'Ellesmere profile <strong>MagguuUI</strong> at scale <strong>0.58</strong> with a fixed tooltip. Class layouts import as <strong>Magguu - Class Spec</strong>. Optional Magguu profiles for BigWigs, Northern Sky, EXBoss, Whisper Messenger, Waypoint UI, HandyNotes, Talent Tree Tweaks, GTFO, BugSack, Premade Groups Filter, and Smart Reminders.',
  },
  {
    title: content.value?.features?.feature_3_title || 'Skinning and QoL included',
    text: content.value?.features?.feature_3_text || '<ul><li><strong>Names &amp; colors</strong> — two-tone unit, party, and raid names (default + class color); class-colored keybind modifiers</li><li><strong>QoL</strong> — Death Release, Co-Tank, Stealth/Stance, Spell Alerts, party and raid item level (2P/4P)</li><li><strong>Smart Tab</strong>, <strong>Quick Focus</strong>, audio device switcher, <strong>Boiling Point</strong>, <strong>Targeted Spell Bars</strong></li><li>Services stay untouched</li></ul>',
  },
])

const features = computed(() => featureCopy.value.map((feat) => {
  const { html, addons } = splitFeatureAddons(feat.text)
  return {
    title: feat.title,
    text: html,
    commands: extractMuiCommands(feat.text),
    addons,
  }
}))

</script>

<style scoped>
/* Home (redesign PR 2). Reads the --mg-* tokens only: no isDark bindings, so no-JS and light after reload are right.
   Motion is CSS only, transform-only (no opacity fades: contrast checks must never sample a half-transparent heading),
   and every animation sits behind prefers-reduced-motion: no-preference. */
.home { overflow-x: clip; }
.home-section { padding-top: 5rem; }
@media (min-width: 768px) { .home-section { padding-top: 8rem; } }
.home-section--last { padding-bottom: 1rem; }

/* ── Hero ─────────────────────────────────── */
.home-hero-wrap { position: relative; isolation: isolate; }
/* Aurora: two big static gradient layers; the first drifts slowly (transform only, composited). */
.home-hero-wrap::before,
.home-hero-wrap::after { content: ''; position: absolute; z-index: -1; pointer-events: none; }
.home-hero-wrap::before {
  inset: -14rem -20% auto -20%;
  height: 52rem;
  background:
    radial-gradient(40rem 26rem at 30% 40%, var(--mg-glow), transparent 70%),
    radial-gradient(34rem 24rem at 72% 30%, var(--mg-glow-3), transparent 70%);
}
.home-hero-wrap::after {
  inset: 6rem -10% auto -10%;
  height: 40rem;
  background: radial-gradient(48rem 20rem at 50% 100%, var(--mg-glow-2), transparent 72%);
}
@media (prefers-reduced-motion: no-preference) {
  .home-hero-wrap::before { animation: home-drift 22s ease-in-out infinite alternate; will-change: transform; }
}
@keyframes home-drift { from { transform: translate3d(-3%, 0, 0) scale(1); } to { transform: translate3d(3%, 2rem, 0) scale(1.08); } }

.home-hero { padding-top: 3.5rem; text-align: center; display: flex; flex-direction: column; align-items: center; }
@media (min-width: 768px) { .home-hero { padding-top: 6rem; } }
.home-hero__eyebrow { text-transform: uppercase; letter-spacing: 0.14em; font-family: var(--font-mono); font-size: var(--mg-fs-micro); font-weight: 500; }
.home-hero__dot { width: 0.4rem; height: 0.4rem; border-radius: 999px; background: var(--mg-accent); box-shadow: 0 0 0 3px color-mix(in srgb, var(--mg-accent) 28%, transparent), 0 0 12px var(--mg-accent); }
.home-hero__title { margin-top: 1.5rem; color: var(--mg-fg); font-size: inherit; line-height: 1; letter-spacing: -0.05em; }
.home-hero__name {
  display: block;
  font-size: var(--mg-fs-hero);
  font-weight: 800;
  line-height: 0.98;
  letter-spacing: -0.055em;
  color: var(--mg-fg);
  /* Gradient fill: every stop must be an AA text colour on the page background; the stops are parsed and checked per
     theme in designTokens.test.ts, so a weaker stop fails there. */
  background-image: linear-gradient(100deg, var(--mg-fg) 0%, var(--mg-fg) 38%, var(--mg-accent-text) 100%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  padding-bottom: 0.06em;
}
.home-hero__sub {
  display: block;
  margin-top: 0.6rem;
  font-size: clamp(1.375rem, 0.9rem + 2.6vw, 2.5rem);
  line-height: 1.12;
  letter-spacing: -0.035em;
  font-weight: 700;
  color: var(--mg-fg-muted);
  text-wrap: balance;
}
.home-hero__lead { margin-top: 1.5rem; max-width: 40rem; }
.home-cta { margin-top: 2.25rem; display: flex; flex-wrap: wrap; justify-content: center; gap: 0.75rem; width: 100%; }
.home-cta > a { flex: 1 1 12rem; max-width: 16rem; }
.home-cta__main { box-shadow: var(--mg-cta-shadow), 0 0 48px -8px var(--mg-glow); }
.home-dl { margin-top: 1.75rem; display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: 0.5rem 1rem; }
.home-trust { margin-top: 1.25rem; font-family: var(--font-mono); font-size: var(--mg-fs-micro); letter-spacing: 0.12em; text-transform: uppercase; color: var(--mg-fg-muted); }

/* Entrance: the hero copy rises in sequence (transform only). */
@media (prefers-reduced-motion: no-preference) {
  .home-rise { animation: home-rise 0.7s var(--mg-ease) both; animation-delay: calc(var(--i, 0) * 70ms); }
}
@keyframes home-rise { from { transform: translateY(1.25rem); } to { transform: none; } }

/* The product shot: gradient edge, deep shadow, a bloom behind it; it starts tilted back and flattens as it scrolls in. */
.home-shot { position: relative; width: 100%; margin-top: 3rem; isolation: isolate; perspective: 1800px; text-align: left; }
@media (min-width: 768px) { .home-shot { margin-top: 4.5rem; } }
.home-shot::before { content: ''; position: absolute; z-index: -1; inset: -3rem -2rem -1rem; background: radial-gradient(62% 58% at 50% 48%, var(--mg-glow), transparent 74%); pointer-events: none; }
.home-shot__frame {
  padding: 1px;
  border-radius: calc(var(--mg-r-xl) + 1px);
  background: linear-gradient(155deg, var(--mg-accent-text), var(--mg-line-strong) 32%, var(--mg-line) 62%, var(--mg-glow-2));
  box-shadow: 0 40px 100px -30px rgb(0 0 0 / 0.6), 0 0 80px -20px var(--mg-glow);
  transform-origin: 50% 100%;
}
.home-shot :deep(.shot-img--hero) { box-shadow: none; border: 0; border-radius: var(--mg-r-xl); }
.home-shot :deep(figcaption) { padding: 0.75rem 1rem 0.875rem; background: var(--mg-surface); border-radius: 0 0 var(--mg-r-xl) var(--mg-r-xl); margin-top: 0; }
.home-shot :deep(.shot-img--hero) { border-bottom-left-radius: 0; border-bottom-right-radius: 0; }
@media (prefers-reduced-motion: no-preference) {
  @supports (animation-timeline: view()) {
    .home-shot__frame { animation: home-flatten linear both; animation-timeline: view(); animation-range: entry 0% cover 38%; }
  }
}
@keyframes home-flatten {
  from { transform: rotateX(11deg) scale(0.93) translateY(2rem); }
  to { transform: none; }
}

/* ── Facts strip ──────────────────────────── */
.home-facts-wrap { margin-top: 3.5rem; }
.home-facts { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); border-top: 1px solid var(--mg-line-strong); border-bottom: 1px solid var(--mg-line-strong); }
@media (min-width: 768px) { .home-facts { grid-template-columns: repeat(auto-fit, minmax(0, 1fr)); } }
.home-facts > li { padding: 1.5rem 0.25rem 1.5rem 1rem; border-left: 1px solid var(--mg-line); display: flex; flex-direction: column; gap: 0.35rem; }
.home-facts > li:nth-child(odd) { border-left: 0; padding-left: 0; }
@media (min-width: 768px) { .home-facts > li:nth-child(odd) { border-left: 1px solid var(--mg-line); padding-left: 1.5rem; } .home-facts > li:first-child { border-left: 0; padding-left: 0; } }
.home-facts__v { font-size: clamp(1.75rem, 1.2rem + 2vw, 2.75rem); font-weight: 800; letter-spacing: -0.04em; line-height: 1.05; color: var(--mg-accent-text); }
.home-facts__l { font-size: var(--mg-fs-small); color: var(--mg-fg-muted); line-height: 1.4; }

/* ── Steps ────────────────────────────────── */
.home-steps { margin-top: 2.5rem; display: grid; gap: 1.5rem; counter-reset: none; }
@media (min-width: 768px) { .home-steps { grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 2rem; margin-top: 3.5rem; } }
.home-step { position: relative; padding: 1.5rem 1.5rem 1.75rem; border: 1px solid var(--mg-line-strong); border-radius: var(--mg-r-xl); background: linear-gradient(180deg, var(--mg-surface-2), var(--mg-surface) 70%); font-size: var(--mg-fs-lead); line-height: 1.5; color: var(--mg-fg); overflow: hidden; }
.home-step::after { content: ''; position: absolute; inset: auto -20% -60% 30%; height: 12rem; background: radial-gradient(closest-side, var(--mg-glow-2), transparent); pointer-events: none; }
.home-step__n { display: block; margin-bottom: 1rem; font-size: clamp(3rem, 2rem + 4vw, 4.75rem); font-weight: 800; line-height: 0.9; letter-spacing: -0.06em; color: var(--mg-accent-text); }

/* ── In game bento ────────────────────────── */
.home-bento { margin-top: 2.5rem; display: grid; gap: 1.5rem; }
@media (min-width: 768px) { .home-bento { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 2rem; margin-top: 3.5rem; } }
.home-bento__item { position: relative; isolation: isolate; }
.home-bento__item::before { content: ''; position: absolute; z-index: -1; inset: -1.5rem; background: radial-gradient(60% 55% at 50% 50%, var(--mg-glow-2), transparent 72%); pointer-events: none; }
.home-bento__item:nth-child(2)::before { background: radial-gradient(60% 55% at 50% 50%, var(--mg-glow-3), transparent 72%); }
@media (min-width: 768px) { .home-bento__item:nth-child(2) { margin-top: 3.5rem; } }

/* ── Tinted band: addons + latest ─────────── */
.home-tint { margin-top: 5rem; padding-bottom: 5rem; background: linear-gradient(180deg, transparent, var(--mg-surface) 14rem, var(--mg-surface)); border-top: 1px solid var(--mg-line); }
@media (min-width: 768px) { .home-tint { margin-top: 8rem; padding-bottom: 6rem; } }
.home-tint .home-section { padding-top: 4rem; }
.home-split { display: grid; grid-template-columns: minmax(0, 1fr); gap: 3rem; align-items: start; }
.home-split > * { min-width: 0; }
@media (min-width: 1024px) { .home-split { grid-template-columns: minmax(0, 1.25fr) minmax(16rem, 0.75fr); gap: 4rem; } }
.home-addons { margin-top: 1.5rem; display: grid; grid-template-columns: minmax(0, 1fr); column-gap: 2rem; }
@media (min-width: 640px) { .home-addons { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
.home-addons > li { min-width: 0; border-bottom: 1px solid var(--mg-line); }
.home-addon { display: flex; align-items: center; gap: 0.75rem; min-height: 3.25rem; padding: 0.5rem 0; }
.home-addon__name { font-size: 0.9375rem; font-weight: 650; color: var(--mg-fg); }
.home-addon:hover .home-addon__name { text-decoration: underline; text-underline-offset: 0.2em; }
.home-addon__tag { font-size: 0.625rem; }
.home-latest { position: relative; overflow: hidden; padding: 1.75rem; border: 1px solid var(--mg-line-strong); border-radius: var(--mg-r-xl); background: var(--mg-surface-2); box-shadow: var(--mg-shadow); }
.home-latest::before { content: ''; position: absolute; inset: -40% -30% auto auto; width: 18rem; height: 14rem; background: radial-gradient(closest-side, var(--mg-glow), transparent); pointer-events: none; }
.home-latest > * { position: relative; }
.home-latest__version { font-family: var(--font-mono); font-size: clamp(2rem, 1.5rem + 1.6vw, 2.75rem); font-weight: 700; letter-spacing: -0.04em; color: var(--mg-fg); }
.group:hover .home-latest__version { color: var(--mg-accent-text); }
.home-link { font-size: 0.9375rem; font-weight: 650; color: var(--mg-accent-text); text-underline-offset: 0.25em; }
.home-link::after { content: ' \2192'; }
.home-link:hover { text-decoration: underline; }

/* ── Module: typographic columns, no boxes ── */
.home-features { margin-top: 2.5rem; display: grid; gap: 2.5rem; }
@media (min-width: 1024px) { .home-features { grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 3rem; margin-top: 3.5rem; } }
.home-feature { border-top: 2px solid var(--mg-line-strong); padding-top: 1.25rem; transition: border-color var(--mg-dur) var(--mg-ease); }
.home-feature:hover { border-top-color: var(--mg-accent); }
.home-feature__n { font-size: 2.25rem; font-weight: 800; letter-spacing: -0.05em; line-height: 1; color: var(--mg-accent-text); }
.home-feature__title { margin-top: 0.75rem; color: var(--mg-fg); }

/* ── Closing band ─────────────────────────── */
.home-band { position: relative; isolation: isolate; overflow: hidden; padding: 3rem 1.5rem; text-align: center; border: 1px solid var(--mg-line-strong); border-radius: calc(var(--mg-r-xl) * 1.4); background: var(--mg-surface); }
@media (min-width: 768px) { .home-band { padding: 5.5rem 3rem; } }
.home-band::before { content: ''; position: absolute; z-index: -1; inset: 0; background: radial-gradient(40rem 20rem at 15% 0, var(--mg-glow), transparent 70%), radial-gradient(40rem 22rem at 90% 100%, var(--mg-glow-3), transparent 70%), radial-gradient(30rem 16rem at 60% 110%, var(--mg-glow-2), transparent 70%); pointer-events: none; }
.home-band__title { margin-top: 0.75rem; font-size: clamp(2.5rem, 1.4rem + 5.2vw, 4.75rem); font-weight: 800; line-height: 1; letter-spacing: -0.05em; color: var(--mg-fg); }

/* ── Rich text from the CMS ───────────────── */
.home-hero-copy :deep(p),
.home-feature-copy :deep(p) { margin: 0; }
.home-hero-copy :deep(p + p),
.home-feature-copy :deep(p + p) { margin-top: 0.6em; }
.home-hero-copy :deep(strong),
.home-feature-copy :deep(strong) { color: var(--mg-fg); font-weight: 700; }
.home-hero-copy :deep(em),
.home-feature-copy :deep(em) { color: inherit; }
.home-hero-copy :deep(code),
.home-feature-copy :deep(code) {
  padding: 0.1em 0.4em;
  border-radius: 4px;
  font-size: 0.9em;
  font-family: var(--font-mono);
  color: var(--mg-fg);
  background: var(--mg-surface-3);
}
.home-hero-copy :deep(a),
.home-feature-copy :deep(a) { color: var(--mg-accent-text); text-decoration: underline; text-underline-offset: 0.18em; }
.home-hero-copy :deep(ul),
.home-hero-copy :deep(ol) { margin: 0.6em 0 0; padding-left: 1.25em; text-align: left; }
.home-hero-copy :deep(li) { margin-top: 0.2em; }

/* Module columns: flush with the heading, identical rhythm in all three. */
.home-feature-copy :deep(ul),
.home-feature-copy :deep(ol) { margin: 0.4em 0 0; padding-left: 0; list-style: none; }
.home-feature-copy :deep(:is(ul, ol):first-child) { margin-top: 0; }
.home-feature-copy :deep(li + li),
.home-feature-copy :deep(p + p) { margin-top: 0.4em; }

/* Editable install steps. */
.home-hero-step :deep(code) { font-family: var(--font-mono); font-size: 0.9em; color: var(--mg-fg); background: var(--mg-surface-3); padding: 0.1em 0.4em; border-radius: 4px; }
.home-hero-step :deep(strong) { font-weight: 700; color: var(--mg-fg); }
.home-hero-step :deep(p) { display: inline; }
</style>

<!--
  About Page - Project information
-->

<template>
  <div class="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
    <div class="text-center mb-12 fade-in heading-glow">
      <h1 class="text-4xl sm:text-5xl font-bold mb-4 flex items-center justify-center gap-3">
        <svg aria-hidden="true" class="w-8 h-8 text-brand-400 flex-shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
        </svg>
        <span class="text-gradient">About</span>
      </h1>
      <p class="text-lg" :class="isDark ? 'text-silver-500' : 'text-gray-500'">
        The project behind MagguuUI
      </p>
    </div>

    <div class="space-y-4">
      <div :ref="el => observe(el as HTMLElement)" class="glass-card rounded-2xl p-6 sm:p-8">
        <h2 class="text-lg font-semibold mb-3 flex items-center gap-2.5">
          <svg aria-hidden="true" class="w-5 h-5 text-brand-400 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
            <path d="M13 2L4.09 12.11A1 1 0 005 14h6v6a1 1 0 001.91.59l8.91-10.11A1 1 0 0021 8.89h-6V3a1 1 0 00-1.91-.59L13 2z" />
          </svg>
          <span class="text-gradient-subtle">What is MagguuUI?</span>
        </h2>
        <p class="text-sm leading-relaxed mb-3" :class="isDark ? 'text-silver-400' : 'text-gray-600'">
          MagguuUI is a standalone in-game installer and UI toolkit for World of Warcraft Retail.
          It can apply Blizzard layouts and hand-tuned profiles for the supported addons you choose,
          giving you a ready-to-play setup in a few clicks — without editing files or pasting import strings by hand.
        </p>
        <p class="text-sm leading-relaxed" :class="isDark ? 'text-silver-400' : 'text-gray-600'">
          The only required pieces are the two included addon folders:
          <strong :class="isDark ? 'text-white' : 'text-gray-900'">MagguuUI</strong> and
          <strong :class="isDark ? 'text-white' : 'text-gray-900'">MagguuUI_Data</strong>.
          No external addon is required. ElvUI, Plater, Platynator, BigWigs and every other integration are optional;
          MagguuUI configures the ones you have installed and safely skips the rest.
        </p>
      </div>

      <div :ref="el => observe(el as HTMLElement)" class="glass-card rounded-2xl p-6 sm:p-8">
        <h2 class="text-lg font-semibold mb-3 flex items-center gap-2.5">
          <svg aria-hidden="true" class="w-5 h-5 text-brand-400 flex-shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" />
          </svg>
          <span class="text-gradient-subtle">What it does</span>
        </h2>
        <ul class="space-y-2.5 text-sm leading-relaxed" :class="isDark ? 'text-silver-400' : 'text-gray-600'">
          <li class="flex items-start gap-2">
            <span class="inline-block w-1.5 h-1.5 rounded-full bg-brand-400 mt-1.5 flex-shrink-0" />
            <span><strong :class="isDark ? 'text-white' : 'text-gray-900'">One-click Install All</strong> — applies the included layouts and profiles for the supported addons you actually have installed.</span>
          </li>
          <li class="flex items-start gap-2">
            <span class="inline-block w-1.5 h-1.5 rounded-full bg-brand-400 mt-1.5 flex-shrink-0" />
            <span><strong :class="isDark ? 'text-white' : 'text-gray-900'">Class &amp; spec layouts</strong> — built-in Blizzard Edit Mode layouts and optional cooldown layouts for every class and specialization.</span>
          </li>
          <li class="flex items-start gap-2">
            <span class="inline-block w-1.5 h-1.5 rounded-full bg-brand-400 mt-1.5 flex-shrink-0" />
            <span><strong :class="isDark ? 'text-white' : 'text-gray-900'">Update notifications</strong> — chat hint or popup whenever a new version is released, configurable in <code>/mui settings</code>.</span>
          </li>
          <li class="flex items-start gap-2">
            <span class="inline-block w-1.5 h-1.5 rounded-full bg-brand-400 mt-1.5 flex-shrink-0" />
            <span><strong :class="isDark ? 'text-white' : 'text-gray-900'">Keystone List</strong> — a compact Mythic+ overview with dungeon teleports, a configurable group-join banner and useful key details.</span>
          </li>
          <li class="flex items-start gap-2">
            <span class="inline-block w-1.5 h-1.5 rounded-full bg-brand-400 mt-1.5 flex-shrink-0" />
            <span><strong :class="isDark ? 'text-white' : 'text-gray-900'">Optional ElvUI tools</strong> — import the MagguuUI profile, color action-bar keybinds by class and use the custom item-level tags when ElvUI 15.12+ is installed.</span>
          </li>
          <li class="flex items-start gap-2">
            <span class="inline-block w-1.5 h-1.5 rounded-full bg-brand-400 mt-1.5 flex-shrink-0" />
            <span><strong :class="isDark ? 'text-white' : 'text-gray-900'">Quality-of-life tools</strong> — quick Great Vault access, minimap and AddonCompartment controls, a draggable audio output switcher and an in-game changelog.</span>
          </li>
          <li class="flex items-start gap-2">
            <span class="inline-block w-1.5 h-1.5 rounded-full bg-brand-400 mt-1.5 flex-shrink-0" />
            <span><strong :class="isDark ? 'text-white' : 'text-gray-900'">Automatic loot rolls</strong> — opt-in per category (Toys, Mounts, Recipes, Housing, Transmog) with combat-safe queue and loot-council conflict warning.</span>
          </li>
          <li class="flex items-start gap-2">
            <span class="inline-block w-1.5 h-1.5 rounded-full bg-brand-400 mt-1.5 flex-shrink-0" />
            <span><strong :class="isDark ? 'text-white' : 'text-gray-900'">Custom gear tags</strong> — optional ElvUI tags show item level and tier bonus, with adjustable color thresholds in <em>Settings → Tags → Gear</em>.</span>
          </li>
          <li class="flex items-start gap-2">
            <span class="inline-block w-1.5 h-1.5 rounded-full bg-brand-400 mt-1.5 flex-shrink-0" />
            <span><strong :class="isDark ? 'text-white' : 'text-gray-900'">Alts in seconds</strong> — after one main setup, alts get a short Load Profiles popup instead of the full installer.</span>
          </li>
          <li class="flex items-start gap-2">
            <span class="inline-block w-1.5 h-1.5 rounded-full bg-brand-400 mt-1.5 flex-shrink-0" />
            <span><strong :class="isDark ? 'text-white' : 'text-gray-900'">11 languages out of the box</strong> — enUS / enGB, deDE, frFR, esES, esMX, ruRU, ptBR, itIT, koKR, zhCN, zhTW. Picks up your client locale automatically.</span>
          </li>
        </ul>
      </div>

      <div :ref="el => observe(el as HTMLElement)" class="glass-card rounded-2xl p-6 sm:p-8">
        <h2 class="text-lg font-semibold mb-3 flex items-center gap-2.5">
          <svg aria-hidden="true" class="w-5 h-5 text-brand-400 flex-shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span class="text-gradient-subtle">What this website is for</span>
        </h2>
        <p class="text-sm leading-relaxed" :class="isDark ? 'text-silver-400' : 'text-gray-600'">
          The website is a backup for everything the in-game addon already gives you. If you ever need to
          re-install a single profile by hand, copy a class layout for a friend, or just see what is
          currently shipped, you can browse and copy the raw import strings here on the
          <NuxtLink to="/strings" class="text-brand-400 hover:underline">Strings</NuxtLink> page —
          and read the <NuxtLink to="/changelog" class="text-brand-400 hover:underline">Changelog</NuxtLink>
          to see what changed in each release. For most users the in-game installer is all you need.
        </p>
      </div>

      <div :ref="el => observe(el as HTMLElement)" class="glass-card rounded-2xl p-6 sm:p-8">
        <h2 class="text-lg font-semibold mb-3 flex items-center gap-2.5">
          <svg aria-hidden="true" class="w-5 h-5 text-brand-400 flex-shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
          </svg>
          <span class="text-gradient-subtle">Contact</span>
        </h2>
        <p class="text-sm leading-relaxed" :class="isDark ? 'text-silver-400' : 'text-gray-600'">
          Questions, feedback or bug reports? Send an email to
          <a :href="`mailto:${contactEmail}`" class="text-brand-400 hover:underline">{{ contactEmail }}</a>
          or create a
          <a :href="githubIssuesUrl" target="_blank" rel="noopener noreferrer" class="text-brand-400 hover:underline">GitHub Issue</a>.
        </p>
      </div>

      <div :ref="el => observe(el as HTMLElement)" class="glass-card rounded-2xl p-6 sm:p-8">
        <h2 class="text-lg font-semibold mb-3 flex items-center gap-2.5">
          <svg aria-hidden="true" class="w-5 h-5 text-brand-400 flex-shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 3v17.25m0 0c-1.472 0-2.882.265-4.185.75M12 20.25c1.472 0 2.882.265 4.185.75M18.75 4.97A48.416 48.416 0 0012 4.5c-2.291 0-4.545.16-6.75.47m13.5 0c1.01.143 2.01.317 3 .52m-3-.52l2.62 10.726c.122.499-.106 1.028-.589 1.202a5.988 5.988 0 01-2.031.352 5.988 5.988 0 01-2.031-.352c-.483-.174-.711-.703-.59-1.202L18.75 4.971zm-16.5.52c.99-.203 1.99-.377 3-.52m0 0l2.62 10.726c.122.499-.106 1.028-.589 1.202a5.989 5.989 0 01-2.031.352 5.989 5.989 0 01-2.031-.352c-.483-.174-.711-.703-.59-1.202L5.25 4.971z" />
          </svg>
          <span class="text-gradient-subtle">Legal</span>
        </h2>
        <p class="text-sm leading-relaxed" :class="isDark ? 'text-silver-400' : 'text-gray-600'">
          World of Warcraft and all related trademarks are registered trademarks of
          Blizzard Entertainment, Inc. MagguuUI is not officially affiliated with
          Blizzard Entertainment.
        </p>
      </div>
    </div>

    <div class="text-center mt-12 pt-6 border-t fade-in"
      :class="isDark ? 'border-brand-400/10' : 'border-gray-200'">
      <p class="text-sm" :class="isDark ? 'text-silver-500' : 'text-gray-500'">
        Ready to get started? Read the
        <NuxtLink to="/guide" class="text-brand-400 hover:underline">Installation Guide</NuxtLink>
        or browse the optional <NuxtLink to="/strings" class="text-brand-400 hover:underline">Import Strings</NuxtLink>.
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
const isDark = useIsDark()
const { observe } = useScrollReveal()
const siteSettings = usePublicPageSeo({
  title: 'About',
  description: 'Learn about MagguuUI, the standalone WoW Retail installer with optional addon integrations and built-in UI tools.',
  path: '/about',
})

const contactEmail = computed(() => siteSettings.value.contact_email || 'contact@magguui.com')
const githubUrl = computed(() => siteSettings.value.github_url || 'https://github.com/Derpsen/MagguuUI')
const githubIssuesUrl = computed(() => githubUrl.value.endsWith('/issues') ? githubUrl.value : `${githubUrl.value.replace(/\/$/, '')}/issues`)
</script>

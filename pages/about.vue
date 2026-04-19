<!--
  About Page - Project information
-->

<template>
  <div class="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
    <div class="text-center mb-12 fade-in heading-glow">
      <h1 class="hero-serif text-4xl sm:text-5xl font-medium tracking-tight mb-4 flex items-center justify-center gap-3">
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
          MagguuUI is an in-game World of Warcraft addon that sets up your entire user interface for you.
          Once installed, it configures ElvUI, Plater, BigWigs, Details and more with hand-tuned profiles
          so you have a complete, ready-to-play UI in a few clicks — no editing config files, no copy-pasting
          import strings, no spending an evening tweaking unitframes.
        </p>
        <p class="text-sm leading-relaxed" :class="isDark ? 'text-silver-400' : 'text-gray-600'">
          MagguuUI does not replace any of those addons. It only configures the ones you have installed
          and skips the rest. The only hard requirement is <strong :class="isDark ? 'text-white' : 'text-gray-900'">ElvUI 15.00 or higher</strong> —
          everything else is optional.
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
            <span><strong :class="isDark ? 'text-white' : 'text-gray-900'">One-click Install All</strong> — applies a curated profile to every supported addon you have installed.</span>
          </li>
          <li class="flex items-start gap-2">
            <span class="inline-block w-1.5 h-1.5 rounded-full bg-brand-400 mt-1.5 flex-shrink-0" />
            <span><strong :class="isDark ? 'text-white' : 'text-gray-900'">Class &amp; spec layouts</strong> — pre-built cooldown layouts for every class and spec, re-applied automatically when you respec.</span>
          </li>
          <li class="flex items-start gap-2">
            <span class="inline-block w-1.5 h-1.5 rounded-full bg-brand-400 mt-1.5 flex-shrink-0" />
            <span><strong :class="isDark ? 'text-white' : 'text-gray-900'">Update notifications</strong> — chat hint or popup whenever a new version is released, configurable in <code>/mui settings</code>.</span>
          </li>
          <li class="flex items-start gap-2">
            <span class="inline-block w-1.5 h-1.5 rounded-full bg-brand-400 mt-1.5 flex-shrink-0" />
            <span><strong :class="isDark ? 'text-white' : 'text-gray-900'">Quality-of-life tools</strong> — minimap button, audio output switcher (<code>/mui audio</code>), in-game changelog viewer.</span>
          </li>
          <li class="flex items-start gap-2">
            <span class="inline-block w-1.5 h-1.5 rounded-full bg-brand-400 mt-1.5 flex-shrink-0" />
            <span><strong :class="isDark ? 'text-white' : 'text-gray-900'">Alts in seconds</strong> — after one main setup, alts get a short Load Profiles popup instead of the full installer.</span>
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
        Ready to get started? Check out the
        <NuxtLink to="/strings" class="text-brand-400 hover:underline">Import Strings</NuxtLink>
        or read the <NuxtLink to="/guide" class="text-brand-400 hover:underline">Installation Guide</NuxtLink>.
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
const isDark = useIsDark()
const { observe } = useScrollReveal()
const siteSettings = await usePublicPageSeo({
  title: 'About',
  description: 'Learn more about MagguuUI - the WoW UI configuration tool.',
  path: '/about',
})

const contactEmail = computed(() => siteSettings.value.contact_email || 'contact@magguui.com')
const githubUrl = computed(() => siteSettings.value.github_url || 'https://github.com/Derpsen/MagguuUI')
const githubIssuesUrl = computed(() => githubUrl.value.endsWith('/issues') ? githubUrl.value : `${githubUrl.value.replace(/\/$/, '')}/issues`)
</script>

<!--
  About Page - Project information
-->

<template>
  <article class="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-20">
    <p class="font-mono text-[11px] uppercase tracking-[0.16em] mb-3" :class="isDark ? 'text-brand-300' : 'text-brand-700'">Project</p>
    <h1 class="text-4xl font-semibold tracking-tight" :class="isDark ? 'text-white' : 'text-gray-950'">About</h1>

    <section class="mt-8">
      <h2 class="text-base font-semibold" :class="isDark ? 'text-white' : 'text-gray-950'">What is MagguuUI?</h2>
      <p class="mt-3 text-sm leading-relaxed" :class="isDark ? 'text-silver-400' : 'text-gray-600'">
        MagguuUI is a native overhaul for
        <strong :class="isDark ? 'text-white' : 'text-gray-900'">EllesmereUI</strong>
        on World of Warcraft Retail. Designed for 4K. It has no standalone installer and no separate options window.
        Everything lives in EllesmereUI under MagguuUI → Options.
      </p>
      <p class="mt-3 text-sm leading-relaxed" :class="isDark ? 'text-silver-400' : 'text-gray-600'">
        Download
        <strong :class="isDark ? 'text-white' : 'text-gray-900'">EllesmereUI 9.0.6+</strong>
        and MagguuUI from CurseForge, Wago, or WoWInterface, and leave them enabled.
        BigWigs, Northern Sky, EXBoss, WIM, Whisper Messenger, Waypoint UI, HandyNotes, Talent Tree Tweaks, GTFO, BugSack, Premade Groups Filter, and Smart Reminders are optional.
        MagguuUI sets them up when they are installed and skips them otherwise.
      </p>
    </section>

    <section class="mt-10 border-t pt-8" :class="isDark ? 'border-white/10' : 'border-gray-200'">
      <h2 class="text-base font-semibold" :class="isDark ? 'text-white' : 'text-gray-950'">What it does</h2>
      <dl class="mt-4 space-y-4 text-sm leading-relaxed" :class="isDark ? 'text-silver-400' : 'text-gray-600'">
        <div>
          <dt class="font-semibold" :class="isDark ? 'text-white' : 'text-gray-950'">Native Ellesmere module</dt>
          <dd class="mt-1">Two sidebar rows: Options (Setup, Skinning, QoL) and Changelog. Open it with <code>/mui</code>.</dd>
        </div>
        <div>
          <dt class="font-semibold" :class="isDark ? 'text-white' : 'text-gray-950'">Apply Magguu profiles</dt>
          <dd class="mt-1">Magguu Ellesmere profile at UI scale 0.58 plus Magguu Settings and companions. Magguu Settings is overlay/QoL only. Load profiles activates Magguu profiles, including optional companions. Ellesmere start popup is skipped. MagguuUI Setup opens on that login.</dd>
        </div>
        <div>
          <dt class="font-semibold" :class="isDark ? 'text-white' : 'text-gray-950'">Class layouts</dt>
          <dd class="mt-1">Imported as <code>Magguu - Class Spec</code>. After a successful Cooldown Viewer import MagguuUI asks you to reload. Import buttons: green = Magguu profile loaded on this character, orange = installed but not loaded here, red = missing.</dd>
        </div>
        <div>
          <dt class="font-semibold" :class="isDark ? 'text-white' : 'text-gray-950'">WowUp copy popups</dt>
          <dd class="mt-1">Starter pack (EllesmereUI, MagguuUI, BigWigs, LittleWigs, Northern Sky, EXBoss, EXCore) and optional extras (including Premade Groups Filter, Auctionator, Smart Reminders, and HandyNotes MapNotes) copy from Setup. Paste in WowUp. Buttons turn green when the pack addons are present. Apply Magguu profiles writes the HUD Edit Mode layout MagguuUI once.</dd>
        </div>
        <div>
          <dt class="font-semibold" :class="isDark ? 'text-white' : 'text-gray-950'">Skinning</dt>
          <dd class="mt-1">One NAMES & COLORS section (two columns): split unit-frame and party/raid names plus class-colored keybind modifiers.</dd>
        </div>
        <div>
          <dt class="font-semibold" :class="isDark ? 'text-white' : 'text-gray-950'">Quality of life</dt>
          <dd class="mt-1">Death-release protection, co-tank frame and debuffs, stealth and stance reminders, spell-alert opacity, per-spec proc-overlay hiding, party and raid item level (and 2P/4P), Smart Tab, Quick Focus, the audio device switcher, Boiling Point, and Targeted Spell Bars. Services stay untouched.</dd>
        </div>
        <div>
          <dt class="font-semibold" :class="isDark ? 'text-white' : 'text-gray-950'">Hidden Tools</dt>
          <dd class="mt-1">Profile exports and Discord boost via <code>/mui tools</code>. Click the MagguuUI header ten times to unlock the sidebar row.</dd>
        </div>
      </dl>
    </section>

    <section class="mt-10 border-t pt-8" :class="isDark ? 'border-white/10' : 'border-gray-200'">
      <h2 class="text-base font-semibold" :class="isDark ? 'text-white' : 'text-gray-950'">What this website is for</h2>
      <p class="mt-3 text-sm leading-relaxed" :class="isDark ? 'text-silver-400' : 'text-gray-600'">
        The website is a backup for the profiles MagguuUI already ships in-game. Use
        <NuxtLink to="/strings" class="underline underline-offset-4" :class="isDark ? 'text-white' : 'text-gray-950'">Strings</NuxtLink>
        to copy a class layout or to see the current set, and the
        <NuxtLink to="/changelog" class="underline underline-offset-4" :class="isDark ? 'text-white' : 'text-gray-950'">Changelog</NuxtLink>
        for each release. For most people, <code>/mui</code> and Apply Magguu profiles are enough.
      </p>
    </section>

    <section class="mt-10 border-t pt-8" :class="isDark ? 'border-white/10' : 'border-gray-200'">
      <h2 class="text-base font-semibold" :class="isDark ? 'text-white' : 'text-gray-950'">Contact</h2>
      <!--email_off-->
      <p class="mt-3 text-sm leading-relaxed" :class="isDark ? 'text-silver-400' : 'text-gray-600'">
        Questions, feedback or bug reports: email
        <a :href="`mailto:${contactEmail}`" class="underline underline-offset-4" :class="isDark ? 'text-white' : 'text-gray-950'">{{ contactEmail }}</a>
        or open a
        <a :href="githubIssuesUrl" target="_blank" rel="noopener noreferrer" class="underline underline-offset-4" :class="isDark ? 'text-white' : 'text-gray-950'">GitHub issue</a>.
      </p>
      <!--/email_off-->
    </section>

    <section class="mt-10 border-t pt-8" :class="isDark ? 'border-white/10' : 'border-gray-200'">
      <h2 class="text-base font-semibold" :class="isDark ? 'text-white' : 'text-gray-950'">Legal</h2>
      <p class="mt-3 text-sm leading-relaxed" :class="isDark ? 'text-silver-400' : 'text-gray-600'">
        World of Warcraft and all related trademarks are registered trademarks of
        Blizzard Entertainment, Inc. MagguuUI is not officially affiliated with
        Blizzard Entertainment.
      </p>
    </section>
  </article>
</template>

<script setup lang="ts">
const isDark = useIsDark()
const siteSettings = usePublicPageSeo({
  title: 'About',
  description: 'MagguuUI is a native overhaul for EllesmereUI. Designed for 4K.',
  path: '/about',
})

const contactEmail = computed(() => siteSettings.value.contact_email || 'contact@magguu.xyz')
const githubUrl = computed(() => siteSettings.value.github_url || 'https://github.com/Derpsen/MagguuUI')
const githubIssuesUrl = computed(() => githubUrl.value.endsWith('/issues') ? githubUrl.value : `${githubUrl.value.replace(/\/$/, '')}/issues`)

</script>

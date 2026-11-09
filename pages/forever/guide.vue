<template>
  <article class="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-20" data-testid="forever-guide-page">
    <p class="font-mono text-[11px] uppercase tracking-[0.16em] mb-3" :class="label">WoW Forever</p>
    <h1 class="text-4xl font-semibold tracking-tight" :class="strong">Guide</h1>
    <p class="mt-3 text-sm leading-relaxed" :class="muted">
      Forever uses the same MagguuUI package as Retail (Camelot flavor). Retail-only addons such as EXBoss, Smart Reminders and Premade Groups Filter are not part of Forever.
    </p>

    <ol class="mt-10 space-y-8 text-sm leading-relaxed" :class="muted">
      <li>
        <h2 class="font-mono text-[11px] uppercase tracking-[0.16em] mb-2" :class="label">1. Install</h2>
        <p :class="strong">Install EllesmereUI and MagguuUI into your WoW Forever AddOns folder (the same four MagguuUI folders as Retail). Leave both enabled.</p>
      </li>
      <li>
        <h2 class="font-mono text-[11px] uppercase tracking-[0.16em] mb-2" :class="label">2. Open Setup</h2>
        <p :class="strong">In Forever, open MagguuUI with <code>/mui</code> or <code>/muif</code>, then run <strong>Apply Magguu profiles</strong>. Use <strong>Include Magguu Settings</strong> / <strong>Apply Magguu Settings</strong> for the Magguu look overlay without re-importing profiles.</p>
      </li>
      <li>
        <h2 class="font-mono text-[11px] uppercase tracking-[0.16em] mb-2" :class="label">3. Magguu Settings on Forever</h2>
        <p :class="strong" data-testid="forever-guide-qol">
          Forever loads the shared Magguu companion settings with Retail: Smart Tab, class-colored keybind modifiers, the Boost tab, BigWigs bar styles, and HandyNotes MapNotes (imported with HandyNotes when that addon is installed). Mythic+ timer extras, Boiling Point and similar Retail-only modules stay on Retail.
        </p>
      </li>
      <li>
        <h2 class="font-mono text-[11px] uppercase tracking-[0.16em] mb-2" :class="label">4. Optional addons</h2>
        <p :class="strong">Copy the Forever WowUp Starter and Optional packs from
          <NuxtLink to="/forever/strings" class="underline underline-offset-2" :class="link">Strings</NuxtLink>
          and paste them in WowUp with your Forever installation selected (WowUp 2.24.1 or newer). HandyNotes MapNotes is not in the Forever Optional pack yet; install it yourself if you want it.
        </p>
      </li>
      <li>
        <h2 class="font-mono text-[11px] uppercase tracking-[0.16em] mb-2" :class="label">5. Keep clients separate</h2>
        <p :class="strong">Forever profiles and SavedVariables stay separate from Retail. Do not paste Retail Magguu export strings into Forever, or Forever strings into Retail.</p>
      </li>
    </ol>

    <p class="mt-10 text-sm" :class="muted">
      Need the Retail walkthrough?
      <NuxtLink to="/guide" class="underline underline-offset-2" :class="link">Retail guide</NuxtLink>
    </p>
  </article>
</template>

<script setup lang="ts">
const isDark = useIsDark()

usePublicPageSeo({
  title: 'MagguuUI Forever guide',
  description: 'Install MagguuUI on World of Warcraft: Forever. Same package as Retail; Smart Tab, keybinds, Boost, BigWigs styles and MapNotes included.',
  path: '/forever/guide',
})

const label = computed(() => isDark.value ? 'text-brand-300' : 'text-brand-700')
const link = computed(() => isDark.value ? 'text-brand-300 hover:text-white' : 'text-brand-700 hover:text-brand-900')
const muted = computed(() => isDark.value ? 'text-silver-400' : 'text-gray-600')
const strong = computed(() => isDark.value ? 'text-white' : 'text-gray-950')
</script>

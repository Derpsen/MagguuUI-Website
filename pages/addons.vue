<!--
  Addons Page — Required and optional addons for MagguuUI
-->

<template>
  <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
    <div class="text-center mb-12 fade-in heading-glow">
      <h1 class="text-4xl sm:text-5xl font-bold mb-4 flex items-center justify-center gap-3">
        <svg class="w-8 h-8 text-brand-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M14.25 6.087c0-.355.186-.676.401-.959.221-.29.349-.634.349-1.003 0-1.036-1.007-1.875-2.25-1.875s-2.25.84-2.25 1.875c0 .369.128.713.349 1.003.215.283.401.604.401.959v0a.64.64 0 01-.657.643 48.491 48.491 0 01-4.163-.3c.186 1.613.79 3.08 1.742 4.295a48.224 48.224 0 013.127.297.643.643 0 01.657.643v0c0 .355-.186.676-.401.959a2.002 2.002 0 00-.349 1.003c0 1.035 1.007 1.875 2.25 1.875s2.25-.84 2.25-1.875c0-.369-.128-.713-.349-1.003a1.733 1.733 0 01-.401-.959v0c0-.374.312-.67.657-.643a48.497 48.497 0 014.163.3c-.186-1.613-.79-3.08-1.742-4.295a48.211 48.211 0 01-3.127-.297.643.643 0 01-.657-.643v0z" />
        </svg>
        <span class="text-gradient">Addons</span>
      </h1>
      <p class="text-lg" :class="isDark ? 'text-silver-500' : 'text-gray-500'">
        All addons that MagguuUI configures &mdash; install what you need, skip what you don't.
      </p>
    </div>

    <div class="glass-card rounded-2xl p-5 sm:p-6 mb-10 fade-in fade-in-delay-1">
      <div class="flex items-start gap-3">
        <span class="inline-flex items-center justify-center w-9 h-9 rounded-xl flex-shrink-0"
          :class="isDark ? 'bg-brand-400/12 text-brand-300' : 'bg-blue-50 text-blue-700'">
          <svg class="w-4.5 h-4.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
          </svg>
        </span>
        <div class="text-sm leading-relaxed" :class="isDark ? 'text-silver-400' : 'text-gray-600'">
          <p>
            <strong :class="isDark ? 'text-white' : 'text-gray-900'">Only ElvUI is required.</strong>
            Every other addon is optional &mdash; MagguuUI detects what you have installed, configures the addons it finds, and silently skips the rest.
          </p>
          <p class="mt-2">
            You can install addons one by one, or use the
            <NuxtLink to="/strings?tab=wowup" class="text-brand-400 hover:underline">WowUp import strings</NuxtLink>
            to bulk-install the full Required or Optional set in one go.
          </p>
        </div>
      </div>
    </div>

    <!-- Required Section -->
    <section class="mb-12 fade-in fade-in-delay-2">
      <div class="flex items-center gap-2 mb-5">
        <span class="inline-flex items-center justify-center w-7 h-7 rounded-lg"
          :class="isDark ? 'bg-red-500/12 text-red-400' : 'bg-red-50 text-red-600'">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
        </span>
        <h2 class="text-xl font-bold" :class="isDark ? 'text-white' : 'text-gray-900'">Required</h2>
        <span class="ml-auto text-xs font-medium px-2.5 py-1 rounded-full"
          :class="isDark ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-red-50 text-red-600 border border-red-200'">
          {{ requiredAddons.length }} addon
        </span>
      </div>
      <div class="space-y-3">
        <div v-for="addon in requiredAddons" :key="addon.name"
          class="glass-card rounded-xl p-5 flex items-start gap-4 transition-all hover:scale-[1.01]"
          :class="isDark ? 'hover:border-brand-400/20' : 'hover:border-blue-200'">
          <span class="inline-flex items-center justify-center w-11 h-11 rounded-xl flex-shrink-0 text-lg"
            :class="isDark ? 'bg-brand-400/10 text-brand-300' : 'bg-blue-50 text-blue-600'">
            {{ addon.emoji }}
          </span>
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 mb-1">
              <h3 class="font-semibold" :class="isDark ? 'text-white' : 'text-gray-900'">{{ addon.name }}</h3>
              <span class="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full"
                :class="isDark ? 'bg-red-500/10 text-red-400' : 'bg-red-50 text-red-600'">
                Required
              </span>
            </div>
            <p class="text-sm" :class="isDark ? 'text-silver-400' : 'text-gray-600'">{{ addon.description }}</p>
            <a v-if="addon.url" :href="addon.url" target="_blank" rel="noopener noreferrer"
              class="inline-flex items-center gap-1 text-xs text-brand-400 hover:underline mt-2">
              <svg class="w-3 h-3" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
              </svg>
              {{ addon.urlLabel }}
            </a>
          </div>
        </div>
      </div>
    </section>

    <!-- Core Section -->
    <section class="mb-12 fade-in fade-in-delay-3">
      <div class="flex items-center gap-2 mb-5">
        <span class="inline-flex items-center justify-center w-7 h-7 rounded-lg"
          :class="isDark ? 'bg-brand-400/12 text-brand-300' : 'bg-blue-50 text-blue-700'">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
          </svg>
        </span>
        <h2 class="text-xl font-bold" :class="isDark ? 'text-white' : 'text-gray-900'">Core Addons</h2>
        <span class="ml-auto text-xs font-medium px-2.5 py-1 rounded-full"
          :class="isDark ? 'bg-brand-400/10 text-brand-300 border border-brand-400/18' : 'bg-blue-50 text-blue-700 border border-blue-200'">
          {{ coreAddons.length }} addons
        </span>
      </div>
      <p class="text-sm mb-5" :class="isDark ? 'text-silver-500' : 'text-gray-500'">
        Strongly recommended &mdash; these addons form the backbone of the MagguuUI experience.
      </p>
      <div class="grid gap-3">
        <div v-for="addon in coreAddons" :key="addon.name"
          class="glass-card rounded-xl p-5 flex items-start gap-4 transition-all hover:scale-[1.01]"
          :class="isDark ? 'hover:border-brand-400/20' : 'hover:border-blue-200'">
          <span class="inline-flex items-center justify-center w-11 h-11 rounded-xl flex-shrink-0 text-lg"
            :class="isDark ? 'bg-brand-400/10 text-brand-300' : 'bg-blue-50 text-blue-600'">
            {{ addon.emoji }}
          </span>
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 mb-1">
              <h3 class="font-semibold" :class="isDark ? 'text-white' : 'text-gray-900'">{{ addon.name }}</h3>
            </div>
            <p class="text-sm" :class="isDark ? 'text-silver-400' : 'text-gray-600'">{{ addon.description }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Optional Section -->
    <section class="fade-in fade-in-delay-4">
      <div class="flex items-center gap-2 mb-5">
        <span class="inline-flex items-center justify-center w-7 h-7 rounded-lg"
          :class="isDark ? 'bg-emerald-500/12 text-emerald-400' : 'bg-emerald-50 text-emerald-700'">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
        </span>
        <h2 class="text-xl font-bold" :class="isDark ? 'text-white' : 'text-gray-900'">Optional Addons</h2>
        <span class="ml-auto text-xs font-medium px-2.5 py-1 rounded-full"
          :class="isDark ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'">
          {{ optionalAddons.length }} addons
        </span>
      </div>
      <p class="text-sm mb-5" :class="isDark ? 'text-silver-500' : 'text-gray-500'">
        Install any of these for extra functionality &mdash; MagguuUI will configure them automatically if present.
      </p>
      <div class="grid sm:grid-cols-2 gap-3">
        <div v-for="addon in optionalAddons" :key="addon.name"
          class="glass-card rounded-xl p-4 flex items-start gap-3 transition-all hover:scale-[1.01]"
          :class="isDark ? 'hover:border-brand-400/20' : 'hover:border-blue-200'">
          <span class="inline-flex items-center justify-center w-9 h-9 rounded-lg flex-shrink-0 text-base"
            :class="isDark ? 'bg-white/[0.04] text-silver-400' : 'bg-gray-50 text-gray-500'">
            {{ addon.emoji }}
          </span>
          <div class="flex-1 min-w-0">
            <h3 class="text-sm font-semibold mb-0.5" :class="isDark ? 'text-white' : 'text-gray-900'">{{ addon.name }}</h3>
            <p class="text-xs leading-relaxed" :class="isDark ? 'text-silver-500' : 'text-gray-500'">{{ addon.description }}</p>
          </div>
        </div>
      </div>
    </section>

    <div class="text-center mt-12 pt-6 border-t fade-in"
      :class="isDark ? 'border-brand-400/10' : 'border-gray-200'">
      <p class="text-sm" :class="isDark ? 'text-silver-500' : 'text-gray-500'">
        Want to install everything at once? Use the
        <NuxtLink to="/strings" class="text-brand-400 hover:underline">Import Strings</NuxtLink>
        or follow the <NuxtLink to="/guide" class="text-brand-400 hover:underline">Installation Guide</NuxtLink>.
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
const isDark = useIsDark()

usePublicPageSeo({
  title: 'Addons',
  description: 'All required and optional addons that MagguuUI configures — ElvUI, Plater, BigWigs, Details, and more.',
  path: '/addons',
})

const requiredAddons = [
  {
    name: 'ElvUI',
    emoji: '🎨',
    description: 'The complete UI replacement framework that MagguuUI is built on. Handles action bars, unit frames, chat, bags, maps, and more. Required version: 15.00 or higher.',
    url: 'https://www.tukui.org/download.php?ui=elvui',
    urlLabel: 'tukui.org',
  },
]

const coreAddons = [
  {
    name: 'Plater',
    emoji: '🎯',
    description: 'Nameplate addon with per-mob customization, scripting, and mod support.',
  },
  {
    name: 'BigWigs',
    emoji: '⏱️',
    description: 'Boss mod for raid and dungeon encounters with timers, alerts, and proximity.',
  },
  {
    name: 'Details!',
    emoji: '📊',
    description: 'Damage and healing meter with extensive statistics and plugin support.',
  },
  {
    name: 'BetterCooldownManager',
    emoji: '⚡',
    description: 'Tracks party and raid cooldowns with a clean bar/icon display.',
  },
  {
    name: 'Blizzard EditMode',
    emoji: '🖼️',
    description: 'Built-in WoW layout system — MagguuUI applies a pre-configured layout automatically.',
  },
]

const optionalAddons = [
  {
    name: 'Platynator',
    emoji: '🛡️',
    description: 'Additional nameplate tweaks and color coding for Plater.',
  },
  {
    name: 'Ayije CDM',
    emoji: '⏳',
    description: 'Alternative cooldown manager with a compact interface.',
  },
  {
    name: 'BuffReminders',
    emoji: '💡',
    description: 'Reminds you to apply missing buffs like food, flask, or rune.',
  },
  {
    name: 'TargetedSpells',
    emoji: '🔮',
    description: 'Shows incoming spells targeted at you with visual indicators.',
  },
  {
    name: 'AccWideUILayoutSelection',
    emoji: '🔄',
    description: 'Persists your UI layout selection across all characters account-wide.',
  },
  {
    name: 'MiniCC',
    emoji: '🕐',
    description: 'Lightweight cooldown count text on action bar buttons.',
  },
  {
    name: 'ElvUI WindTools',
    emoji: '🌬️',
    description: 'Feature-rich ElvUI plugin with extra modules, skins, and QoL tweaks.',
  },
  {
    name: 'ExwindTools',
    emoji: '🔧',
    description: 'Extended toolkit with additional UI modules and utilities.',
  },
  {
    name: 'HandyNotes',
    emoji: '📍',
    description: 'Pins custom notes and collectible locations on your world map.',
  },
  {
    name: 'HandyNotes MapNotes',
    emoji: '🗺️',
    description: 'Adds instance entrances, portals, and transport icons to the map.',
  },
  {
    name: 'EasyExperienceBar',
    emoji: '📈',
    description: 'Clean, configurable experience and reputation bar replacement.',
  },
  {
    name: 'WIM',
    emoji: '💬',
    description: 'WoW Instant Messenger — gives whispers their own chat windows.',
  },
  {
    name: 'GTFO',
    emoji: '🚨',
    description: 'Plays an alert sound when you stand in fire or other bad stuff.',
  },
  {
    name: 'BugSack',
    emoji: '🪲',
    description: 'Collects Lua errors silently so they don\'t interrupt gameplay.',
  },
  {
    name: 'NorthernSkyRaidTools',
    emoji: '🧭',
    description: 'Raid assignment and note distribution tool for organized groups.',
  },
  {
    name: 'GroupfinderFlags',
    emoji: '🏁',
    description: 'Adds visual flags and filters to the group finder UI.',
  },
  {
    name: 'Falcon',
    emoji: '🦅',
    description: 'Skyriding companion addon with speed and ability tracking.',
  },
  {
    name: 'CursorTrail',
    emoji: '✨',
    description: 'Adds a visual trail effect to your mouse cursor in-game.',
  },
  {
    name: 'MPlusTimer',
    emoji: '⏲️',
    description: 'Mythic+ dungeon timer with detailed split tracking per boss.',
  },
  {
    name: 'Plumber',
    emoji: '🔩',
    description: 'Quality-of-life tweaks for Blizzard UI elements like Delves and warband bank.',
  },
  {
    name: 'WaypointUI',
    emoji: '📌',
    description: 'Customizable waypoint arrow and coordinate display.',
  },
  {
    name: 'tullaCTC',
    emoji: '🎮',
    description: 'Adds cast time to tooltip and cooldown text customization.',
  },
  {
    name: 'TalentTreeTweaks',
    emoji: '🌳',
    description: 'Enhancements for the talent tree UI with better search and import tools.',
  },
]
</script>

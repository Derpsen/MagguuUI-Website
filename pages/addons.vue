<!--
  Addons Page — Required and optional addons for MagguuUI
-->

<template>
  <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
    <!-- Hero -->
    <div class="text-center mb-12 fade-in heading-glow">
      <h1 class="text-4xl sm:text-5xl font-bold mb-4 flex items-center justify-center gap-3">
        <svg aria-hidden="true" class="w-8 h-8 text-brand-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M14.25 6.087c0-.355.186-.676.401-.959.221-.29.349-.634.349-1.003 0-1.036-1.007-1.875-2.25-1.875s-2.25.84-2.25 1.875c0 .369.128.713.349 1.003.215.283.401.604.401.959v0a.64.64 0 01-.657.643 48.491 48.491 0 01-4.163-.3c.186 1.613.79 3.08 1.742 4.295a48.224 48.224 0 013.127.297.643.643 0 01.657.643v0c0 .355-.186.676-.401.959a2.002 2.002 0 00-.349 1.003c0 1.035 1.007 1.875 2.25 1.875s2.25-.84 2.25-1.875c0-.369-.128-.713-.349-1.003a1.733 1.733 0 01-.401-.959v0c0-.374.312-.67.657-.643a48.497 48.497 0 014.163.3c-.186-1.613-.79-3.08-1.742-4.295a48.211 48.211 0 01-3.127-.297.643.643 0 01-.657-.643v0z" />
        </svg>
        <span class="text-gradient">Addons</span>
      </h1>
      <p class="text-lg" :class="isDark ? 'text-silver-500' : 'text-gray-500'">
        All addons that MagguuUI configures &mdash; install what you need, skip what you don't.
      </p>
    </div>

    <!-- Info banner -->
    <div class="glass-card rounded-2xl p-5 sm:p-6 mb-10 fade-in fade-in-delay-1">
      <div class="flex items-start gap-3">
        <span class="inline-flex items-center justify-center w-9 h-9 rounded-xl flex-shrink-0"
          :class="isDark ? 'bg-brand-400/12 text-brand-300' : 'bg-blue-50 text-blue-700'">
          <svg aria-hidden="true" class="w-4.5 h-4.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
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

    <!-- Stats row -->
    <div class="flex flex-wrap gap-3 mb-10 fade-in fade-in-delay-1" aria-label="Addon counts">
      <span class="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full"
        :class="isDark ? 'bg-brand-400/10 text-brand-300 border border-brand-400/18' : 'bg-blue-50 text-blue-700 border border-blue-200'">
        <span class="w-2 h-2 rounded-full bg-brand-400 inline-block"></span>
        {{ coreAddonNames.size }} Core
      </span>
      <span class="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full"
        :class="isDark ? 'bg-white/[0.04] text-silver-400 border border-white/[0.08]' : 'bg-gray-50 text-gray-500 border border-gray-200'">
        <span class="w-2 h-2 rounded-full bg-silver-400 inline-block"></span>
        {{ apiOptionalCount }} Optional
      </span>
      <span class="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full ml-auto"
        :class="isDark ? 'bg-white/[0.04] text-silver-500 border border-white/[0.06]' : 'bg-gray-50 text-gray-400 border border-gray-200'">
        {{ totalProfileCount }} curated profiles
      </span>
    </div>

    <!-- Loading state -->
    <div v-if="pending" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 fade-in fade-in-delay-2" aria-label="Loading addons">
      <div v-for="i in 9" :key="i" class="skeleton glass-card rounded-2xl h-44"></div>
    </div>

    <!-- Error state -->
    <div v-else-if="error" class="glass-card rounded-2xl p-8 text-center fade-in fade-in-delay-2" role="alert">
      <p class="text-sm" :class="isDark ? 'text-silver-400' : 'text-gray-500'">
        Could not load profile data. Addon list is shown without profile counts.
      </p>
    </div>

    <!-- Card grid -->
    <template v-else>
      <!-- Core section -->
      <section class="mb-12 fade-in fade-in-delay-2" aria-labelledby="section-core">
        <h2 id="section-core" class="text-xl font-bold mb-6 flex items-center gap-2"
          :class="isDark ? 'text-white' : 'text-gray-900'">
          <span class="inline-flex items-center justify-center w-7 h-7 rounded-lg"
            :class="isDark ? 'bg-brand-400/12 text-brand-300' : 'bg-blue-50 text-blue-700'">
            <svg aria-hidden="true" class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
            </svg>
          </span>
          Core Addons
          <span class="ml-auto text-xs font-medium px-2.5 py-1 rounded-full"
            :class="isDark ? 'bg-brand-400/10 text-brand-300 border border-brand-400/18' : 'bg-blue-50 text-blue-700 border border-blue-200'">
            {{ coreCards.length }}
          </span>
        </h2>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <AddonCard
            v-for="card in coreCards"
            :key="card.apiKey"
            :card="card"
            :is-dark="isDark"
          />
        </div>
      </section>

      <!-- Optional section -->
      <section class="fade-in fade-in-delay-3" aria-labelledby="section-optional">
        <h2 id="section-optional" class="text-xl font-bold mb-6 flex items-center gap-2"
          :class="isDark ? 'text-white' : 'text-gray-900'">
          <span class="inline-flex items-center justify-center w-7 h-7 rounded-lg"
            :class="isDark ? 'bg-emerald-500/12 text-emerald-400' : 'bg-emerald-50 text-emerald-700'">
            <svg aria-hidden="true" class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
          </span>
          Optional Addons
          <span class="ml-auto text-xs font-medium px-2.5 py-1 rounded-full"
            :class="isDark ? 'bg-white/[0.04] text-silver-400 border border-white/[0.08]' : 'bg-gray-50 text-gray-500 border border-gray-200'">
            {{ optionalCards.length }}
          </span>
        </h2>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <AddonCard
            v-for="card in optionalCards"
            :key="card.apiKey"
            :card="card"
            :is-dark="isDark"
          />
        </div>
      </section>
    </template>

    <!-- Footer CTA -->
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

// ── Types ─────────────────────────────────────────────────────────────────────

interface ProfileItem {
  name: string
  [key: string]: unknown
}

interface AddonCardData {
  apiKey: string
  displayName: string
  emoji: string
  profileCount: number
  isCore: boolean
  stringsLink: string
}

// ── Core addon set ────────────────────────────────────────────────────────────

const coreAddonNames = new Set([
  'ElvUI',
  'Plater',
  'Platynator',
  'BigWigs',
  'NorthernSkyRaidTools',
  'Northern Sky Raid Tools',
  'Details',
  'BetterCooldownManager',
  'Ayije_CDM',
  'Blizzard_EditMode',
  'MRT',
])

// ── Emoji fallback map ────────────────────────────────────────────────────────

const emojiMap: Record<string, string> = {
  ElvUI: '⚙️',
  Plater: '🎯',
  Platynator: '🛡️',
  BigWigs: '⚠️',
  Details: '📊',
  BetterCooldownManager: '⚡',
  Ayije_CDM: '⏳',
  Blizzard_EditMode: '🖼️',
  MRT: '📋',
  NorthernSkyRaidTools: '🧭',
  'Northern Sky Raid Tools': '🧭',
  BuffReminders: '💡',
  TargetedSpells: '🔮',
  MiniCC: '🕐',
  MiniCE: '🕑',
  WindTools: '🌬️',
  ExwindTools: '🔧',
  HandyNotes: '📍',
  HandyNotes_MapNotes: '🗺️',
  EasyExperienceBar: '📈',
  WIM: '💬',
  GTFO: '🚨',
  BugSack: '🪲',
  GroupfinderFlags: '🏁',
  Falcon: '🦅',
  CursorTrail: '✨',
  MPlusTimer: '⏲️',
  Plumber: '🔩',
  WaypointUI: '📌',
  TalentTreeTweaks: '🌳',
}

const fallbackEmoji = '🔵'

// ── Static addon metadata (display name + descriptions) ───────────────────────

const staticMeta: Record<string, { display: string }> = {
  ElvUI: { display: 'ElvUI' },
  Plater: { display: 'Plater' },
  Platynator: { display: 'Platynator' },
  BigWigs: { display: 'BigWigs' },
  Details: { display: 'Details!' },
  BetterCooldownManager: { display: 'BetterCooldownManager' },
  Ayije_CDM: { display: 'Ayije CDM' },
  Blizzard_EditMode: { display: 'Blizzard EditMode' },
  MRT: { display: 'Method Raid Tools' },
  NorthernSkyRaidTools: { display: 'Northern Sky Raid Tools' },
  'Northern Sky Raid Tools': { display: 'Northern Sky Raid Tools' },
  BuffReminders: { display: 'BuffReminders' },
  TargetedSpells: { display: 'TargetedSpells' },
  MiniCC: { display: 'MiniCC' },
  MiniCE: { display: 'MiniCE' },
  WindTools: { display: 'ElvUI WindTools' },
  ExwindTools: { display: 'ExwindTools' },
  HandyNotes: { display: 'HandyNotes' },
  HandyNotes_MapNotes: { display: 'HandyNotes MapNotes' },
  EasyExperienceBar: { display: 'EasyExperienceBar' },
  WIM: { display: 'WIM' },
  GTFO: { display: 'GTFO' },
  BugSack: { display: 'BugSack' },
  GroupfinderFlags: { display: 'GroupfinderFlags' },
  Falcon: { display: 'Falcon' },
  CursorTrail: { display: 'CursorTrail' },
  MPlusTimer: { display: 'MPlusTimer' },
  Plumber: { display: 'Plumber' },
  WaypointUI: { display: 'WaypointUI' },
  TalentTreeTweaks: { display: 'TalentTreeTweaks' },
}

// ── API fetch ─────────────────────────────────────────────────────────────────

const { data: profilesData, pending, error } = await useAsyncData(
  'addon-profiles',
  () => $fetch<Record<string, ProfileItem[]>>('/api/v1/profiles'),
  { default: () => ({}) as Record<string, ProfileItem[]> },
)

// ── Derived card list ─────────────────────────────────────────────────────────

const allCards = computed<AddonCardData[]>(() => {
  const profiles = profilesData.value ?? {}
  return Object.entries(profiles).map(([key, items]) => ({
    apiKey: key,
    displayName: staticMeta[key]?.display ?? key,
    emoji: emojiMap[key] ?? fallbackEmoji,
    profileCount: Array.isArray(items) ? items.length : 0,
    isCore: coreAddonNames.has(key),
    stringsLink: `/strings?addon=${encodeURIComponent(key)}`,
  }))
})

const coreCards = computed(() =>
  allCards.value.filter(c => c.isCore).sort((a, b) => a.displayName.localeCompare(b.displayName)),
)

const optionalCards = computed(() =>
  allCards.value.filter(c => !c.isCore).sort((a, b) => a.displayName.localeCompare(b.displayName)),
)

const apiOptionalCount = computed(() => optionalCards.value.length)

const totalProfileCount = computed(() =>
  allCards.value.reduce((sum, c) => sum + c.profileCount, 0),
)
</script>

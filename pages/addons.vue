<template>
  <div class="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-20">
    <p class="font-mono text-[11px] uppercase tracking-[0.16em] mb-3" :class="isDark ? 'text-brand-300' : 'text-brand-700'">Catalog</p>
    <h1 class="text-4xl font-semibold tracking-tight" :class="isDark ? 'text-white' : 'text-gray-950'">Addons</h1>
    <div class="mt-4 space-y-3 text-sm leading-relaxed max-w-2xl" :class="isDark ? 'text-silver-400' : 'text-gray-600'">
      <p>
        <code>EllesmereUI</code> 9.0.6+ plus four sibling folders: <code>MagguuUI</code>, <code>MagguuUI_Data</code>, <code>MagguuUI_EUI</code>, and <code>MagguuUI_Media</code>. Keep all four enabled.
      </p>
      <p>
        Optional Magguu imports: BigWigs, Northern Sky, EXBoss, Whisper Messenger (not WIM), Waypoint UI, HandyNotes, Talent Tree Tweaks, GTFO, BugSack, Premade Groups Filter, and Smart Reminders. WIM applies with Apply Magguu profiles when it is installed and has no Setup button.
      </p>
      <p>
        Copy the WowUp packs from Setup, or from <NuxtLink to="/strings" class="underline underline-offset-4" :class="isDark ? 'text-white' : 'text-gray-950'">Import Strings</NuxtLink>. MagguuUI does not install addons itself.
      </p>
    </div>

    <section v-if="requiredAddons.length" class="mt-12">
      <h2 class="font-mono text-[11px] uppercase tracking-[0.14em]" :class="isDark ? 'text-brand-300' : 'text-brand-700'">Required</h2>
      <p class="mt-2 text-sm" :class="isDark ? 'text-silver-500' : 'text-gray-500'">MagguuUI will not load without this host UI.</p>
      <ul class="mt-3 border-t" :class="isDark ? 'border-white/10' : 'border-gray-200'">
        <li v-for="addon in requiredAddons" :key="addon.slug" class="border-b" :class="isDark ? 'border-white/10' : 'border-gray-200'">
          <component :is="addon.url ? 'a' : 'div'"
            v-bind="addon.url ? { href: addon.url, target: '_blank', rel: 'noopener noreferrer' } : {}"
            class="block py-4">
            <h3 class="text-sm font-semibold" :class="isDark ? 'text-white' : 'text-gray-950'">{{ addon.name }}</h3>
            <p class="mt-1 text-sm leading-relaxed" :class="isDark ? 'text-silver-400' : 'text-gray-600'">{{ addon.description }}</p>
          </component>
        </li>
      </ul>
    </section>

    <section v-if="coreAddons.length" class="mt-12">
      <h2 class="font-mono text-[11px] uppercase tracking-[0.14em]" :class="isDark ? 'text-brand-300' : 'text-brand-700'">Included with MagguuUI</h2>
      <p class="mt-2 text-sm" :class="isDark ? 'text-silver-500' : 'text-gray-500'">Class layouts ship with MagguuUI. BigWigs is an optional Magguu import when installed.</p>
      <ul class="mt-3 border-t" :class="isDark ? 'border-white/10' : 'border-gray-200'">
        <li v-for="addon in coreAddons" :key="addon.slug" class="border-b" :class="isDark ? 'border-white/10' : 'border-gray-200'">
          <component :is="addon.url ? 'a' : 'div'"
            v-bind="addon.url ? { href: addon.url, target: '_blank', rel: 'noopener noreferrer' } : {}"
            class="block py-4">
            <h3 class="text-sm font-semibold" :class="isDark ? 'text-white' : 'text-gray-950'">{{ addon.name }}</h3>
            <p class="mt-1 text-sm leading-relaxed" :class="isDark ? 'text-silver-400' : 'text-gray-600'">{{ addon.description }}</p>
          </component>
        </li>
      </ul>
    </section>

    <section v-if="optionalAddons.length" class="mt-12">
      <h2 class="font-mono text-[11px] uppercase tracking-[0.14em]" :class="isDark ? 'text-brand-300' : 'text-brand-700'">Optional</h2>
      <p class="mt-2 text-sm" :class="isDark ? 'text-silver-500' : 'text-gray-500'">Imported when installed. Missing addons are skipped. WowUp extras such as LittleWigs live in the starter pack.</p>
      <ul class="mt-3 border-t" :class="isDark ? 'border-white/10' : 'border-gray-200'">
        <li v-for="addon in optionalAddons" :key="addon.slug" class="border-b" :class="isDark ? 'border-white/10' : 'border-gray-200'">
          <component :is="addon.url ? 'a' : 'div'"
            v-bind="addon.url ? { href: addon.url, target: '_blank', rel: 'noopener noreferrer' } : {}"
            class="block py-4">
            <h3 class="text-sm font-semibold" :class="isDark ? 'text-white' : 'text-gray-950'">{{ addon.name }}</h3>
            <p class="mt-1 text-sm leading-relaxed" :class="isDark ? 'text-silver-400' : 'text-gray-600'">{{ addon.description }}</p>
          </component>
        </li>
      </ul>
    </section>
  </div>
</template>

<script setup lang="ts">
const isDark = useIsDark()

usePublicPageSeo({
  title: 'Addons',
  description: 'See the addons MagguuUI needs and the optional raid tools it can configure.',
  path: '/addons',
})

interface Addon {
  slug: string
  name: string
  emoji: string | null
  description: string | null
  url: string | null
}

interface AddonsResponse {
  required: Addon[]
  core: Addon[]
  optional: Addon[]
  total: number
}

const { data } = useFetch<{ data: AddonsResponse }>('/api/v1/addons')
const requiredAddons = computed<Addon[]>(() => data.value?.data?.required ?? [])
const coreAddons = computed<Addon[]>(() => data.value?.data?.core ?? [])
const optionalAddons = computed<Addon[]>(() => data.value?.data?.optional ?? [])
</script>

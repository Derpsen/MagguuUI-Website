<template>
  <div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-20">
    <PublicSetupNav />

    <header class="mb-8 max-w-2xl">
      <p class="font-mono text-[11px] uppercase tracking-[0.16em] mb-2" :class="isDark ? 'text-brand-300' : 'text-brand-700'">Configurator</p>
      <h1 class="text-3xl sm:text-4xl font-semibold tracking-tight" :class="isDark ? 'text-white' : 'text-gray-950'">Profile configurator</h1>
      <p class="mt-3 text-sm leading-relaxed" :class="muted">
        Pick the addons you want. You get the matching WowUp collections, a plain install list and the Magguu profile strings for exactly those addons.
        Your choice lives in the page address, so you can bookmark or share it; it is not stored or sent anywhere. Copy clicks on import strings are counted anonymously (no cookies, no personal data), see <NuxtLink to="/privacy" class="underline underline-offset-4">Privacy</NuxtLink>.
      </p>
    </header>

    <section aria-labelledby="cfg-limits" class="mb-10 max-w-2xl border-l-2 pl-4" :class="isDark ? 'border-brand-300/60' : 'border-brand-700/60'">
      <h2 id="cfg-limits" class="font-mono text-[11px] uppercase tracking-[0.16em] mb-2" :class="isDark ? 'text-brand-300' : 'text-brand-700'">What this does not do</h2>
      <ul class="space-y-1.5 text-sm leading-relaxed" :class="muted">
        <li>
          <strong :class="strong">Apply Magguu profiles</strong> in <code>/mui</code> applies every Magguu profile for the addons you have installed.
          It has no per-module choice, so this selection does not change what it applies.
        </li>
        <li>WowUp collections install everything inside them. MagguuUI does not install addons and does not build custom collections.</li>
      </ul>
    </section>

    <div v-if="!data" class="text-sm" :class="muted" role="status">Loading the addon list…</div>

    <div v-else class="grid gap-12 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
      <!-- ═══ 1 · Choose ═══ -->
      <form class="space-y-6" aria-label="Choose addons" @submit.prevent>
        <fieldset class="m-0 min-w-0 border-0 p-0">
          <legend class="font-mono text-[11px] uppercase tracking-[0.16em] mb-3 p-0" :class="isDark ? 'text-brand-300' : 'text-brand-700'">1 · Addons</legend>
          <p class="mb-3 text-xs" :class="faint" data-testid="cfg-presets">
            Quick pick:
            <button type="button" class="cfg-link" :class="linkClass" @click="applyPreset('required')">EllesmereUI only</button>,
            <button type="button" class="cfg-link" :class="linkClass" @click="applyPreset('starter')">Starter set</button>,
            <button type="button" class="cfg-link" :class="linkClass" @click="applyPreset('all')">Everything</button>
          </p>
          <ul class="space-y-3">
            <li v-for="addon in data.addons" :key="addon.slug">
              <label class="flex items-start gap-3" :class="addon.slug === REQUIRED_SLUG ? '' : 'cursor-pointer'">
                <input
                  type="checkbox"
                  class="mt-1 h-4 w-4 shrink-0 accent-brand-500"
                  :name="`addon-${addon.slug}`"
                  :value="addon.slug"
                  :checked="selection.addons.includes(addon.slug)"
                  :disabled="addon.slug === REQUIRED_SLUG"
                  :aria-labelledby="`cfg-name-${addon.slug}`"
                  :aria-describedby="`cfg-hint-${addon.slug}`"
                  @change="onAddon(addon.slug, ($event.target as HTMLInputElement).checked)"
                />
                <span class="min-w-0">
                  <span class="block text-sm font-medium" :class="strong"><span :id="`cfg-name-${addon.slug}`">{{ addon.name }}</span><span v-if="addon.slug === REQUIRED_SLUG" class="ml-2 font-mono text-[11px] uppercase tracking-[0.12em]" :class="faint">Required</span></span>
                  <span :id="`cfg-hint-${addon.slug}`" class="block text-xs leading-relaxed" :class="faint">{{ addonHint(addon) }}</span>
                </span>
              </label>
              <fieldset
                v-if="selection.addons.includes(addon.slug) && addon.profiles.length > 1"
                class="m-0 mt-2 ml-7 min-w-0 border-0 p-0"
              >
                <legend class="sr-only">Profiles for {{ addon.name }}</legend>
                <ul class="space-y-1.5">
                  <li v-for="p in addon.profiles" :key="p.id">
                    <label class="flex items-center gap-2 text-xs cursor-pointer" :class="muted">
                      <input
                        type="checkbox"
                        class="h-3.5 w-3.5 accent-brand-500"
                        :name="`profile-${addon.slug}`"
                        :value="p.name"
                        :checked="!selection.exclude.includes(`${addon.slug}:${p.name}`)"
                        @change="onProfile(addon.slug, p.name, ($event.target as HTMLInputElement).checked)"
                      />
                      <span>{{ p.name }}</span>
                    </label>
                  </li>
                </ul>
              </fieldset>
            </li>
          </ul>
        </fieldset>
      </form>

      <!-- ═══ 2 · Result ═══ -->
      <div class="space-y-10" aria-labelledby="cfg-result" data-testid="cfg-result">
        <h2 id="cfg-result" class="sr-only">Your result</h2>

        <section aria-labelledby="cfg-install">
          <h3 id="cfg-install" class="font-mono text-[11px] uppercase tracking-[0.16em] mb-3" :class="isDark ? 'text-brand-300' : 'text-brand-700'">2 · Install the addons</h3>

          <div v-if="output.packs.length" class="space-y-5">
            <div v-for="entry in output.packs" :key="entry.pack.key" :data-testid="`cfg-pack-${entry.pack.key}`">
              <div class="flex flex-wrap items-center gap-3">
                <p class="text-sm font-medium" :class="strong">WowUp collection: {{ entry.pack.label }}</p>
                <StringCopyButton
                  :copied="copiedKey === `pack-${entry.pack.id}`"
                  :label="`Copy string: WowUp collection ${entry.pack.label}`"
                  @copy="copyRemote(`pack-${entry.pack.id}`, `/api/v1/wowup/${entry.pack.id}`, { type: 'wowup', id: entry.pack.id })"
                />
              </div>
              <p class="mt-1 text-sm leading-relaxed" :class="muted">
                Covers your picks: {{ entry.covers.join(', ') }}.
                <template v-if="entry.extras.length">It also installs: {{ entry.extras.join(', ') }}.</template>
              </p>
            </div>
            <p class="text-xs leading-relaxed" :class="faint">
              Paste a collection into WowUp. It installs everything listed above, not only your picks. To install only your picks, use the list below.
            </p>
          </div>
          <p v-else class="text-sm" :class="muted" data-testid="cfg-no-packs">No WowUp collection is published for your picks right now. Use the list below.</p>

          <div class="mt-5">
            <div class="flex flex-wrap items-center gap-3">
              <p class="text-sm font-medium" :class="strong">Addon list ({{ output.addonList.length }})</p>
              <StringCopyButton text="Copy list" label="Copy list: addons to install" :copied="copiedKey === 'list'" @copy="copyText('list', output.addonList.join('\n'))" />
            </div>
            <ul class="mt-2 text-sm leading-relaxed" :class="muted" data-testid="cfg-addon-list">
              <li v-for="a in output.selected" :key="a.slug">
                <a v-if="a.url" :href="a.url" target="_blank" rel="noopener noreferrer" class="underline underline-offset-4" :class="strong">{{ a.name }}<span class="sr-only"> (opens in a new tab)</span></a>
                <span v-else>{{ a.name }}</span>
              </li>
            </ul>
            <p v-if="output.outsidePacks.length" class="mt-2 text-xs" :class="faint">
              Not part of a WowUp collection: {{ output.outsidePacks.join(', ') }}. Install {{ output.outsidePacks.length === 1 ? 'it' : 'them' }} from the link in the list.
            </p>
          </div>
        </section>

        <section aria-labelledby="cfg-strings">
          <h3 id="cfg-strings" class="font-mono text-[11px] uppercase tracking-[0.16em] mb-3" :class="isDark ? 'text-brand-300' : 'text-brand-700'">3 · Profile strings</h3>
          <ul v-if="output.profiles.length" class="space-y-4" data-testid="cfg-profiles">
            <li v-for="entry in output.profiles" :key="entry.addon.slug" :data-testid="`cfg-profile-${entry.addon.slug}`">
              <p class="text-sm font-medium" :class="strong">
                {{ entry.addon.name }}
                <span class="ml-2 font-mono text-[11px] uppercase tracking-[0.12em]" :class="faint">{{ entry.addon.singleImport ? 'Single import in Setup' : 'No single import button' }}</span>
              </p>
              <ul class="mt-1.5 space-y-1.5">
                <li v-for="p in entry.profiles" :key="p.id" class="flex flex-wrap items-center gap-3">
                  <span class="text-sm" :class="muted">{{ p.name }}</span>
                  <StringCopyButton
                    :copied="copiedKey === `profile-${p.id}`"
                    :label="`Copy string: ${entry.addon.name}, ${p.name}`"
                    @copy="copyRemote(`profile-${p.id}`, `/api/v1/profiles/${p.id}`, { type: 'profile', id: p.id })"
                  />
                </li>
              </ul>
            </li>
          </ul>
          <p v-else class="text-sm" :class="muted" data-testid="cfg-no-profiles">None of your picks has a published Magguu profile.</p>
          <p v-if="output.noProfile.length" class="mt-3 text-xs leading-relaxed" :class="faint" data-testid="cfg-no-profile-note">
            No Magguu profile exists for: {{ output.noProfile.join(', ') }}. They are only installed.
          </p>
          <p class="mt-3 text-xs leading-relaxed" :class="faint">
            Cooldown Viewer class layouts are separate. Find them under <NuxtLink to="/strings" class="underline underline-offset-4" :class="strong">Import Strings</NuxtLink>.
          </p>
        </section>

        <section aria-labelledby="cfg-ingame">
          <h3 id="cfg-ingame" class="font-mono text-[11px] uppercase tracking-[0.16em] mb-3" :class="isDark ? 'text-brand-300' : 'text-brand-700'">4 · In game</h3>
          <ul class="space-y-2 text-sm leading-relaxed" :class="muted" data-testid="cfg-ingame">
            <li>
              <strong :class="strong">Apply Magguu profiles</strong> sets up every Magguu profile for the addons you have installed in one go. You cannot pick modules there.
            </li>
            <li v-if="output.singleImport.length">
              Setup has a single-import button for: {{ output.singleImport.join(', ') }}. Optional ones only appear while the addon is installed.
            </li>
            <li v-if="output.applyOnly.length">
              Setup has no single-import button for: {{ output.applyOnly.join(', ') }}. They are covered by Apply Magguu profiles. To import by hand, paste the string into the addon's own import dialog if it has one.
            </li>
          </ul>
        </section>

        <section aria-labelledby="cfg-share">
          <h3 id="cfg-share" class="font-mono text-[11px] uppercase tracking-[0.16em] mb-3" :class="isDark ? 'text-brand-300' : 'text-brand-700'">Share</h3>
          <div class="flex flex-wrap items-center gap-3">
            <StringCopyButton text="Copy link" label="Copy link to this selection" :copied="copiedKey === 'link'" @copy="copyLink" />
            <p class="text-xs" :class="faint">The link contains only your selection.</p>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { trackCopy } from '~/utils/beacon'
import { copyTextToClipboard } from '~/utils/clipboard'
import {
  REQUIRED_SLUG, buildOutput, parseSelection, presetSelection, selectionToQuery, toggleAddon, toggleProfile,
  type ConfiguratorAddon, type ConfiguratorData, type Selection,
} from '~/utils/configurator'

const isDark = useIsDark()
const route = useRoute()
const router = useRouter()
const toast = useToast()

usePublicPageSeo({
  title: 'Profile configurator',
  description: 'Choose the addons you want and get the matching WowUp collections, an install list and the Magguu profile strings. The selection lives in the link.',
  path: '/configurator',
})

const muted = computed(() => isDark.value ? 'text-silver-400' : 'text-gray-600')
const faint = computed(() => isDark.value ? 'text-silver-500' : 'text-gray-500')
const strong = computed(() => isDark.value ? 'text-white' : 'text-gray-950')
const linkClass = computed(() => isDark.value ? 'text-white' : 'text-gray-950')

const { data: raw } = await useFetch<{ data: ConfiguratorData }>('/api/v1/configurator')
const data = computed(() => raw.value?.data ?? null)

const EMPTY: ConfiguratorData = { addons: [], packs: [] }
// The address is the single source of truth: SSR, reload and shared links render the same state.
const selection = computed<Selection>(() => parseSelection(route.query, data.value ?? EMPTY))
const output = computed(() => buildOutput(data.value ?? EMPTY, selection.value))

function update(next: Selection) {
  void router.replace({ query: selectionToQuery(next, data.value ?? EMPTY) })
}
const onAddon = (slug: string, on: boolean) => update(toggleAddon(selection.value, slug, on))
const onProfile = (slug: string, name: string, on: boolean) => update(toggleProfile(selection.value, slug, name, on))
const applyPreset = (preset: 'starter' | 'all' | 'required') => update(presetSelection(data.value ?? EMPTY, preset))

function addonHint(addon: ConfiguratorAddon): string {
  const parts: string[] = []
  if (addon.pack) parts.push(addon.pack === 'starter' ? 'In the Starter collection' : 'In the Optional collection')
  else parts.push('Not in a WowUp collection')
  parts.push(addon.profiles.length ? `${addon.profiles.length} Magguu profile${addon.profiles.length === 1 ? '' : 's'}` : 'No Magguu profile')
  return parts.join(' · ')
}

// ─── Copy (strings are fetched one at a time on click, like Import Strings) ───
const copiedKey = ref('')
let timer: ReturnType<typeof setTimeout> | undefined
async function finishCopy(key: string, text: string) {
  if (!(await copyTextToClipboard(text))) {
    toast.add({ title: 'Could not copy. Select the text and copy it manually.', color: 'error' })
    return
  }
  copiedKey.value = key
  clearTimeout(timer)
  timer = setTimeout(() => { copiedKey.value = '' }, 2000)
}
async function copyText(key: string, text: string) { await finishCopy(key, text) }
async function copyRemote(key: string, url: string, target?: { type: 'profile' | 'wowup', id: number }) {
  try {
    const res = await $fetch<{ data?: { string?: string } }>(url)
    const text = res.data?.string
    if (!text) throw new Error('empty')
    await finishCopy(key, text)
    if (target) trackCopy(target.type, target.id)
  } catch {
    toast.add({ title: 'Could not copy', color: 'error' })
  }
}
const copyLink = () => finishCopy('link', window.location.href)
onBeforeUnmount(() => clearTimeout(timer))
</script>

<style scoped>
.cfg-link { background: none; border: 0; padding: 0; font: inherit; text-decoration: underline; text-underline-offset: 4px; cursor: pointer; }
.cfg-link:focus-visible { outline: 2px solid #0aa882; outline-offset: 2px; }
</style>

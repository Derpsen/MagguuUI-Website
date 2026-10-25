<!--
  Submit a preset: community presets (item A). Public input, so the form carries no account,
  no cookie and no personal data. Defences live on the server (server/utils/communityPresets.ts):
  honeypot, signed time token fetched after the page rendered, size limits, rate limits, moderation.
-->
<template>
  <article class="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-20" data-testid="submit-preset-page">
    <p class="font-mono text-[11px] uppercase tracking-[0.16em] mb-3" :class="isDark ? 'text-brand-300' : 'text-brand-700'">Community</p>
    <h1 class="text-4xl font-semibold tracking-tight" :class="strong">Submit a preset</h1>
    <p class="mt-3 text-sm leading-relaxed" :class="muted">
      Share an import string that works well for you. Every submission is reviewed before it appears on the
      <NuxtLink to="/strings" class="underline underline-offset-2" :class="link">Import Strings</NuxtLink> page, where it is marked as
      community-submitted, not verified or endorsed by MagguuUI.
    </p>

    <section class="mt-8" aria-labelledby="submit-privacy" data-testid="submit-privacy">
      <h2 id="submit-privacy" class="font-mono text-[11px] uppercase tracking-[0.16em] mb-3" :class="link">Your data</h2>
      <ul class="space-y-1 text-sm leading-relaxed list-disc pl-5" :class="muted">
        <li>No account, no cookies, and no personal data is requested. Please do not enter any.</li>
        <li>Your IP address and browser details are not stored with a submission.</li>
        <li>Submissions that are not approved are deleted automatically after {{ PENDING_KEEP_DAYS }} days. To have a preset removed, write to <ContactEmail :address="contactEmail" class="underline underline-offset-2" :class="link" />.</li>
        <li>Details are in the <NuxtLink to="/privacy" class="underline underline-offset-2" :class="link">privacy policy</NuxtLink>.</li>
      </ul>
    </section>

    <p v-if="done" class="mt-8 text-sm leading-relaxed" :class="strong" role="status" data-testid="submit-success">{{ done }}</p>

    <form class="mt-8 space-y-5" novalidate data-testid="submit-form" @submit.prevent="submit">
      <section aria-labelledby="submit-details">
        <h2 id="submit-details" class="font-mono text-[11px] uppercase tracking-[0.16em] mb-4" :class="link">Preset</h2>
        <div class="space-y-5">
          <div>
            <label class="block text-sm font-medium mb-1.5" :class="label" for="preset-name">Name</label>
            <input id="preset-name" v-model="form.name" class="preset-field" :class="field" type="text" :minlength="NAME_MIN" :maxlength="NAME_MAX" autocomplete="off" required data-testid="preset-name">
            <p class="mt-1 text-xs" :class="faint">A short, descriptive title, for example "Tank nameplates, 4K". No links.</p>
          </div>

          <div>
            <label class="block text-sm font-medium mb-1.5" :class="label" for="preset-addon">Addon</label>
            <select id="preset-addon" v-model="form.addon" class="preset-field" :class="field" required :disabled="!addons.length" data-testid="preset-addon">
              <option value="" disabled>{{ addons.length ? 'Choose an addon' : 'Loading...' }}</option>
              <option v-for="a in addons" :key="a" :value="a">{{ a }}</option>
            </select>
          </div>

          <div>
            <label class="block text-sm font-medium mb-1.5" :class="label" for="preset-string">Preset string</label>
            <textarea id="preset-string" v-model="form.presetString" class="preset-field font-mono text-xs" :class="field" rows="7" :maxlength="STRING_MAX" spellcheck="false" autocomplete="off" required data-testid="preset-string" />
            <p class="mt-1 text-xs" :class="faint">Plain text exactly as the addon exports it. {{ form.presetString.length }} / {{ STRING_MAX }} characters.</p>
          </div>

          <div>
            <label class="block text-sm font-medium mb-1.5" :class="label" for="preset-version">Tested with version <span :class="faint">(optional)</span></label>
            <input id="preset-version" v-model="form.testedVersion" class="preset-field" :class="field" type="text" :maxlength="VERSION_MAX" autocomplete="off" placeholder="for example 12.0.4" data-testid="preset-version">
            <p class="mt-1 text-xs" :class="faint">The version of the addon you chose above that you used. Letters, digits and . , + _ ( ) / # : - only.</p>
          </div>

          <div>
            <label class="block text-sm font-medium mb-1.5" :class="label" for="preset-note">Note <span :class="faint">(optional)</span></label>
            <textarea id="preset-note" v-model="form.note" class="preset-field" :class="field" rows="2" :maxlength="NOTE_MAX" autocomplete="off" data-testid="preset-note" />
            <p class="mt-1 text-xs" :class="faint">One or two sentences. Plain text, no links. {{ form.note.length }} / {{ NOTE_MAX }}</p>
          </div>

          <!-- Honeypot: invisible and unreachable for people; bots tend to fill every field. -->
          <div class="preset-trap" aria-hidden="true">
            <label for="preset-website">Website</label>
            <input id="preset-website" v-model="form.website" type="text" name="website" tabindex="-1" autocomplete="off" data-testid="preset-website">
          </div>
        </div>
      </section>

      <p v-if="error" class="text-sm" :class="isDark ? 'text-red-300' : 'text-red-700'" role="alert" data-testid="submit-error">{{ error }}</p>

      <div class="flex items-center gap-4">
        <button type="submit" class="preset-submit" :disabled="sending || !token" data-testid="submit-button">{{ sending ? 'Sending...' : 'Send for review' }}</button>
        <p v-if="!token && !tokenFailed" class="text-xs" :class="faint">Preparing the form...</p>
        <p v-if="tokenFailed" class="text-xs" :class="faint">The form could not be prepared. Please reload the page.</p>
      </div>
    </form>
  </article>
</template>

<script setup lang="ts">
import { errorMessage } from '~/utils/errors'

// Mirrors the server limits (server/utils/communityPresets.ts); the server enforces them.
const NAME_MIN = 3
const NAME_MAX = 60
const STRING_MAX = 16000
const NOTE_MAX = 200
const VERSION_MAX = 40
const PENDING_KEEP_DAYS = 30

const isDark = useIsDark()
const siteSettings = usePublicSiteSettings()
const contactEmail = computed(() => siteSettings.value.contact_email || 'contact@magguu.xyz')
usePublicPageSeo({
  title: 'Submit a preset',
  description: 'Send in your own addon preset for review. No account, no cookies, no personal data.',
  path: '/submit-preset',
  robots: 'noindex, follow',
})

const muted = computed(() => isDark.value ? 'text-silver-400' : 'text-gray-600')
const faint = computed(() => isDark.value ? 'text-silver-500' : 'text-gray-500')
const strong = computed(() => isDark.value ? 'text-white' : 'text-gray-950')
const label = computed(() => isDark.value ? 'text-silver-300' : 'text-gray-700')
const link = computed(() => isDark.value ? 'text-brand-300' : 'text-brand-700')
const field = computed(() => isDark.value
  ? 'bg-brand-900/50 border border-white/15 text-white focus:border-brand-300'
  : 'bg-white border border-gray-300 text-gray-900 focus:border-brand-700')

const form = reactive({ name: '', addon: '', presetString: '', testedVersion: '', note: '', website: '' })
const addons = ref<string[]>([])
const token = ref('')
const tokenFailed = ref(false)
let readyAt = 0
const sending = ref(false)
const error = ref('')
const done = ref('')

// The token is requested after the page rendered in the browser: its age is the time-trap.
async function loadToken() {
  token.value = ''
  tokenFailed.value = false
  try {
    const res = await $fetch<{ success: boolean, data: { token: string, minSeconds: number, addons: string[] } }>('/api/v1/community-presets/form-token')
    token.value = res.data.token
    addons.value = res.data.addons
    readyAt = Date.now() + (res.data.minSeconds + 1) * 1000
  } catch {
    tokenFailed.value = true
  }
}
onMounted(loadToken)

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

async function submit() {
  if (sending.value || !token.value) return
  error.value = ''
  done.value = ''
  if (form.name.trim().length < NAME_MIN) { error.value = `The name must be at least ${NAME_MIN} characters.`; return }
  if (!form.addon) { error.value = 'Choose an addon.'; return }
  if (form.presetString.trim().length < 20) { error.value = 'The preset string looks too short.'; return }
  sending.value = true
  try {
    // A very quick submit simply waits out the minimum form time instead of failing.
    const wait = readyAt - Date.now()
    if (wait > 0) await sleep(wait)
    const res = await $fetch<{ success: boolean, data: { message: string } }>('/api/v1/community-presets', {
      method: 'POST',
      body: { ...form, token: token.value },
    })
    done.value = res.data.message
    Object.assign(form, { name: '', addon: '', presetString: '', testedVersion: '', note: '', website: '' })
    await loadToken()
  } catch (err) {
    error.value = errorMessage(err, 'Could not send the preset. Please try again.')
    await loadToken()
  } finally {
    sending.value = false
  }
}
</script>

<style scoped>
.preset-field { width: 100%; border-radius: 0.375rem; padding: 0.5rem 0.75rem; font-size: 0.875rem; }
.preset-field:focus { outline: 2px solid #0aa882; outline-offset: 1px; }
html.light .preset-field:focus { outline-color: #0f766e; }
.preset-trap { position: absolute; left: -10000px; top: auto; width: 1px; height: 1px; overflow: hidden; }
.preset-submit { border: 1px solid rgba(255, 255, 255, 0.3); border-radius: 0.375rem; padding: 0.5rem 1rem; font-size: 0.875rem; color: inherit; background: transparent; cursor: pointer; }
.preset-submit:hover:not(:disabled) { border-color: #0aa882; color: #0aa882; }
.preset-submit:focus-visible { outline: 2px solid #0aa882; outline-offset: 2px; }
.preset-submit:disabled { opacity: 0.55; cursor: default; }
html.light .preset-submit { border-color: rgba(15, 23, 42, 0.3); color: #1f2937; }
html.light .preset-submit:hover:not(:disabled) { border-color: #0f766e; color: #0f766e; }
html.light .preset-submit:focus-visible { outline-color: #0f766e; }
</style>

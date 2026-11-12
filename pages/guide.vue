<template>
  <div class="setup-page mg-container pt-8 pb-20">
    <!-- Admin controls: ClientOnly always renders a div (fallback + hidden when guest) -->
    <ClientOnly>
      <div
        class="flex flex-wrap items-center justify-end gap-2 mb-5"
        :class="isAdmin ? '' : 'hidden'"
        :aria-hidden="isAdmin ? undefined : 'true'"
      >
        <template v-if="isAdmin && editMode">
          <button type="button" class="mg-btn mg-btn--sm mg-btn--primary" :disabled="saving" @click="saveAll">
            {{ saving ? 'Saving…' : 'Save' }}
          </button>
          <button type="button" class="mg-btn mg-btn--sm mg-btn--secondary" @click="cancelEdit">Cancel</button>
        </template>
        <template v-else-if="isAdmin">
          <button type="button" class="mg-btn mg-btn--sm mg-btn--secondary" :disabled="editorLoading" :aria-busy="editorLoading" @click="startEdit">
            {{ editorLoading ? 'Loading…' : 'Edit Page' }}
          </button>
          <NuxtLink to="/admin/content/guide" class="mg-btn mg-btn--sm mg-btn--ghost">Full Editor</NuxtLink>
        </template>
      </div>
      <template #fallback>
        <div class="hidden mb-5" aria-hidden="true" />
      </template>
    </ClientOnly>

    <!-- No Transition: comment/fragment placeholders mismatch a stable div tree -->
    <div v-if="editMode" class="mg-notice mb-5">
      <span class="mg-small mg-muted">Edit mode: change the text below, then click Save.</span>
    </div>

    <div v-if="showSaved" class="mg-notice fixed bottom-6 left-1/2 z-50 -translate-x-1/2" role="status">
      <span class="mg-small">Changes saved</span>
    </div>

    <PublicSetupNav />

    <header class="setup-head mb-12">
      <div v-if="!editMode">
        <p class="mg-kicker setup-rise" style="--i: 0">Procedure</p>
        <h1 class="mg-display mg-title-grad mt-3 max-w-3xl setup-rise" style="--i: 1">
          {{ visibleTitle || 'Installation Guide' }}
        </h1>
        <p class="setup-head__lead mg-lead setup-rise" style="--i: 2">
          {{ visibleSubtitle || 'Download EllesmereUI 9.0.6+ and MagguuUI from CurseForge, Wago, or WoWInterface. Open /mui and run Apply Magguu profiles. Everything except EllesmereUI is optional.' }}
        </p>
        <DownloadButtons primary class="setup-head__actions setup-rise" style="--i: 3" />
      </div>

      <div v-else class="max-w-3xl space-y-3">
        <div>
          <label for="guide-title" class="block mg-small mg-subtle mb-1.5">Page title</label>
          <input id="guide-title" v-model="editableTitle" class="mg-input text-2xl font-bold">
        </div>
        <div>
          <label for="guide-subtitle" class="block mg-small mg-subtle mb-1.5">Subtitle</label>
          <textarea id="guide-subtitle" v-model="editableSubtitle" rows="3" class="mg-input resize-none"></textarea>
        </div>
      </div>
    </header>

    <div v-if="!editMode" class="setup-shot mb-16 max-w-4xl">
      <div class="setup-shot__frame">
        <ScreenshotFrame
          src="/screenshots/setup.jpg"
          alt="EllesmereUI MagguuUI Setup, with Apply Magguu profiles."
          caption="Setup, opened with /mui"
          :width="2000"
          :height="1125"
          eager
        />
      </div>
    </div>

    <!-- Steps + sidebar -->
    <div v-if="visibleSteps.length" class="guide-layout">
      <ol class="guide-steps">
        <li
          v-for="(step, idx) in visibleSteps"
          :id="`step-${idx + 1}`"
          :key="step.num"
          class="guide-step"
        >
          <span class="guide-step__n" aria-hidden="true">{{ idx + 1 }}</span>
          <div class="guide-step__body">
            <span class="mg-kicker guide-step__stage">{{ stepStage(idx) }}</span>
            <h2 class="guide-step__title">{{ step.editableTitle || `Step ${idx + 1}` }}</h2>

            <template v-if="!editMode">
              <SafeHtml class="guide-content guide-step__content" :html="step.editableContent" breaks />
            </template>

            <template v-else>
              <div class="guide-step__content space-y-3">
                <div>
                  <label :for="`guide-step-title-${idx}`" class="block mg-small mg-subtle mb-1">Step {{ idx + 1 }} title</label>
                  <input :id="`guide-step-title-${idx}`" v-model="step.editableTitle" class="mg-input font-semibold">
                </div>
                <div>
                  <span class="block mg-small mg-subtle mb-1">Content</span>
                  <ClientOnly>
                    <component
                      :is="TipTapEditor"
                      v-if="TipTapEditor"
                      v-model="step.editableContent"
                      placeholder="Step content..."
                      min-height="120px"
                    />
                    <template #fallback>
                      <div class="min-h-[120px] rounded-xl" aria-hidden="true" />
                    </template>
                  </ClientOnly>
                </div>
              </div>
            </template>
          </div>
        </li>
      </ol>

      <aside class="guide-toc space-y-8">
        <nav aria-label="Guide steps">
          <p class="mg-kicker guide-toc__label">On this page</p>
          <ol>
            <li v-for="(step, idx) in visibleSteps" :key="`jump-${step.num}`">
              <a :href="`#step-${idx + 1}`" class="guide-jump">
                <span class="guide-jump__n" aria-hidden="true">{{ String(idx + 1).padStart(2, '0') }}</span>
                <span class="min-w-0">{{ step.editableTitle || `Step ${idx + 1}` }}</span>
              </a>
            </li>
          </ol>
        </nav>

        <div>
          <p class="mg-kicker guide-toc__label">After setup</p>
          <ul>
            <li>
              <NuxtLink to="/strings" class="guide-help"><span>Import strings</span><UIcon name="i-heroicons-arrow-up-right" class="guide-help__go w-3.5 h-3.5" aria-hidden="true" /></NuxtLink>
            </li>
            <li>
              <NuxtLink to="/strings?tab=wowup" class="guide-help"><span>WowUp packages</span><UIcon name="i-heroicons-arrow-up-right" class="guide-help__go w-3.5 h-3.5" aria-hidden="true" /></NuxtLink>
            </li>
            <li>
              <a href="#apply-one-module" class="guide-help"><span>Apply only one module</span></a>
            </li>
            <li>
              <NuxtLink to="/faq" class="guide-help"><span>FAQ</span><UIcon name="i-heroicons-arrow-up-right" class="guide-help__go w-3.5 h-3.5" aria-hidden="true" /></NuxtLink>
            </li>
          </ul>
        </div>
      </aside>
    </div>

    <!-- Empty state -->
    <div v-else class="py-16">
      <p class="mg-muted">No guide steps available yet.</p>
      <NuxtLink v-if="isAdmin" to="/admin/content/guide" class="mg-link mt-3 inline-block text-sm">Add steps in the editor</NuxtLink>
    </div>

    <!-- Apply only one module (static, verified against the addon: Setup.lua InstallAll, Tools.lua BuildIndividualProfileOptions) -->
    <section v-if="!editMode" id="apply-one-module" class="mt-20 max-w-3xl scroll-mt-28" aria-labelledby="apply-one-module-title">
      <p class="mg-kicker mb-3">Single import</p>
      <h2 id="apply-one-module-title" class="mg-h2">Apply only one module</h2>
      <div class="guide-content mt-5 space-y-4">
        <p>
          <strong>Apply Magguu profiles</strong> is the all-in-one first install for the current character. It has no
          per-module selection: it imports the EllesmereUI profile, then the profiles for every supported addon you have installed, then the class layouts.
          The only switch next to it is <em>Include Magguu Settings</em>.
        </p>
        <p>To take just one part, open <code>/mui</code>, go to Setup and scroll to the <em>Required</em> and <em>Optional</em> rows. Each button there imports one thing:</p>
        <ul>
          <li><em>Import EllesmereUI profile</em> and <em>Import class layouts</em> (your current class). Always listed.</li>
          <li>
            <em>Import BigWigs profile</em>, <em>Import Northern Sky</em>, <em>Import EXBoss</em>, <em>Import Smart Reminders</em> and <em>Import Whisper Messenger</em>.
            Each one is listed only while that addon is installed.
          </li>
          <li><em>Apply Magguu Settings</em> applies only the Magguu Settings (fonts, UI scale and extras) and does not reinstall any profile.</li>
        </ul>
        <p>
          WaypointUI, HandyNotes, Talent Tree Tweaks, GTFO, BugSack and Premade Groups Filter have no single-import button in the Setup page. Their Magguu profiles
          come only with Apply Magguu profiles.
        </p>
        <p>
          You can also import one profile by hand: copy its string on <NuxtLink to="/strings">Strings</NuxtLink>
          and paste it into that addon's own import window. None of these steps download addons: install them first (see the WowUp packages).
        </p>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import type { Component } from 'vue'

const toast = useToast()
const { apiFetch } = useApi()
const { isLoggedIn } = useAuth()
usePublicPageSeo({
  title: 'Installation Guide',
  description: 'Download EllesmereUI 9.0.6+ and MagguuUI from CurseForge, Wago, or WoWInterface, open /mui, and run Apply Magguu profiles.',
  path: '/guide',
})
const isAdmin = computed(() => {
  if (import.meta.server) return false
  return isLoggedIn.value
})

interface GuideLocale { [k: string]: unknown }
interface GuidePayload { en?: GuideLocale, de?: GuideLocale, [k: string]: unknown }
interface EditableStep {
  num: number
  editableTitle: string
  editableContent: string
}

interface GuidePageState {
  content: GuideLocale
  title: string
  subtitle: string
  steps: EditableStep[]
}

function parseSteps(raw: Record<string, string> | undefined): EditableStep[] {
  if (!raw || typeof raw !== 'object') return []

  const keys = Object.keys(raw)
  const nums = [...new Set(
    keys
      .map((key) => {
        const match = key.match(/^step_(\d+)/)
        return match ? parseInt(match[1]) : 0
      })
      .filter((num) => num > 0),
  )].sort((a, b) => a - b)

  return nums
    .map((num) => ({
      num,
      editableTitle: stripHtml(raw[`step_${num}_title`] || ''),
      editableContent: raw[`step_${num}`] || raw[`step_${num}_content`] || '',
    }))
    .filter((step) => step.editableContent || step.editableTitle)
}

function toGuidePageState(res: { data?: GuidePayload } | null | undefined): GuidePageState {
  const raw = res?.data
  const content = (raw?.en || raw?.de || raw || {}) as GuideLocale
  const intro = (content.intro || {}) as Record<string, string>
  const stepsRaw = content.steps as Record<string, string> | undefined
  return {
    content,
    title: stripHtml(intro.title || ''),
    subtitle: stripHtml(intro.text || ''),
    steps: parseSteps(stepsRaw),
  }
}

// No top-level await — parse in transform so SSR payload already has steps
// (a post-fetch watch left steps=[] on the server HTML → hydration mismatch).
const { data: guidePage, refresh: refreshGuide } = useFetch('/api/v1/content/guide', {
  key: 'public-guide',
  transform: (res: { data?: GuidePayload }) => toGuidePageState(res),
  default: () => ({ content: {}, title: '', subtitle: '', steps: [] as EditableStep[] }),
})

const editableTitle = ref('')
const editableSubtitle = ref('')
const steps = ref<EditableStep[]>([])
const editMode = ref(false)
const saving = ref(false)
const showSaved = ref(false)
// Loaded only after "Edit Page" — not a Lazy* child in the public tree, so the
// TipTap/ProseMirror chunk is not prefetched on guest visits.
const TipTapEditor = shallowRef<Component | null>(null)
const editorLoading = ref(false)
let editorImport: Promise<void> | null = null

async function startEdit() {
  if (editorLoading.value) return
  if (!TipTapEditor.value) {
    editorLoading.value = true
    try {
      editorImport ??= import('~/components/TipTapEditor.vue').then((mod) => {
        TipTapEditor.value = mod.default
      })
      await editorImport
    } catch {
      editorImport = null
      toast.add({ title: 'Could not load the editor. Try again.', color: 'error' })
      return
    } finally {
      editorLoading.value = false
    }
  }
  editMode.value = true
}

// Prefer payload-backed computeds for SSR/hydration; edit refs only while editing.
const visibleTitle = computed(() => editMode.value ? editableTitle.value : (guidePage.value?.title || ''))
const visibleSubtitle = computed(() => editMode.value ? editableSubtitle.value : (guidePage.value?.subtitle || ''))
const visibleSteps = computed(() => editMode.value ? steps.value : (guidePage.value?.steps || []))

const STEP_META = [
  // One tag per default step (1 EllesmereUI, 2 MagguuUI, 3 optional raid tools, 4 Setup, 5 Skinning/QoL, 6 commands).
  { label: 'Required' },
  { label: 'Install' },
  { label: 'Optional' },
  { label: 'Apply' },
  { label: 'Skinning & QoL' },
  { label: 'Commands' },
] as const

watch(guidePage, (page) => {
  if (!editMode.value && page) {
    editableTitle.value = page.title
    editableSubtitle.value = page.subtitle
    steps.value = page.steps.map(step => ({ ...step }))
  }
}, { immediate: true, flush: 'sync' })



function stepStage(idx: number) {
  return STEP_META[idx]?.label || `Phase ${idx + 1}`
}

function cancelEdit() {
  const page = guidePage.value
  editableTitle.value = page?.title || ''
  editableSubtitle.value = page?.subtitle || ''
  steps.value = (page?.steps || []).map(step => ({ ...step }))
  editMode.value = false
}

async function saveAll() {
  saving.value = true
  try {
    interface ContentBulkItem {
      page: string
      section: string
      key: string
      value: string
      locale: string
    }
    const items: ContentBulkItem[] = [
      { page: 'guide', section: 'intro', key: 'title', value: editableTitle.value, locale: 'en' },
      { page: 'guide', section: 'intro', key: 'text', value: editableSubtitle.value, locale: 'en' },
    ]

    steps.value.forEach((step, idx) => {
      const num = idx + 1
      items.push({ page: 'guide', section: 'steps', key: `step_${num}_title`, value: step.editableTitle, locale: 'en' })
      items.push({ page: 'guide', section: 'steps', key: `step_${num}`, value: step.editableContent, locale: 'en' })
    })

    await apiFetch('/api/v1/admin/content/bulk', { method: 'POST', body: { items } })
    editMode.value = false
    showSaved.value = true
    setTimeout(() => { showSaved.value = false }, 2500)
    await refreshGuide()
  } catch {
    toast.add({ title: 'Error saving', color: 'error' })
  } finally {
    saving.value = false
  }
}
</script>

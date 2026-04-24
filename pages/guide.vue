<!--
  Guide Page — Installation steps with a clean, unified layout
-->

<template>
  <div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
    <!-- Admin controls (client-only to avoid layout shift on SSR) -->
    <ClientOnly>
    <div v-if="isAdmin" class="flex items-center justify-end gap-2 mb-5 fade-in">
      <template v-if="editMode">
        <button
          @click="saveAll"
          :disabled="saving"
          class="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-white transition-all"
          :class="saving ? 'bg-brand-400/60 cursor-wait' : 'bg-brand-400 hover:bg-brand-500'"
        >
          <svg v-if="saving" class="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" /><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
          <svg v-else class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
          Save
        </button>
        <button
          @click="cancelEdit"
          class="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all"
          :class="isDark ? 'text-silver-400 hover:text-white hover:bg-white/5 border border-brand-400/15' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100 border border-gray-200'"
        >
          Cancel
        </button>
      </template>
      <template v-else>
        <button
          @click="editMode = true"
          class="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all"
          :class="isDark ? 'bg-brand-400/10 text-brand-400 hover:bg-brand-400/20 border border-brand-400/20' : 'bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200'"
        >
          <svg aria-hidden="true" class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" /></svg>
          Edit Page
        </button>
        <NuxtLink
          to="/admin/content/guide"
          class="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all"
          :class="isDark ? 'bg-white/5 text-silver-400 hover:text-white hover:bg-white/10 border border-brand-400/15' : 'bg-gray-100 text-gray-500 hover:text-gray-900 hover:bg-gray-200 border border-gray-200'"
        >
          Full Editor
        </NuxtLink>
      </template>
    </div>
    </ClientOnly>

    <Transition name="bar">
      <div
        v-if="editMode"
        class="flex items-center gap-2 mb-5 px-3 py-2 rounded-lg"
        :class="isDark ? 'bg-brand-400/10 border border-brand-400/20' : 'bg-blue-50 border border-blue-200'"
      >
        <span class="inline-block w-1.5 h-1.5 rounded-full bg-brand-400 animate-pulse" />
        <span class="text-xs font-medium" :class="isDark ? 'text-brand-400' : 'text-blue-600'">Edit mode — change text below, then click Save</span>
      </div>
    </Transition>

    <Transition name="toast">
      <div
        v-if="showSaved"
        class="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl shadow-lg border backdrop-blur-xl"
        :class="isDark ? 'bg-emerald-900/80 border-emerald-400/20 text-emerald-300' : 'bg-emerald-50 border-emerald-200 text-emerald-700'"
      >
        <svg aria-hidden="true" class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
        <span class="text-sm font-medium">Changes saved</span>
      </div>
    </Transition>

    <!-- Header -->
    <section class="mb-12 fade-in">
      <div v-if="!editMode" class="max-w-3xl mx-auto text-center heading-glow">
        <h1 class="text-4xl sm:text-5xl font-bold leading-tight mb-4 flex items-center justify-center gap-3">
          <UIcon name="i-heroicons-book-open" class="w-8 h-8 text-brand-400 flex-shrink-0" />
          <span class="text-gradient">{{ editableTitle || 'Installation Guide' }}</span>
        </h1>
        <p class="text-lg leading-relaxed" :class="isDark ? 'text-silver-400' : 'text-gray-500'">
          {{ editableSubtitle || 'Set up MagguuUI once on your main character, then let alts load the same profiles automatically.' }}
        </p>
      </div>

      <div v-else class="max-w-3xl mx-auto space-y-3">
        <div>
          <label class="block text-xs font-medium mb-1.5" :class="isDark ? 'text-silver-500' : 'text-gray-500'">Page Title</label>
          <input
            v-model="editableTitle"
            class="w-full text-2xl sm:text-3xl font-bold rounded-2xl px-4 py-3 border-2 transition-colors outline-none"
            :class="isDark ? 'bg-brand-800/50 text-white border-brand-400/30 focus:border-brand-400' : 'bg-white text-gray-900 border-blue-200 focus:border-blue-500'"
          >
        </div>
        <div>
          <label class="block text-xs font-medium mb-1.5" :class="isDark ? 'text-silver-500' : 'text-gray-500'">Subtitle</label>
          <textarea
            v-model="editableSubtitle"
            rows="3"
            class="w-full text-base rounded-2xl px-4 py-3 border-2 transition-colors outline-none resize-none"
            :class="isDark ? 'bg-brand-800/50 text-silver-300 border-brand-400/30 focus:border-brand-400' : 'bg-white text-gray-700 border-blue-200 focus:border-blue-500'"
          ></textarea>
        </div>
      </div>
    </section>

    <!-- Layout: steps + sidebar -->
    <div v-if="steps.length" class="grid lg:grid-cols-[minmax(0,1fr)_260px] gap-8 lg:gap-12 items-start">
      <!-- Steps -->
      <div class="space-y-5">
        <article
          v-for="(step, idx) in steps"
          :id="`step-${idx + 1}`"
          :key="step.num"
          class="guide-step glass-card rounded-2xl p-6 sm:p-7 transition-all fade-in"
          :style="{ animationDelay: `${idx * 50}ms`, animationFillMode: 'both' }"
          :class="isDark
            ? 'hover:border-brand-400/25 hover:shadow-lg hover:shadow-brand-400/5'
            : 'hover:border-blue-200 hover:shadow-lg hover:shadow-blue-100'"
        >
          <div class="flex items-start gap-4 sm:gap-5">
            <!-- Step number -->
            <div class="flex-shrink-0 flex flex-col items-center gap-2">
              <div class="guide-step-number"
                :class="isDark
                  ? 'bg-brand-400/10 text-brand-300 border border-brand-400/25'
                  : 'bg-blue-50 text-blue-600 border border-blue-200'">
                {{ idx + 1 }}
              </div>
              <span v-if="idx < steps.length - 1" aria-hidden="true" class="w-px h-6"
                :class="isDark ? 'bg-brand-400/15' : 'bg-blue-100'" />
            </div>

            <!-- Content -->
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 mb-1.5">
                <UIcon :name="stepIcon(idx)" class="w-4 h-4" :class="isDark ? 'text-silver-500' : 'text-gray-400'" />
                <span class="text-[11px] font-semibold uppercase tracking-[0.18em]"
                  :class="isDark ? 'text-silver-500' : 'text-gray-500'">
                  {{ stepStage(idx) }}
                </span>
              </div>
              <h3 class="text-xl sm:text-2xl font-bold leading-tight mb-4"
                :class="isDark ? 'text-white' : 'text-gray-900'">
                {{ step.editableTitle || `Step ${idx + 1}` }}
              </h3>

              <template v-if="!editMode">
                <div
                  class="guide-content text-[15px] leading-relaxed"
                  :class="isDark ? 'text-silver-300' : 'text-gray-600'"
                  v-html="renderGuideContent(step.editableContent)"
                />
              </template>

              <template v-else>
                <div class="space-y-3">
                  <div>
                    <label class="block text-xs font-medium mb-1" :class="isDark ? 'text-silver-500' : 'text-gray-400'">Step {{ idx + 1 }} Title</label>
                    <input
                      v-model="step.editableTitle"
                      class="w-full font-semibold rounded-xl px-3 py-2 border-2 transition-colors outline-none"
                      :class="isDark ? 'bg-brand-800/50 text-white border-brand-400/30 focus:border-brand-400' : 'bg-white text-gray-900 border-blue-200 focus:border-blue-500'"
                    >
                  </div>
                  <div>
                    <label class="block text-xs font-medium mb-1" :class="isDark ? 'text-silver-500' : 'text-gray-400'">Content</label>
                    <ClientOnly>
                      <TipTapEditor v-model="step.editableContent" placeholder="Step content..." min-height="120px" />
                    </ClientOnly>
                  </div>
                </div>
              </template>
            </div>
          </div>
        </article>
      </div>

      <!-- Sidebar: simple step index + help links -->
      <aside class="space-y-4 lg:sticky lg:top-28">
        <nav class="glass-card rounded-2xl p-5 fade-in" aria-label="Guide steps">
          <p class="text-[11px] font-semibold uppercase tracking-[0.18em] mb-3"
            :class="isDark ? 'text-silver-500' : 'text-gray-500'">
            On this page
          </p>
          <ol class="space-y-1">
            <li v-for="(step, idx) in steps" :key="`jump-${step.num}`">
              <a :href="`#step-${idx + 1}`"
                class="guide-jump flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm transition-colors"
                :class="isDark
                  ? 'text-silver-300 hover:text-white hover:bg-white/5'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-blue-50'">
                <span class="inline-flex items-center justify-center w-5 h-5 rounded-md text-[10px] font-bold flex-shrink-0"
                  :class="isDark
                    ? 'bg-brand-400/10 text-brand-300'
                    : 'bg-blue-50 text-blue-600'">
                  {{ idx + 1 }}
                </span>
                <span class="truncate">{{ step.editableTitle || `Step ${idx + 1}` }}</span>
              </a>
            </li>
          </ol>
        </nav>

        <div class="glass-card rounded-2xl p-5 fade-in">
          <p class="text-[11px] font-semibold uppercase tracking-[0.18em] mb-3"
            :class="isDark ? 'text-silver-500' : 'text-gray-500'">
            After setup
          </p>
          <div class="space-y-1">
            <NuxtLink to="/strings" class="guide-help-link" :class="isDark ? 'guide-help-link--dark' : 'guide-help-link--light'">
              <UIcon name="i-heroicons-bolt" class="w-4 h-4 flex-shrink-0" />
              <span>Import strings</span>
              <UIcon name="i-heroicons-arrow-up-right" class="w-3.5 h-3.5 ml-auto opacity-50" />
            </NuxtLink>
            <NuxtLink to="/strings?addon=WowUp" class="guide-help-link" :class="isDark ? 'guide-help-link--dark' : 'guide-help-link--light'">
              <UIcon name="i-heroicons-archive-box-arrow-down" class="w-4 h-4 flex-shrink-0" />
              <span>WowUp package</span>
              <UIcon name="i-heroicons-arrow-up-right" class="w-3.5 h-3.5 ml-auto opacity-50" />
            </NuxtLink>
            <NuxtLink to="/faq" class="guide-help-link" :class="isDark ? 'guide-help-link--dark' : 'guide-help-link--light'">
              <UIcon name="i-heroicons-question-mark-circle" class="w-4 h-4 flex-shrink-0" />
              <span>FAQ</span>
              <UIcon name="i-heroicons-arrow-up-right" class="w-3.5 h-3.5 ml-auto opacity-50" />
            </NuxtLink>
          </div>
        </div>
      </aside>
    </div>

    <!-- Empty state -->
    <div v-else class="glass-card rounded-3xl p-14 text-center fade-in">
      <UIcon name="i-heroicons-book-open" class="w-12 h-12 mx-auto mb-4" :class="isDark ? 'text-silver-700' : 'text-gray-300'" />
      <p :class="isDark ? 'text-silver-500' : 'text-gray-500'">No guide steps available yet.</p>
      <NuxtLink v-if="isAdmin" to="/admin/content/guide" class="inline-flex items-center gap-1.5 mt-3 text-brand-400 hover:underline text-sm">
        Add steps in the editor
      </NuxtLink>
    </div>
  </div>
</template>

<script setup lang="ts">
import { renderMarkdownToSafeHtml } from '~/utils/richText'

const toast = useToast()
const { apiFetch } = useApi()
const isDark = useIsDark()
const { isLoggedIn } = useAuth()
usePublicPageSeo({
  title: 'Installation Guide',
  description: 'Step-by-step installation guide for MagguuUI, from first install to alt profile sync.',
  path: '/guide',
})
const isAdmin = computed(() => {
  if (import.meta.server) return false
  return isLoggedIn.value
})

interface GuideLocale { [k: string]: unknown }
interface GuidePayload { en?: GuideLocale, de?: GuideLocale, [k: string]: unknown }
const { data: guideData, refresh: refreshGuide } = await useFetch<{ data: GuidePayload }>('/api/v1/content/guide')

const guideContent = computed<GuideLocale>(() => {
  const raw = guideData.value?.data
  return raw?.en || raw?.de || raw || {}
})

const editableTitle = ref('')
const editableSubtitle = ref('')
const editMode = ref(false)
const saving = ref(false)
const showSaved = ref(false)

function stripHtml(str: string): string {
  return str.replace(/<[^>]*>/g, '').trim()
}

interface EditableStep {
  num: number
  editableTitle: string
  editableContent: string
}

const steps = ref<EditableStep[]>([])

const STEP_META = [
  { label: 'Prepare', icon: 'i-heroicons-wrench-screwdriver' },
  { label: 'Install', icon: 'i-heroicons-arrow-down-tray' },
  { label: 'Launch', icon: 'i-heroicons-play' },
  { label: 'Apply', icon: 'i-heroicons-sparkles' },
  { label: 'Alt Sync', icon: 'i-heroicons-users' },
  { label: 'Finish', icon: 'i-heroicons-check-badge' },
] as const

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

watch(guideContent, (src) => {
  if (!editMode.value) {
    editableTitle.value = stripHtml(src?.intro?.title || '')
    editableSubtitle.value = stripHtml(src?.intro?.text || '')
    steps.value = parseSteps(src?.steps)
  }
}, { immediate: true })

function renderGuideContent(text: string): string {
  return renderMarkdownToSafeHtml(text, { breaks: true })
}

function stepStage(idx: number) {
  return STEP_META[idx]?.label || `Phase ${idx + 1}`
}

function stepIcon(idx: number) {
  return STEP_META[idx]?.icon || 'i-heroicons-chevron-right'
}

function cancelEdit() {
  const src = guideContent.value
  editableTitle.value = stripHtml(src?.intro?.title || '')
  editableSubtitle.value = stripHtml(src?.intro?.text || '')
  steps.value = parseSteps(src?.steps)
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

<style scoped>
.guide-step { scroll-margin-top: 6rem; }

.guide-step-number {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.25rem;
  height: 2.25rem;
  border-radius: 0.75rem;
  font-size: 0.95rem;
  font-weight: 700;
  line-height: 1;
}

.guide-help-link {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  padding: 0.5rem 0.625rem;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  transition: color 0.15s ease, background-color 0.15s ease;
}
.guide-help-link--dark { color: #8090A4; }
.guide-help-link--dark:hover { color: #fff; background: rgba(255, 255, 255, 0.04); }
.guide-help-link--light { color: #4b5563; }
.guide-help-link--light:hover { color: #111827; background: rgb(239 246 255); }

.guide-content :deep(p) { margin-bottom: 0.7em; }
.guide-content :deep(p:last-child) { margin-bottom: 0; }
.guide-content :deep(strong) { font-weight: 700; color: inherit; }
.guide-content :deep(a) {
  color: var(--brand-400, #4e9eff);
  text-decoration: underline;
  text-underline-offset: 2px;
}
.guide-content :deep(a:hover) { opacity: 0.82; }
.guide-content :deep(ul), .guide-content :deep(ol) { padding-left: 1.25em; margin: 0.75em 0; }
.guide-content :deep(li) { margin-bottom: 0.35em; }
.guide-content :deep(li)::marker { color: rgba(59, 139, 255, 0.7); }
.guide-content :deep(h1), .guide-content :deep(h2), .guide-content :deep(h3), .guide-content :deep(h4) {
  font-weight: 700;
  line-height: 1.2;
  margin-top: 1em;
  margin-bottom: 0.45em;
  color: inherit;
}
.guide-content :deep(h1) { font-size: 1.35em; }
.guide-content :deep(h2) { font-size: 1.18em; }
.guide-content :deep(h3) { font-size: 1.05em; }
.guide-content :deep(code) {
  padding: 0.18em 0.42em;
  border-radius: 0.45rem;
  font-size: 0.85em;
  font-family: 'JetBrains Mono', monospace;
  background: rgba(59, 139, 255, 0.12);
  color: #93bbff;
}
:global(html.light) .guide-content :deep(code) {
  background: rgba(37, 99, 235, 0.08);
  color: #1d4ed8;
}
.guide-content :deep(pre) {
  margin: 0.9em 0;
  padding: 0.9rem 1rem;
  border-radius: 1rem;
  overflow-x: auto;
  background: rgba(4, 10, 20, 0.55);
  border: 1px solid rgba(59, 139, 255, 0.1);
}
:global(html.light) .guide-content :deep(pre) {
  background: rgba(241, 245, 249, 0.8);
  border-color: rgba(37, 99, 235, 0.12);
}
.guide-content :deep(pre code) { padding: 0; background: transparent; }
.guide-content :deep(blockquote) {
  border-left: 3px solid rgba(59, 139, 255, 0.35);
  padding-left: 1rem;
  margin: 0.8em 0;
  color: inherit;
  opacity: 0.9;
}
.guide-content :deep(hr) { margin: 1rem 0; border-color: rgba(59, 139, 255, 0.15); }

.bar-enter-active, .bar-leave-active { transition: all 0.25s ease; }
.bar-enter-from, .bar-leave-to { opacity: 0; transform: translateY(-8px); }

.toast-enter-active, .toast-leave-active { transition: all 0.3s ease; }
.toast-enter-from, .toast-leave-to { opacity: 0; transform: translate(-50%, 20px); }
</style>

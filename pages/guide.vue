<!--
  Guide Page — Installation instructions with improved hierarchy and markdown rendering
-->

<template>
  <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
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

    <section class="mb-8 sm:mb-10 fade-in">
      <div v-if="!editMode" class="max-w-4xl mx-auto text-center mb-7 sm:mb-8 heading-glow">
        <h1 class="text-4xl sm:text-5xl font-bold leading-tight mb-4 flex items-center justify-center gap-3">
          <span class="guide-heading-icon">
            <UIcon name="i-heroicons-book-open" class="w-7 h-7 sm:w-8 sm:h-8" />
          </span>
          <span class="text-gradient">{{ editableTitle || 'Installation Guide' }}</span>
        </h1>

        <p
          class="text-lg max-w-2xl mx-auto leading-relaxed"
          :class="isDark ? 'text-silver-400' : 'text-gray-500'"
        >
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

    <div v-if="steps.length" class="grid xl:grid-cols-[minmax(0,1fr)_320px] gap-8 xl:gap-10 items-start">
      <div class="space-y-5">
        <article
          v-for="(step, idx) in steps"
          :id="`step-${idx + 1}`"
          :key="step.num"
          class="guide-step group relative overflow-hidden rounded-[2rem] p-[1px] fade-in"
          :style="{ animationDelay: `${idx * 70}ms`, animationFillMode: 'both' }"
        >
          <div class="guide-step-aura" :style="stepAuraStyle(idx)" />

          <div
            class="relative rounded-[calc(2rem-1px)] p-5 sm:p-7 lg:p-8 transition-all"
            :class="isDark
              ? 'bg-[linear-gradient(160deg,rgba(10,20,40,0.96),rgba(9,18,35,0.92))] border border-brand-400/10 group-hover:border-brand-400/20'
              : 'bg-[linear-gradient(160deg,rgba(255,255,255,0.98),rgba(247,250,255,0.96))] border border-blue-100 group-hover:border-blue-200 group-hover:shadow-xl group-hover:shadow-blue-100/50'"
          >
            <div class="flex flex-col sm:flex-row sm:items-start gap-5 sm:gap-6">
              <div class="sm:w-24 sm:flex-shrink-0">
                <div class="guide-step-side flex flex-col items-center text-center gap-3">
                  <div class="guide-step-number" :style="stepNumberStyle(idx)">
                    {{ idx + 1 }}
                  </div>
                  <div class="guide-step-meta">
                    <p class="guide-step-stage text-[11px] font-semibold uppercase tracking-[0.22em]" :class="isDark ? 'text-silver-500' : 'text-gray-500'">
                      {{ stepStage(idx) }}
                    </p>
                    <span class="guide-step-icon" :style="stepIconStyle(idx)">
                      <UIcon :name="stepIcon(idx)" class="w-4 h-4" />
                    </span>
                  </div>
                </div>
              </div>

              <div class="flex-1 min-w-0">
                <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between mb-4">
                  <div class="min-w-0">
                    <p class="text-xs font-semibold uppercase tracking-[0.18em] mb-2" :style="{ color: stepAccent(idx).solid }">
                      Step {{ String(idx + 1).padStart(2, '0') }}
                    </p>
                    <h3 class="text-xl sm:text-2xl font-bold leading-tight" :class="isDark ? 'text-white' : 'text-gray-900'">
                      {{ step.editableTitle || `Step ${idx + 1}` }}
                    </h3>
                  </div>
                  <span
                    class="guide-step-chip inline-flex items-center self-start rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em]"
                    :style="stepChipStyle(idx)"
                  >
                    {{ idx === 0 ? 'Start Here' : idx === steps.length - 1 ? 'Finish' : 'Next Up' }}
                  </span>
                </div>

                <template v-if="!editMode">
                  <div
                    class="guide-content guide-step-body text-[15px] sm:text-base leading-relaxed"
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
          </div>
        </article>
      </div>

      <aside class="space-y-4 xl:sticky xl:top-28">
        <div class="glass-card rounded-[1.75rem] p-5 sm:p-6 fade-in">
          <p class="text-xs font-semibold uppercase tracking-[0.22em] mb-2" :class="isDark ? 'text-brand-300' : 'text-blue-600'">Quick Flow</p>
          <h2 class="text-xl font-bold mb-2" :class="isDark ? 'text-white' : 'text-gray-900'">Jump to any step</h2>
          <p class="text-sm leading-relaxed mb-5" :class="isDark ? 'text-silver-500' : 'text-gray-500'">
            Use this as a fast checklist while setting up your first character or re-checking a specific step.
          </p>

          <div class="space-y-2.5">
            <a
              v-for="(step, idx) in steps"
              :key="`jump-${step.num}`"
              :href="`#step-${idx + 1}`"
              class="guide-jump-link flex items-center gap-3 rounded-2xl px-3 py-3 transition-all"
              :class="isDark ? 'hover:bg-white/[0.04] border border-white/6' : 'hover:bg-blue-50 border border-blue-100'"
            >
              <span class="guide-jump-number" :style="stepNumberMiniStyle(idx)">
                {{ String(idx + 1).padStart(2, '0') }}
              </span>
              <span class="min-w-0 flex-1">
                <span class="block text-sm font-semibold truncate" :class="isDark ? 'text-white' : 'text-gray-900'">{{ step.editableTitle || `Step ${idx + 1}` }}</span>
                <span class="block text-[11px] uppercase tracking-[0.16em]" :class="isDark ? 'text-silver-600' : 'text-gray-400'">{{ stepStage(idx) }}</span>
              </span>
            </a>
          </div>
        </div>

        <div class="guide-help-card rounded-[1.75rem] p-5 sm:p-6 fade-in">
          <p class="text-xs font-semibold uppercase tracking-[0.22em] mb-2" :class="isDark ? 'text-emerald-300' : 'text-emerald-700'">After Setup</p>
          <h2 class="text-xl font-bold mb-3" :class="isDark ? 'text-white' : 'text-gray-900'">Where to go next</h2>
          <div class="space-y-3">
            <NuxtLink to="/strings" class="guide-mini-link">
              <UIcon name="i-heroicons-bolt" class="w-4 h-4" />
              <span>Browse import strings</span>
            </NuxtLink>
            <NuxtLink to="/strings?addon=WowUp" class="guide-mini-link">
              <UIcon name="i-heroicons-arrow-down-tray" class="w-4 h-4" />
              <span>Grab the WowUp package</span>
            </NuxtLink>
            <NuxtLink to="/faq" class="guide-mini-link">
              <UIcon name="i-heroicons-question-mark-circle" class="w-4 h-4" />
              <span>Check the FAQ</span>
            </NuxtLink>
          </div>
        </div>
      </aside>
    </div>

    <div v-else class="glass-card rounded-3xl p-14 text-center fade-in">
      <UIcon name="i-heroicons-book-open" class="w-12 h-12 mx-auto mb-4" :class="isDark ? 'text-silver-700' : 'text-gray-300'" />
      <p :class="isDark ? 'text-silver-500' : 'text-gray-500'">No guide steps available yet.</p>
      <NuxtLink v-if="isAdmin" to="/admin/content/guide" class="inline-flex items-center gap-1.5 mt-3 text-brand-400 hover:underline text-sm">
        Add steps in the editor
      </NuxtLink>
    </div>

    <div v-if="steps.length && !editMode" class="mt-14 fade-in">
      <div class="section-divider mb-10" />
      <div class="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
        <div>
          <p class="text-xs font-semibold uppercase tracking-[0.22em] mb-2" :class="isDark ? 'text-brand-300' : 'text-blue-600'">Next Moves</p>
          <h2 class="text-2xl sm:text-3xl font-bold" :class="isDark ? 'text-white' : 'text-gray-900'">Your setup is ready. Now make it yours.</h2>
        </div>
        <p class="text-sm max-w-md" :class="isDark ? 'text-silver-500' : 'text-gray-500'">
          Explore the strings, install the recommended addon pack, or answer the usual setup questions without leaving the site.
        </p>
      </div>

      <div class="grid md:grid-cols-3 gap-4">
        <NuxtLink to="/strings" class="guide-next-card group">
          <div class="guide-next-icon" :class="isDark ? 'bg-brand-400/12 text-brand-300' : 'bg-blue-50 text-blue-600'">
            <UIcon name="i-heroicons-bolt" class="w-5 h-5" />
          </div>
          <h3 class="text-lg font-semibold mb-2" :class="isDark ? 'text-white' : 'text-gray-900'">Import Strings</h3>
          <p class="text-sm leading-relaxed" :class="isDark ? 'text-silver-500' : 'text-gray-500'">Browse ready-to-use addon profiles for ElvUI, Plater, BigWigs, Details and more.</p>
        </NuxtLink>

        <NuxtLink to="/strings?addon=WowUp" class="guide-next-card group">
          <div class="guide-next-icon" :class="isDark ? 'bg-emerald-400/12 text-emerald-300' : 'bg-emerald-50 text-emerald-700'">
            <UIcon name="i-heroicons-archive-box-arrow-down" class="w-5 h-5" />
          </div>
          <h3 class="text-lg font-semibold mb-2" :class="isDark ? 'text-white' : 'text-gray-900'">WowUp Packages</h3>
          <p class="text-sm leading-relaxed" :class="isDark ? 'text-silver-500' : 'text-gray-500'">Install the recommended addon stack in one pass and keep your setup consistent.</p>
        </NuxtLink>

        <NuxtLink to="/faq" class="guide-next-card group">
          <div class="guide-next-icon" :class="isDark ? 'bg-amber-400/12 text-amber-300' : 'bg-amber-50 text-amber-700'">
            <UIcon name="i-heroicons-question-mark-circle" class="w-5 h-5" />
          </div>
          <h3 class="text-lg font-semibold mb-2" :class="isDark ? 'text-white' : 'text-gray-900'">Need Help?</h3>
          <p class="text-sm leading-relaxed" :class="isDark ? 'text-silver-500' : 'text-gray-500'">Open the FAQ for the common follow-up questions after your first install.</p>
        </NuxtLink>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { renderMarkdownToSafeHtml } from '~/utils/richText'

const toast = useToast()
const { apiFetch } = useApi()
const isDark = useIsDark()
const { isLoggedIn } = useAuth()
await usePublicPageSeo({
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

const STEP_ACCENTS = [
  { solid: '#3B8BFF', soft: 'rgba(59, 139, 255, 0.14)', glow: 'rgba(59, 139, 255, 0.24)', border: 'rgba(59, 139, 255, 0.35)' },
  { solid: '#14b8a6', soft: 'rgba(20, 184, 166, 0.14)', glow: 'rgba(20, 184, 166, 0.24)', border: 'rgba(20, 184, 166, 0.35)' },
  { solid: '#f59e0b', soft: 'rgba(245, 158, 11, 0.14)', glow: 'rgba(245, 158, 11, 0.22)', border: 'rgba(245, 158, 11, 0.35)' },
  { solid: '#8b5cf6', soft: 'rgba(139, 92, 246, 0.14)', glow: 'rgba(139, 92, 246, 0.22)', border: 'rgba(139, 92, 246, 0.35)' },
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

function stepAccent(idx: number) {
  return STEP_ACCENTS[idx % STEP_ACCENTS.length]
}

function stepStage(idx: number) {
  return STEP_META[idx]?.label || `Phase ${idx + 1}`
}

function stepIcon(idx: number) {
  return STEP_META[idx]?.icon || 'i-heroicons-chevron-right'
}

function stepAuraStyle(idx: number) {
  const accent = stepAccent(idx)
  return {
    background: `radial-gradient(circle at top right, ${accent.glow} 0%, transparent 56%)`,
  }
}

function stepNumberStyle(idx: number) {
  const accent = stepAccent(idx)
  return {
    '--step-solid': accent.solid,
    '--step-soft': accent.soft,
    '--step-glow': accent.glow,
    '--step-border': accent.border,
    color: accent.solid,
    borderColor: accent.border,
    background: isDark.value ? 'rgba(8, 16, 30, 0.92)' : 'rgba(255, 255, 255, 0.96)',
    boxShadow: `0 0 0 6px ${accent.soft}`,
  }
}

function stepIconStyle(idx: number) {
  const accent = stepAccent(idx)
  return {
    '--step-solid': accent.solid,
    '--step-soft': accent.soft,
    '--step-glow': accent.glow,
    '--step-border': accent.border,
    color: accent.solid,
    background: accent.soft,
    border: `1px solid ${accent.border}`,
  }
}

function stepChipStyle(idx: number) {
  const accent = stepAccent(idx)
  return {
    color: accent.solid,
    background: accent.soft,
    border: `1px solid ${accent.border}`,
  }
}

function stepNumberMiniStyle(idx: number) {
  const accent = stepAccent(idx)
  return {
    color: accent.solid,
    background: accent.soft,
    border: `1px solid ${accent.border}`,
  }
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
    const items: any[] = [
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
.guide-heading-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 3.25rem;
  height: 3.25rem;
  border-radius: 1rem;
  color: #60a5fa;
  background: rgba(59, 139, 255, 0.12);
  border: 1px solid rgba(59, 139, 255, 0.18);
  box-shadow: 0 0 40px rgba(59, 139, 255, 0.12);
  flex-shrink: 0;
}

:global(.light) .guide-heading-icon,
:global(html.light) .guide-heading-icon {
  color: #2563eb;
  background: rgba(255, 255, 255, 0.92);
  border-color: rgba(59, 139, 255, 0.14);
  box-shadow: 0 12px 30px rgba(37, 99, 235, 0.08);
}

.guide-step {
  scroll-margin-top: 7rem;
}

.guide-step-aura {
  position: absolute;
  inset: 0;
  opacity: 0.85;
  pointer-events: none;
}

.guide-step-number {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 3.4rem;
  height: 3.4rem;
  border-radius: 1.25rem;
  border: 1px solid transparent;
  font-size: 1.1rem;
  font-weight: 800;
  line-height: 1;
  transition: transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease, color 0.25s ease;
}

.guide-step-chip {
  backdrop-filter: blur(12px);
}

.guide-step-side {
  min-width: 5rem;
}

.guide-step-meta {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  text-align: center;
}

.guide-step-stage {
  line-height: 1;
  transition: color 0.25s ease, transform 0.25s ease;
}

.guide-step-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border-radius: 999px;
  transition: transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease;
}

.guide-step:hover .guide-step-number {
  transform: translateY(-1px) scale(1.04);
  box-shadow: 0 0 0 7px var(--step-soft), 0 0 26px var(--step-glow);
}

.guide-step:hover .guide-step-stage {
  color: var(--step-solid);
  transform: translateY(-1px);
}

.guide-step:hover .guide-step-icon {
  transform: translateY(-1px);
  box-shadow: 0 0 24px var(--step-glow);
}

.guide-jump-link {
  backdrop-filter: blur(12px);
}

.guide-jump-number {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 2.6rem;
  height: 2.1rem;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 800;
  letter-spacing: 0.08em;
}

.guide-help-card {
  background: linear-gradient(160deg, rgba(9, 34, 31, 0.88), rgba(8, 25, 24, 0.94));
  border: 1px solid rgba(16, 185, 129, 0.16);
  box-shadow: 0 18px 50px rgba(0, 0, 0, 0.22);
}

:global(.light) .guide-help-card,
:global(html.light) .guide-help-card {
  background: linear-gradient(160deg, rgba(236, 253, 245, 0.94), rgba(255, 255, 255, 0.98));
  border-color: rgba(16, 185, 129, 0.2);
  box-shadow: 0 18px 50px rgba(16, 185, 129, 0.08);
}

.guide-mini-link {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
  padding: 0.9rem 1rem;
  border-radius: 1rem;
  transition: all 0.2s ease;
  color: #d7e0ea;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.guide-mini-link:hover {
  transform: translateY(-1px);
  color: white;
  background: rgba(255, 255, 255, 0.07);
  border-color: rgba(255, 255, 255, 0.12);
}

:global(.light) .guide-mini-link,
:global(html.light) .guide-mini-link {
  color: #111827;
  background: rgba(255, 255, 255, 0.8);
  border-color: rgba(16, 185, 129, 0.12);
}

:global(.light) .guide-mini-link:hover,
:global(html.light) .guide-mini-link:hover {
  color: #065f46;
  background: white;
  border-color: rgba(16, 185, 129, 0.2);
}

.guide-next-card {
  display: block;
  padding: 1.5rem;
  border-radius: 1.5rem;
  transition: all 0.25s ease;
  background: linear-gradient(160deg, rgba(11, 24, 45, 0.95), rgba(9, 18, 34, 0.92));
  border: 1px solid rgba(59, 139, 255, 0.1);
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.18);
}

.guide-next-card:hover {
  transform: translateY(-3px);
  border-color: rgba(59, 139, 255, 0.18);
  box-shadow: 0 22px 50px rgba(0, 0, 0, 0.24);
}

:global(.light) .guide-next-card,
:global(html.light) .guide-next-card {
  background: linear-gradient(160deg, rgba(255, 255, 255, 0.98), rgba(245, 248, 255, 0.96));
  border-color: rgba(59, 139, 255, 0.12);
  box-shadow: 0 16px 40px rgba(37, 99, 235, 0.08);
}

:global(.light) .guide-next-card:hover,
:global(html.light) .guide-next-card:hover {
  border-color: rgba(59, 139, 255, 0.2);
  box-shadow: 0 22px 50px rgba(37, 99, 235, 0.12);
}

.guide-next-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 3rem;
  height: 3rem;
  border-radius: 1rem;
  margin-bottom: 1rem;
}

.guide-step-body {
  font-size: 1rem;
}

.guide-content :deep(p) {
  margin-bottom: 0.7em;
}

.guide-content :deep(p:last-child) {
  margin-bottom: 0;
}

.guide-content :deep(strong) {
  font-weight: 700;
  color: inherit;
}

.guide-content :deep(a) {
  color: var(--brand-400, #4e9eff);
  text-decoration: underline;
  text-underline-offset: 2px;
}

.guide-content :deep(a:hover) {
  opacity: 0.82;
}

.guide-content :deep(ul),
.guide-content :deep(ol) {
  padding-left: 1.25em;
  margin: 0.75em 0;
}

.guide-content :deep(li) {
  margin-bottom: 0.35em;
}

.guide-content :deep(li)::marker {
  color: rgba(59, 139, 255, 0.7);
}

.guide-content :deep(h1),
.guide-content :deep(h2),
.guide-content :deep(h3),
.guide-content :deep(h4) {
  font-weight: 700;
  line-height: 1.2;
  margin-top: 1em;
  margin-bottom: 0.45em;
  color: inherit;
}

.guide-content :deep(h1) {
  font-size: 1.35em;
}

.guide-content :deep(h2) {
  font-size: 1.18em;
}

.guide-content :deep(h3) {
  font-size: 1.05em;
}

.guide-content :deep(code) {
  padding: 0.18em 0.42em;
  border-radius: 0.45rem;
  font-size: 0.85em;
  font-family: 'JetBrains Mono', monospace;
  background: rgba(59, 139, 255, 0.12);
  color: #93bbff;
}

.guide-content :deep(pre) {
  margin: 0.9em 0;
  padding: 0.9rem 1rem;
  border-radius: 1rem;
  overflow-x: auto;
  background: rgba(4, 10, 20, 0.55);
  border: 1px solid rgba(59, 139, 255, 0.1);
}

.guide-content :deep(pre code) {
  padding: 0;
  background: transparent;
}

.guide-content :deep(blockquote) {
  border-left: 3px solid rgba(59, 139, 255, 0.35);
  padding-left: 1rem;
  margin: 0.8em 0;
  color: inherit;
  opacity: 0.9;
}

.guide-content :deep(hr) {
  margin: 1rem 0;
  border-color: rgba(59, 139, 255, 0.15);
}

.bar-enter-active,
.bar-leave-active {
  transition: all 0.25s ease;
}

.bar-enter-from,
.bar-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translate(-50%, 20px);
}

@media (max-width: 640px) {
  .guide-heading-icon {
    width: 2.75rem;
    height: 2.75rem;
    border-radius: 0.9rem;
  }

  .guide-step-number {
    width: 3rem;
    height: 3rem;
    border-radius: 1rem;
  }
}
</style>

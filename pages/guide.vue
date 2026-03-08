<!--
  Guide Page — Installation instructions with numbered steps
  Unified heading style (blue icon + text-gradient), wider layout, edit mode toggle
-->

<template>
  <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">

    <!-- Admin toolbar -->
    <div v-if="isAdmin" class="flex items-center justify-end gap-2 mb-4 fade-in">
      <template v-if="editMode">
        <button @click="saveAll" :disabled="saving"
          class="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-white transition-all"
          :class="saving ? 'bg-brand-400/60 cursor-wait' : 'bg-brand-400 hover:bg-brand-500'">
          <svg v-if="saving" class="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
          <svg v-else class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
          Save
        </button>
        <button @click="cancelEdit"
          class="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all"
          :class="isDark ? 'text-silver-400 hover:text-white hover:bg-white/5 border border-brand-400/15' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100 border border-gray-200'">
          Cancel
        </button>
      </template>
      <template v-else>
        <button @click="editMode = true"
          class="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all"
          :class="isDark ? 'bg-brand-400/10 text-brand-400 hover:bg-brand-400/20 border border-brand-400/20' : 'bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200'">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" /></svg>
          Edit Page
        </button>
        <NuxtLink to="/admin/content/guide"
          class="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all"
          :class="isDark ? 'bg-white/5 text-silver-400 hover:text-white hover:bg-white/10 border border-brand-400/15' : 'bg-gray-100 text-gray-500 hover:text-gray-900 hover:bg-gray-200 border border-gray-200'">
          Full Editor
        </NuxtLink>
      </template>
    </div>

    <!-- Edit mode indicator -->
    <Transition name="bar">
      <div v-if="editMode" class="flex items-center gap-2 mb-4 px-3 py-2 rounded-lg"
        :class="isDark ? 'bg-brand-400/10 border border-brand-400/20' : 'bg-blue-50 border border-blue-200'">
        <span class="inline-block w-1.5 h-1.5 rounded-full bg-brand-400 animate-pulse" />
        <span class="text-xs font-medium" :class="isDark ? 'text-brand-400' : 'text-blue-600'">Edit mode — change text below, then click Save</span>
      </div>
    </Transition>

    <!-- Saved toast -->
    <Transition name="toast">
      <div v-if="showSaved"
        class="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl shadow-lg border backdrop-blur-xl"
        :class="isDark ? 'bg-emerald-900/80 border-emerald-400/20 text-emerald-300' : 'bg-emerald-50 border-emerald-200 text-emerald-700'">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
        <span class="text-sm font-medium">Changes saved</span>
      </div>
    </Transition>

    <!-- ═══ HEADER (unified with strings/changelog) ═══ -->
    <div class="text-center mb-12 fade-in heading-glow">
      <!-- Display mode -->
      <template v-if="!editMode">
        <h1 class="text-4xl sm:text-5xl font-bold mb-4 flex items-center justify-center gap-3">
          <svg class="w-8 h-8 text-brand-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
          </svg>
          <span class="text-gradient">{{ editableTitle || 'Installation Guide' }}</span>
        </h1>
        <p class="text-lg" :class="isDark ? 'text-silver-500' : 'text-gray-500'">
          {{ editableSubtitle || 'Set up MagguuUI in just a few minutes.' }}
        </p>
      </template>
      <!-- Edit mode -->
      <template v-else>
        <div class="max-w-2xl mx-auto space-y-3">
          <div>
            <label class="block text-xs font-medium mb-1.5 text-left" :class="isDark ? 'text-silver-500' : 'text-gray-400'">Page Title</label>
            <input v-model="editableTitle"
              class="w-full text-2xl font-bold text-center rounded-lg px-4 py-2 border-2 transition-colors outline-none"
              :class="isDark ? 'bg-brand-800/50 text-white border-brand-400/30 focus:border-brand-400' : 'bg-white text-gray-900 border-blue-200 focus:border-blue-500'" />
          </div>
          <div>
            <label class="block text-xs font-medium mb-1.5 text-left" :class="isDark ? 'text-silver-500' : 'text-gray-400'">Subtitle</label>
            <textarea v-model="editableSubtitle" rows="2"
              class="w-full text-base text-center rounded-lg px-4 py-2 border-2 transition-colors outline-none resize-none"
              :class="isDark ? 'bg-brand-800/50 text-silver-300 border-brand-400/30 focus:border-brand-400' : 'bg-white text-gray-600 border-blue-200 focus:border-blue-500'" />
          </div>
        </div>
      </template>
    </div>

    <!-- Section Divider -->
    <div v-if="steps.length" class="section-divider mb-8" />

    <!-- ═══ STEPS ═══ -->
    <div v-if="steps.length" class="relative">
      <!-- Vertical connector line -->
      <div class="absolute left-5 sm:left-6 top-8 bottom-8 w-px"
        :class="isDark ? 'bg-gradient-to-b from-brand-400/30 via-brand-400/15 to-transparent' : 'bg-gradient-to-b from-blue-300/50 via-blue-200/30 to-transparent'" />

      <div class="space-y-4">
        <div v-for="(step, idx) in steps" :key="step.num"
          class="group relative flex gap-4 sm:gap-5 pl-1 fade-in"
          :style="{ animationDelay: `${idx * 80}ms`, animationFillMode: 'both' }">

          <!-- Step number circle — gray by default, glow on hover -->
          <div class="relative z-10 flex-shrink-0 w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300"
            :class="stepCircleClass()">
            <span>{{ idx + 1 }}</span>
          </div>

          <!-- Step content card -->
          <div class="flex-1 min-w-0 pb-3 -mt-0.5">
            <div class="glass-card rounded-2xl p-5 sm:p-7 transition-all hover:border-brand-400/15 hover:shadow-lg hover:shadow-brand-400/5">

              <!-- DISPLAY MODE -->
              <template v-if="!editMode">
                <h3 v-if="step.editableTitle" class="font-semibold text-base sm:text-lg mb-2"
                  :class="isDark ? 'text-white' : 'text-gray-900'">
                  {{ step.editableTitle }}
                </h3>
                <div class="guide-content text-sm leading-relaxed"
                  :class="isDark ? 'text-silver-400' : 'text-gray-600'"
                  v-html="step.editableContent" />
              </template>

              <!-- EDIT MODE (TipTapEditor wrapped in ClientOnly for SSR safety) -->
              <template v-else>
                <div class="space-y-3">
                  <div>
                    <label class="block text-xs font-medium mb-1" :class="isDark ? 'text-silver-500' : 'text-gray-400'">Step {{ idx + 1 }} Title</label>
                    <input v-model="step.editableTitle"
                      class="w-full font-semibold rounded-lg px-3 py-2 border-2 transition-colors outline-none"
                      :class="isDark ? 'bg-brand-800/50 text-white border-brand-400/30 focus:border-brand-400' : 'bg-white text-gray-900 border-blue-200 focus:border-blue-500'" />
                  </div>
                  <div>
                    <label class="block text-xs font-medium mb-1" :class="isDark ? 'text-silver-500' : 'text-gray-400'">Content</label>
                    <ClientOnly>
                      <TipTapEditor v-model="step.editableContent" placeholder="Step content..." min-height="100px" />
                    </ClientOnly>
                  </div>
                </div>
              </template>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty state -->
    <div v-else class="text-center py-16 fade-in">
      <p :class="isDark ? 'text-silver-600' : 'text-gray-400'">No guide steps available yet.</p>
      <NuxtLink v-if="isAdmin" to="/admin/content/guide" class="inline-flex items-center gap-1.5 mt-3 text-brand-400 hover:underline text-sm">
        Add steps in the editor →
      </NuxtLink>
    </div>

    <!-- Bottom Cards -->
    <div v-if="steps.length && !editMode" class="mt-14 fade-in">
      <div class="section-divider mb-10" />
      <div class="text-center mb-8">
        <p class="text-lg font-semibold" :class="isDark ? 'text-white' : 'text-gray-900'">
          That's it — enjoy your new UI! 🎉
        </p>
        <p class="text-sm mt-1" :class="isDark ? 'text-silver-500' : 'text-gray-500'">Here's what to do next</p>
      </div>
      <div class="grid md:grid-cols-3 gap-4">
        <NuxtLink to="/strings"
          class="feature-card rounded-2xl p-6 group transition-all block">
          <div class="w-12 h-12 rounded-xl bg-brand-400/10 flex items-center justify-center mb-4 group-hover:bg-brand-400/15 transition-colors">
            <span class="text-xl">⚡</span>
          </div>
          <h3 class="text-base font-semibold text-gradient-subtle mb-2">Import Strings</h3>
          <p class="text-sm" :class="isDark ? 'text-silver-500' : 'text-gray-500'">Browse and copy pre-configured addon profiles for ElvUI, Plater, BigWigs & more.</p>
        </NuxtLink>
        <NuxtLink to="/strings?addon=WowUp"
          class="feature-card rounded-2xl p-6 group transition-all block">
          <div class="w-12 h-12 rounded-xl bg-brand-400/10 flex items-center justify-center mb-4 group-hover:bg-brand-400/15 transition-colors">
            <span class="text-xl">📦</span>
          </div>
          <h3 class="text-base font-semibold text-gradient-subtle mb-2">WowUp Packages</h3>
          <p class="text-sm" :class="isDark ? 'text-silver-500' : 'text-gray-500'">Install the complete addon package with one click via WowUp.</p>
        </NuxtLink>
        <NuxtLink to="/faq"
          class="feature-card rounded-2xl p-6 group transition-all block">
          <div class="w-12 h-12 rounded-xl bg-brand-400/10 flex items-center justify-center mb-4 group-hover:bg-brand-400/15 transition-colors">
            <span class="text-xl">❓</span>
          </div>
          <h3 class="text-base font-semibold text-gradient-subtle mb-2">Need Help?</h3>
          <p class="text-sm" :class="isDark ? 'text-silver-500' : 'text-gray-500'">Check the FAQ for common questions or reach out for support.</p>
        </NuxtLink>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const toast = useToast()
const { apiFetch } = useApi()
const isDark = useIsDark()
const { isLoggedIn } = useAuth()
const isAdmin = computed(() => { if (import.meta.server) return false; return isLoggedIn.value })

useHead({ title: 'Installation Guide — MagguuUI' })

// ─── SSR-safe data fetch (like strings.vue, changelog.vue) ───
const { data: guideData, refresh: refreshGuide } = await useFetch('/api/v1/content/guide')

const guideContent = computed(() => {
  const raw = (guideData.value as any)?.data
  return raw?.en || raw?.de || raw || {}
})

// ─── Editable state ───
const editableTitle = ref('')
const editableSubtitle = ref('')
const editMode = ref(false)
const saving = ref(false)
const showSaved = ref(false)

function stripHtml(str: string): string { return str.replace(/<[^>]*>/g, '').trim() }

interface EditableStep { num: number; editableTitle: string; editableContent: string }
const steps = ref<EditableStep[]>([])

function parseSteps(raw: Record<string, string> | undefined): EditableStep[] {
  if (!raw || typeof raw !== 'object') return []
  const keys = Object.keys(raw)
  const nums = [...new Set(keys.map(k => { const m = k.match(/^step_(\d+)/); return m ? parseInt(m[1]) : 0 }).filter(n => n > 0))].sort((a, b) => a - b)
  return nums.map(n => ({
    num: n,
    editableTitle: stripHtml(raw[`step_${n}_title`] || ''),
    editableContent: raw[`step_${n}`] || raw[`step_${n}_content`] || '',
  })).filter(s => s.editableContent || s.editableTitle)
}

// Sync editable fields when data arrives/changes (but not during edit mode)
watch(guideContent, (src) => {
  if (!editMode.value) {
    editableTitle.value = stripHtml(src?.intro?.title || '')
    editableSubtitle.value = stripHtml(src?.intro?.text || '')
    steps.value = parseSteps(src?.steps)
  }
}, { immediate: true })

// ─── Step circle style: all gray, glow only on hover ───
function stepCircleClass() {
  return isDark.value
    ? 'bg-brand-900 border-2 border-brand-400/20 text-silver-600 group-hover:border-brand-400 group-hover:text-brand-400 group-hover:shadow-lg group-hover:shadow-brand-400/30'
    : 'bg-white border-2 border-gray-200 text-gray-400 shadow-sm group-hover:border-blue-500 group-hover:text-blue-600 group-hover:shadow-lg group-hover:shadow-blue-200'
}

// ─── Admin edit functions ───
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
      const n = idx + 1
      items.push({ page: 'guide', section: 'steps', key: `step_${n}_title`, value: step.editableTitle, locale: 'en' })
      items.push({ page: 'guide', section: 'steps', key: `step_${n}`, value: step.editableContent, locale: 'en' })
    })
    await apiFetch('/api/v1/admin/content/bulk', { method: 'POST', body: { items } })
    editMode.value = false
    showSaved.value = true
    setTimeout(() => { showSaved.value = false }, 2500)
    await refreshGuide()
  } catch { toast.add({ title: 'Error saving', color: 'error' }) }
  finally { saving.value = false }
}
</script>

<style scoped>
.guide-content :deep(p) { margin-bottom: 0.4em; }
.guide-content :deep(p:last-child) { margin-bottom: 0; }
.guide-content :deep(strong) { font-weight: 600; }
.guide-content :deep(a) { color: var(--brand-400, #4e9eff); text-decoration: underline; text-underline-offset: 2px; }
.guide-content :deep(a:hover) { opacity: 0.8; }
.guide-content :deep(ul), .guide-content :deep(ol) { padding-left: 1.25em; margin: 0.4em 0; }
.guide-content :deep(li) { margin-bottom: 0.2em; }
.guide-content :deep(li)::marker { color: rgba(127, 127, 127, 0.5); }
.guide-content :deep(h1), .guide-content :deep(h2), .guide-content :deep(h3), .guide-content :deep(h4) { font-weight: 600; margin-top: 0.6em; margin-bottom: 0.3em; }
.guide-content :deep(h1) { font-size: 1.25em; }
.guide-content :deep(h2) { font-size: 1.125em; }
.guide-content :deep(h3) { font-size: 1em; }
.guide-content :deep(code) { padding: 0.15em 0.35em; border-radius: 4px; font-size: 0.85em; background: rgba(127, 127, 127, 0.12); }
.guide-content :deep(blockquote) { border-left: 3px solid rgba(127, 127, 127, 0.3); padding-left: 0.75em; margin: 0.5em 0; opacity: 0.85; }

.bar-enter-active, .bar-leave-active { transition: all 0.25s ease; }
.bar-enter-from, .bar-leave-to { opacity: 0; transform: translateY(-8px); }
.toast-enter-active, .toast-leave-active { transition: all 0.3s ease; }
.toast-enter-from, .toast-leave-to { opacity: 0; transform: translate(-50%, 20px); }
</style>

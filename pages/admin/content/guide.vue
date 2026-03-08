<!--
  Admin — Guide Content Editor
  Dynamic steps with TipTap rich text, drag-to-reorder, live preview
  Sticky save bar with change tracking, entrance animations
-->

<template>
  <div class="max-w-5xl mx-auto">
    <!-- Sticky Save Bar (appears only when changes exist) -->
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0 -translate-y-2"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 -translate-y-2"
    >
      <div v-if="hasChanges" class="sticky top-16 z-10 mb-4 -mx-4 lg:-mx-8 px-4 lg:px-8 py-3"
        :class="isDark ? 'bg-brand-900/95 backdrop-blur-xl border-b border-brand-400/10' : 'bg-white/95 backdrop-blur-xl border-b border-gray-200 shadow-sm'">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span class="relative flex h-2 w-2">
              <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
              <span class="relative inline-flex rounded-full h-2 w-2 bg-amber-400" />
            </span>
            <span class="text-sm font-medium" :class="isDark ? 'text-amber-400' : 'text-amber-600'">Unsaved changes</span>
          </div>
          <UButton @click="save" :loading="saving" icon="i-heroicons-check" size="sm">Save</UButton>
        </div>
      </div>
    </Transition>

    <!-- Header Bar -->
    <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 admin-fade-in admin-stagger-1">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          :class="isDark ? 'bg-green-500/10' : 'bg-green-50'">
          <UIcon name="i-heroicons-book-open" class="w-5 h-5 text-green-500" />
        </div>
        <div>
          <h2 class="text-lg font-semibold" :class="isDark ? 'text-white' : 'text-gray-900'">Installation Guide</h2>
          <p class="text-xs" :class="isDark ? 'text-silver-500' : 'text-gray-500'">{{ form.steps.length }} steps</p>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <!-- Tab Toggle -->
        <div class="flex items-center gap-0.5 p-0.5 rounded-lg" :class="isDark ? 'bg-white/[0.04]' : 'bg-gray-100'">
          <button @click="tab = 'edit'" class="px-3 py-1.5 text-xs font-medium rounded-md transition-all"
            :class="tab === 'edit'
              ? (isDark ? 'bg-brand-400/15 text-brand-400' : 'bg-white text-brand-600 shadow-sm')
              : (isDark ? 'text-silver-500 hover:text-white' : 'text-gray-500 hover:text-gray-900')">
            Edit
          </button>
          <button @click="tab = 'preview'" class="px-3 py-1.5 text-xs font-medium rounded-md transition-all"
            :class="tab === 'preview'
              ? (isDark ? 'bg-brand-400/15 text-brand-400' : 'bg-white text-brand-600 shadow-sm')
              : (isDark ? 'text-silver-500 hover:text-white' : 'text-gray-500 hover:text-gray-900')">
            Preview
          </button>
        </div>
        <UButton @click="save" :loading="saving" icon="i-heroicons-check" size="sm">Save</UButton>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="glass rounded-xl p-12 text-center">
      <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 text-brand-400 animate-spin mx-auto" />
    </div>

    <!-- EDIT MODE -->
    <div v-else-if="tab === 'edit'" class="space-y-5">
      <!-- Introduction -->
      <div class="glass rounded-xl p-5 admin-fade-in admin-stagger-2">
        <div class="flex items-center gap-2.5 mb-4">
          <div class="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
            :class="isDark ? 'bg-purple-500/10' : 'bg-purple-50'">
            <UIcon name="i-heroicons-sparkles" class="w-3.5 h-3.5 text-purple-400" />
          </div>
          <h3 class="text-sm font-semibold" :class="isDark ? 'text-silver-200' : 'text-gray-800'">Introduction</h3>
        </div>
        <div class="grid sm:grid-cols-[1fr_2fr] gap-4">
          <div>
            <label class="block text-xs font-medium mb-1" :class="labelClass">Title</label>
            <UInput v-model="form.introTitle" :disabled="saving" placeholder="Installation Guide" />
          </div>
          <div>
            <label class="block text-xs font-medium mb-1" :class="labelClass">Subtitle</label>
            <UInput v-model="form.introText" :disabled="saving" placeholder="Short description text..." />
          </div>
        </div>
      </div>

      <!-- Steps -->
      <div class="admin-fade-in admin-stagger-3">
        <div class="flex items-center justify-between mb-3">
          <h3 class="text-sm font-semibold" :class="isDark ? 'text-silver-200' : 'text-gray-800'">Steps</h3>
          <button @click="addStep"
            class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-all"
            :class="isDark
              ? 'text-brand-400 hover:bg-brand-400/10'
              : 'text-blue-600 hover:bg-blue-50'">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
            Add Step
          </button>
        </div>

        <TransitionGroup name="step-list" tag="div" class="space-y-3">
          <div v-for="(step, idx) in form.steps" :key="step.id"
            class="glass rounded-xl overflow-hidden group transition-all"
            :class="isDark ? 'hover:border-brand-400/10' : 'hover:border-gray-300'">

            <!-- Step Header Bar -->
            <div class="flex items-center gap-2 px-4 py-2.5 border-b transition-colors"
              :class="isDark ? 'border-brand-400/5 bg-white/[0.01]' : 'border-gray-100 bg-gray-50/50'">

              <!-- Drag handle -->
              <button class="cursor-grab active:cursor-grabbing p-0.5 rounded opacity-30 group-hover:opacity-60 transition-opacity"
                :class="isDark ? 'text-silver-500 hover:text-silver-300' : 'text-gray-400 hover:text-gray-600'"
                @mousedown="startDrag(idx, $event)"
                title="Drag to reorder">
                <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 16 16"><circle cx="4" cy="3" r="1.5"/><circle cx="12" cy="3" r="1.5"/><circle cx="4" cy="8" r="1.5"/><circle cx="12" cy="8" r="1.5"/><circle cx="4" cy="13" r="1.5"/><circle cx="12" cy="13" r="1.5"/></svg>
              </button>

              <!-- Step number badge -->
              <span class="w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                :class="isDark ? 'bg-brand-400/10 text-brand-400' : 'bg-blue-100 text-blue-600'">
                {{ idx + 1 }}
              </span>

              <!-- Step title input -->
              <UInput v-model="step.title" :disabled="saving" placeholder="Step title..." size="sm" class="flex-1" />

              <!-- Actions -->
              <div class="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <button v-if="idx > 0"
                  class="p-1 rounded transition-colors"
                  :class="isDark ? 'text-silver-600 hover:text-white hover:bg-white/5' : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'"
                  title="Move up" @click="moveStep(idx, -1)">
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" /></svg>
                </button>
                <button v-if="idx < form.steps.length - 1"
                  class="p-1 rounded transition-colors"
                  :class="isDark ? 'text-silver-600 hover:text-white hover:bg-white/5' : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'"
                  title="Move down" @click="moveStep(idx, 1)">
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" /></svg>
                </button>
                <button v-if="form.steps.length > 1"
                  class="p-1 rounded transition-colors"
                  :class="isDark ? 'text-red-400/50 hover:text-red-400 hover:bg-red-400/10' : 'text-red-300 hover:text-red-500 hover:bg-red-50'"
                  title="Remove step" @click="removeStep(idx)">
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
                </button>
              </div>
            </div>

            <!-- Step Content -->
            <div class="p-4">
              <TipTapEditor v-model="step.content" placeholder="Describe this step..." min-height="100px" />
            </div>
          </div>
        </TransitionGroup>
      </div>
    </div>

    <!-- PREVIEW MODE -->
    <div v-else-if="tab === 'preview'" class="admin-fade-in admin-stagger-2 max-w-4xl mx-auto">
      <!-- Header -->
      <div class="text-center mb-12">
        <h1 class="text-4xl sm:text-5xl font-bold mb-4 flex items-center justify-center gap-3">
          <svg class="w-8 h-8 text-brand-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
          </svg>
          <span class="text-gradient">{{ form.introTitle || 'Installation Guide' }}</span>
        </h1>
        <p class="text-lg" :class="isDark ? 'text-silver-500' : 'text-gray-500'">
          {{ form.introText || 'No subtitle set' }}
        </p>
      </div>

      <!-- Section Divider -->
      <div class="section-divider mb-8" />

      <!-- Steps — Vertical timeline -->
      <div class="relative">
        <!-- Vertical connector line -->
        <div class="absolute left-5 sm:left-6 top-8 bottom-8 w-px"
          :class="isDark ? 'bg-gradient-to-b from-brand-400/30 via-brand-400/15 to-transparent' : 'bg-gradient-to-b from-blue-300/50 via-blue-200/30 to-transparent'" />

        <div class="space-y-4">
          <div v-for="(step, idx) in form.steps" :key="step.id"
            class="group relative flex gap-4 sm:gap-5 pl-1">

            <!-- Step number circle -->
            <div class="relative z-10 flex-shrink-0 w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300"
              :class="isDark
                ? 'bg-brand-900 border-2 border-brand-400/20 text-silver-600 group-hover:border-brand-400 group-hover:text-brand-400 group-hover:shadow-lg group-hover:shadow-brand-400/30'
                : 'bg-white border-2 border-gray-200 text-gray-400 shadow-sm group-hover:border-blue-500 group-hover:text-blue-600 group-hover:shadow-lg group-hover:shadow-blue-200'">
              {{ idx + 1 }}
            </div>

            <!-- Step content card -->
            <div class="flex-1 min-w-0 pb-3 -mt-0.5">
              <div class="glass-card rounded-2xl p-5 sm:p-7 transition-all hover:border-brand-400/15 hover:shadow-lg hover:shadow-brand-400/5">
                <h3 v-if="step.title" class="font-semibold text-base sm:text-lg mb-2"
                  :class="isDark ? 'text-white' : 'text-gray-900'">
                  {{ step.title }}
                </h3>
                <div class="guide-content text-sm leading-relaxed"
                  :class="isDark ? 'text-silver-400' : 'text-gray-600'"
                  v-html="step.content || '<em>No content</em>'" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Bottom Cards Preview -->
      <div class="mt-12 pt-8 border-t" :class="isDark ? 'border-brand-400/10' : 'border-gray-200'">
        <div class="grid md:grid-cols-3 gap-4">
          <div v-for="card in previewBottomCards" :key="card.title"
            class="feature-card rounded-2xl p-6 group transition-all">
            <div class="w-12 h-12 rounded-xl bg-brand-400/10 flex items-center justify-center mb-4 group-hover:bg-brand-400/15 transition-colors">
              <span class="text-xl">{{ card.emoji }}</span>
            </div>
            <h3 class="text-base font-semibold text-gradient-subtle mb-2">{{ card.title }}</h3>
            <p class="text-sm" :class="isDark ? 'text-silver-500' : 'text-gray-500'">{{ card.desc }}</p>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'admin' })

const toast = useToast()
const { apiFetch } = useApi()
const isDark = useIsDark()
const labelClass = computed(() => isDark.value ? 'text-silver-400' : 'text-gray-500')

const previewBottomCards = [
  { emoji: '⚡', title: 'Import Strings', desc: 'Browse and copy pre-configured addon profiles for ElvUI, Plater, BigWigs & more.' },
  { emoji: '📦', title: 'WowUp Packages', desc: 'Install the complete addon package with one click via WowUp.' },
  { emoji: '❓', title: 'Need Help?', desc: 'Check the FAQ for common questions or reach out for support.' },
]

const loading = ref(true)
const saving = ref(false)
const tab = ref<'edit' | 'preview'>('edit')

let nextStepId = 1
let originalStepKeys: string[] = []

interface Step {
  id: number
  title: string
  content: string
}

const form = reactive({
  introTitle: '',
  introText: '',
  steps: [] as Step[],
})

// Change tracking
const originalData = ref('')

function serializeForm(): string {
  return JSON.stringify({
    introTitle: form.introTitle,
    introText: form.introText,
    steps: form.steps.map(s => ({ title: s.title, content: s.content })),
  })
}

const hasChanges = computed(() => {
  if (loading.value || !originalData.value) return false
  return serializeForm() !== originalData.value
})

function snapshotOriginal() {
  originalData.value = serializeForm()
}

function stripHtml(str: string): string {
  return str.replace(/<[^>]*>/g, '').trim()
}

function addStep() {
  form.steps.push({ id: nextStepId++, title: '', content: '' })
}

function removeStep(idx: number) {
  form.steps.splice(idx, 1)
}

function moveStep(idx: number, direction: number) {
  const newIdx = idx + direction
  if (newIdx < 0 || newIdx >= form.steps.length) return
  const [item] = form.steps.splice(idx, 1)
  form.steps.splice(newIdx, 0, item)
}

// Simple drag-to-reorder
let dragIdx = -1
function startDrag(idx: number, e: MouseEvent) {
  dragIdx = idx
  const startY = e.clientY
  const onMove = (ev: MouseEvent) => {
    const diff = ev.clientY - startY
    const stepHeight = 200 // approximate
    const steps = Math.round(diff / stepHeight)
    if (steps !== 0 && dragIdx + steps >= 0 && dragIdx + steps < form.steps.length) {
      moveStep(dragIdx, steps)
      dragIdx += steps
    }
  }
  const onUp = () => {
    dragIdx = -1
    window.removeEventListener('mousemove', onMove)
    window.removeEventListener('mouseup', onUp)
  }
  window.addEventListener('mousemove', onMove)
  window.addEventListener('mouseup', onUp)
}

async function load() {
  loading.value = true
  try {
    const data = await apiFetch<Record<string, Record<string, Record<string, string>>>>('/api/v1/admin/content/guide')
    const src = data?.en || data?.de || data

    // Load intro
    if (src?.intro) {
      form.introTitle = stripHtml(src.intro.title || '')
      form.introText = stripHtml(src.intro.text || '')
    }

    // Parse steps dynamically
    if (src?.steps) {
      originalStepKeys = Object.keys(src.steps)

      // Find unique step numbers
      const stepNums = [...new Set(originalStepKeys.map(k => {
        const m = k.match(/^step_(\d+)/)
        return m ? parseInt(m[1]) : 0
      }).filter(n => n > 0))].sort((a, b) => a - b)

      if (stepNums.length > 0) {
        form.steps = stepNums.map(n => {
          const content = src.steps[`step_${n}`] || src.steps[`step_${n}_content`] || ''
          const title = src.steps[`step_${n}_title`] || ''
          return { id: nextStepId++, title: stripHtml(title), content }
        }).filter(s => s.content || s.title)
      }
    }

    // Fallback: at least one empty step
    if (form.steps.length === 0) {
      form.steps = [{ id: nextStepId++, title: '', content: '' }]
    }
  } catch {
    form.steps = [{ id: nextStepId++, title: '', content: '' }]
  } finally {
    loading.value = false
    nextTick(() => snapshotOriginal())
  }
}

onMounted(load)

async function save() {
  saving.value = true
  try {
    const items: any[] = [
      { page: 'guide', section: 'intro', key: 'title', value: form.introTitle, locale: 'en' },
      { page: 'guide', section: 'intro', key: 'text', value: form.introText, locale: 'en' },
    ]

    // Save steps
    form.steps.forEach((step, idx) => {
      const n = idx + 1
      items.push({ page: 'guide', section: 'steps', key: `step_${n}_title`, value: step.title, locale: 'en' })
      items.push({ page: 'guide', section: 'steps', key: `step_${n}`, value: step.content, locale: 'en' })
    })

    // Cleanup old keys
    const currentKeys = new Set(items.filter(i => i.section === 'steps').map(i => i.key))
    for (const key of originalStepKeys) {
      if (!currentKeys.has(key)) {
        items.push({ page: 'guide', section: 'steps', key, value: '', locale: 'en' })
      }
    }

    await apiFetch('/api/v1/admin/content/bulk', { method: 'POST', body: { items } })
    originalStepKeys = items.filter(i => i.section === 'steps' && i.value).map(i => i.key)
    toast.add({ title: 'Guide saved', color: 'success' })
    nextTick(() => snapshotOriginal())
  } catch {
    toast.add({ title: 'Error saving', color: 'error' })
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.step-list-enter-active,
.step-list-leave-active {
  transition: all 0.3s ease;
}
.step-list-enter-from {
  opacity: 0;
  transform: translateY(-10px);
}
.step-list-leave-to {
  opacity: 0;
  transform: translateX(20px);
}

.guide-content :deep(p) { margin-bottom: 0.4em; }
.guide-content :deep(p:last-child) { margin-bottom: 0; }
.guide-content :deep(strong) { font-weight: 600; }
.guide-content :deep(a) { color: var(--brand-400, #4e9eff); text-decoration: underline; text-underline-offset: 2px; }
.guide-content :deep(a:hover) { opacity: 0.8; }
.guide-content :deep(ul), .guide-content :deep(ol) { padding-left: 1.25em; margin: 0.4em 0; }
.guide-content :deep(li) { margin-bottom: 0.2em; }
.guide-content :deep(code) { padding: 0.15em 0.35em; border-radius: 4px; font-size: 0.85em; background: rgba(127, 127, 127, 0.12); }
</style>

<template>
  <div class="space-y-6">
    <AdminStickyBar :show="hasChanges" description="Guide changes are ready to publish.">
      <template #actions>
        <UButton icon="i-heroicons-check" :loading="saving" @click="save">
          Save
        </UButton>
      </template>
    </AdminStickyBar>

    <AdminPageHeader
      icon="i-heroicons-book-open"
      eyebrow="Content"
      title="Guide"
      description="Keep onboarding linear: one intro and a short set of clear steps."
    >
      <template #meta>
        <span class="admin-pill">{{ form.steps.length }} steps</span>
      </template>

      <template #actions>
        <div class="admin-segmented">
          <button class="admin-segmented__button" :class="tab === 'edit' ? 'admin-segmented__button--active' : ''" @click="tab = 'edit'">Edit</button>
          <button class="admin-segmented__button" :class="tab === 'preview' ? 'admin-segmented__button--active' : ''" @click="tab = 'preview'">Preview</button>
        </div>
      </template>
    </AdminPageHeader>

    <AdminPanel v-if="loading" title="Guide" description="Loading guide content." icon="i-heroicons-book-open">
      <div class="py-12 text-center">
        <UIcon name="i-heroicons-arrow-path" class="mx-auto h-8 w-8 animate-spin text-blue-500" />
      </div>
    </AdminPanel>

    <template v-else-if="tab === 'edit'">
      <AdminPanel title="Introduction" description="Sets the tone for the whole guide." icon="i-heroicons-sparkles">
        <div class="admin-form-grid admin-form-grid--2">
          <div class="admin-field">
            <label for="guide-intro-title" class="admin-field__label">Title</label>
            <UInput id="guide-intro-title" v-model="form.introTitle" :disabled="saving" placeholder="Installation Guide" />
          </div>
          <div class="admin-field">
            <label for="guide-intro-subtitle" class="admin-field__label">Subtitle</label>
            <UInput id="guide-intro-subtitle" v-model="form.introText" :disabled="saving" placeholder="Short intro text..." />
          </div>
        </div>
      </AdminPanel>

      <AdminPanel title="Steps" description="Only keep the steps users actually need." icon="i-heroicons-list-bullet">
        <template #actions>
          <div class="flex items-center gap-2">
            <UButton v-if="form.steps.length > 1" size="sm" variant="ghost" color="neutral"
              :icon="allExpanded ? 'i-heroicons-chevron-double-up' : 'i-heroicons-chevron-double-down'"
              @click="toggleAllSteps">
              {{ allExpanded ? 'Collapse All' : 'Expand All' }}
            </UButton>
            <UButton size="sm" variant="ghost" color="neutral" icon="i-heroicons-plus" @click="addStep">Add Step</UButton>
          </div>
        </template>

        <div class="space-y-3">
          <div v-for="(step, index) in form.steps" :key="step.id" class="guide-step-card">
            <!-- Step header (always visible) -->
            <div class="flex items-center gap-3 px-4 py-3 cursor-pointer" @click="toggleStep(step.id)">
              <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-xs font-bold"
                :class="isDark ? 'bg-blue-500/15 text-blue-400' : 'bg-blue-50 text-blue-600'">
                {{ index + 1 }}
              </div>
              <UInput
                v-model="step.title"
                :disabled="saving"
                :placeholder="`Step ${index + 1} title...`"
                variant="none"
                class="flex-1 font-medium"
                @click.stop
              />
              <div class="flex items-center gap-1 shrink-0">
                <UButton v-if="index > 0" icon="i-heroicons-chevron-up" size="xs" color="neutral" variant="ghost" @click.stop="moveStep(index, -1)" />
                <UButton v-if="index < form.steps.length - 1" icon="i-heroicons-chevron-down" size="xs" color="neutral" variant="ghost" @click.stop="moveStep(index, 1)" />
                <UButton v-if="form.steps.length > 1" icon="i-heroicons-trash" size="xs" color="error" variant="ghost" @click.stop="removeStep(index)" />
                <UIcon name="i-heroicons-chevron-down" class="h-4 w-4 transition-transform duration-200"
                  :class="[expandedSteps[step.id] ? 'rotate-180' : '', isDark ? 'text-white/30' : 'text-slate-400']" />
              </div>
            </div>

            <!-- Step content (collapsible) -->
            <div class="step-collapse" :class="expandedSteps[step.id] ? 'step-collapse--open' : ''">
              <div class="step-collapse__inner">
                <div class="px-4 pb-4 pt-1">
                  <TipTapEditor v-model="step.content" placeholder="Describe this step..." min-height="120px" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </AdminPanel>
    </template>

    <AdminPanel v-else title="Preview" description="A minimal preview of the onboarding flow." icon="i-heroicons-eye">
      <div class="space-y-6">
        <div class="admin-preview-shell text-center">
          <p class="admin-row__eyebrow">Intro</p>
          <h2 class="mt-3 text-3xl font-semibold tracking-tight text-slate-950 dark:text-white sm:text-4xl">
            {{ form.introTitle || "Installation Guide" }}
          </h2>
          <p class="mt-3 text-sm text-slate-500 dark:text-slate-400">
            {{ form.introText || "No subtitle set." }}
          </p>
        </div>

        <div class="admin-list">
          <div v-for="(step, index) in form.steps" :key="`preview-${step.id}`" class="admin-row">
            <div class="flex items-start gap-4">
              <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-blue-500/10 text-sm font-semibold text-blue-600 dark:text-blue-300">
                {{ index + 1 }}
              </div>
              <div class="admin-row__content">
                <p class="admin-row__title">{{ step.title || `Step ${index + 1}` }}</p>
                <div class="prose prose-sm mt-3 max-w-none dark:prose-invert" v-html="renderPreviewContent(step.content)" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminPanel>
  </div>
</template>

<script setup lang="ts">
import { sanitizeRichHtml } from '~/utils/richText'

definePageMeta({ layout: "admin" })

const toast = useToast()
const { apiFetch } = useApi()
const isDark = useIsDark()

const loading = ref(true)
const saving = ref(false)
const tab = ref<"edit" | "preview">("edit")

let nextStepId = 1
let originalStepKeys: string[] = []

interface Step {
  id: number
  title: string
  content: string
}

function renderPreviewContent(content: string) {
  return sanitizeRichHtml(content || '<em>No content</em>')
}

const form = reactive({
  introTitle: "",
  introText: "",
  steps: [] as Step[],
})

const expandedSteps = reactive<Record<number, boolean>>({})
const allExpanded = computed(() => form.steps.every(s => expandedSteps[s.id]))

function toggleStep(id: number) {
  expandedSteps[id] = !expandedSteps[id]
}

function toggleAllSteps() {
  const target = !allExpanded.value
  for (const step of form.steps) {
    expandedSteps[step.id] = target
  }
}

const originalData = ref("")

function serializeForm(): string {
  return JSON.stringify({
    introTitle: form.introTitle,
    introText: form.introText,
    steps: form.steps.map(step => ({ title: step.title, content: step.content })),
  })
}

const hasChanges = computed(() => {
  if (loading.value || !originalData.value) return false
  return serializeForm() !== originalData.value
})

function snapshotOriginal() {
  originalData.value = serializeForm()
}

function stripHtml(value: string): string {
  return value.replace(/<[^>]*>/g, "").trim()
}

function addStep() {
  const id = nextStepId++
  form.steps.push({ id, title: "", content: "" })
  expandedSteps[id] = true
  nextTick(() => {
    const el = document.querySelector(`[data-step-id="${id}"]`) as HTMLElement
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  })
}

function removeStep(index: number) {
  form.steps.splice(index, 1)
}

function moveStep(index: number, direction: number) {
  const targetIndex = index + direction
  if (targetIndex < 0 || targetIndex >= form.steps.length) return
  const [item] = form.steps.splice(index, 1)
  form.steps.splice(targetIndex, 0, item)
}

async function load() {
  loading.value = true

  try {
    const data = await apiFetch<Record<string, Record<string, Record<string, string>>>>("/api/v1/admin/content/guide")
    const source = data?.en || data?.de || data

    if (source?.intro) {
      form.introTitle = stripHtml(source.intro.title || "")
      form.introText = stripHtml(source.intro.text || "")
    }

    if (source?.steps) {
      originalStepKeys = Object.keys(source.steps)

      const stepNumbers = [...new Set(originalStepKeys
        .map(key => {
          const match = key.match(/^step_(\d+)/)
          return match ? Number.parseInt(match[1]) : 0
        })
        .filter(number => number > 0))]
        .sort((a, b) => a - b)

      if (stepNumbers.length) {
        form.steps = stepNumbers
          .map(number => {
            const content = source.steps[`step_${number}`] || source.steps[`step_${number}_content`] || ""
            const title = source.steps[`step_${number}_title`] || ""
            const id = nextStepId++
            return { id, title: stripHtml(title), content }
          })
          .filter(step => step.content || step.title)
      }
    }

    if (!form.steps.length) {
      form.steps = [{ id: nextStepId++, title: "", content: "" }]
    }

    // Auto-expand first step
    if (form.steps.length) expandedSteps[form.steps[0].id] = true
  } catch {
    form.steps = [{ id: nextStepId++, title: "", content: "" }]
  } finally {
    loading.value = false
    nextTick(() => snapshotOriginal())
  }
}

async function save() {
  saving.value = true

  try {
    const items: Array<{ page: string; section: string; key: string; value: string; locale: string }> = [
      { page: "guide", section: "intro", key: "title", value: form.introTitle, locale: "en" },
      { page: "guide", section: "intro", key: "text", value: form.introText, locale: "en" },
    ]

    form.steps.forEach((step, index) => {
      const number = index + 1
      items.push({ page: "guide", section: "steps", key: `step_${number}_title`, value: step.title, locale: "en" })
      items.push({ page: "guide", section: "steps", key: `step_${number}`, value: step.content, locale: "en" })
    })

    const currentKeys = new Set(items.filter(item => item.section === "steps").map(item => item.key))

    for (const key of originalStepKeys) {
      if (!currentKeys.has(key)) {
        items.push({ page: "guide", section: "steps", key, value: "", locale: "en" })
      }
    }

    await apiFetch("/api/v1/admin/content/bulk", { method: "POST", body: { items } })
    originalStepKeys = items.filter(item => item.section === "steps" && item.value).map(item => item.key)
    toast.add({ title: "Guide saved", color: "success" })
    nextTick(() => snapshotOriginal())
  } catch {
    toast.add({ title: "Error saving", color: "error" })
  } finally {
    saving.value = false
  }
}

onMounted(load)
</script>

<style scoped>
.guide-step-card {
  border-radius: 0.75rem;
  border: 1px solid var(--admin-border);
  background: var(--admin-card-bg);
  transition: border-color 0.15s;
}
.guide-step-card:hover {
  border-color: var(--admin-border-hover, var(--admin-border));
}

.step-collapse {
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}
.step-collapse--open {
  grid-template-rows: 1fr;
}
.step-collapse__inner {
  overflow: hidden;
}
</style>

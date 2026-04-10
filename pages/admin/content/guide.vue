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
        <div class="flex flex-wrap items-center gap-3">
          <div class="admin-segmented">
            <button
              class="admin-segmented__button"
              :class="tab === 'edit' ? 'admin-segmented__button--active' : ''"
              @click="tab = 'edit'"
            >
              Edit
            </button>
            <button
              class="admin-segmented__button"
              :class="tab === 'preview' ? 'admin-segmented__button--active' : ''"
              @click="tab = 'preview'"
            >
              Preview
            </button>
          </div>

          <UButton v-if="hasChanges" icon="i-heroicons-check" :loading="saving" @click="save">
            Save
          </UButton>
        </div>
      </template>
    </AdminPageHeader>

    <AdminPanel v-if="loading" title="Guide" description="Loading guide content." icon="i-heroicons-book-open">
      <div class="py-12 text-center">
        <UIcon name="i-heroicons-arrow-path" class="mx-auto h-8 w-8 animate-spin text-blue-500" />
      </div>
    </AdminPanel>

    <template v-else-if="tab === 'edit'">
      <AdminPanel title="Introduction" description="This sets the tone for the whole guide." icon="i-heroicons-sparkles">
        <div class="admin-form-grid admin-form-grid--2">
          <div class="admin-field">
            <label class="admin-field__label">Title</label>
            <UInput v-model="form.introTitle" :disabled="saving" placeholder="Installation Guide" />
          </div>

          <div class="admin-field">
            <label class="admin-field__label">Subtitle</label>
            <UInput v-model="form.introText" :disabled="saving" placeholder="Short intro text..." />
          </div>
        </div>
      </AdminPanel>

      <AdminPanel
        title="Steps"
        description="Only keep the steps users actually need to finish setup."
        icon="i-heroicons-list-bullet"
      >
        <template #actions>
          <UButton size="sm" variant="ghost" color="neutral" icon="i-heroicons-plus" @click="addStep">
            Add Step
          </UButton>
        </template>

        <TransitionGroup name="step-list" tag="div" class="admin-list">
          <div
            v-for="(step, index) in form.steps"
            :key="step.id"
            class="admin-subpanel space-y-4"
          >
            <div class="flex flex-wrap items-center justify-between gap-3">
              <div class="flex min-w-0 items-center gap-3">
                <button
                  class="admin-icon-button h-9 w-9 cursor-grab active:cursor-grabbing"
                  title="Drag to reorder"
                  @mousedown="startDrag(index, $event)"
                >
                  <UIcon name="i-heroicons-bars-3-bottom-left" class="h-4 w-4" />
                </button>

                <span class="admin-pill">Step {{ index + 1 }}</span>
              </div>

              <div class="flex items-center gap-1">
                <UButton
                  v-if="index > 0"
                  icon="i-heroicons-chevron-up"
                  size="xs"
                  color="neutral"
                  variant="ghost"
                  @click="moveStep(index, -1)"
                />
                <UButton
                  v-if="index < form.steps.length - 1"
                  icon="i-heroicons-chevron-down"
                  size="xs"
                  color="neutral"
                  variant="ghost"
                  @click="moveStep(index, 1)"
                />
                <UButton
                  v-if="form.steps.length > 1"
                  icon="i-heroicons-trash"
                  size="xs"
                  color="error"
                  variant="ghost"
                  @click="removeStep(index)"
                />
              </div>
            </div>

            <div class="admin-field">
              <label class="admin-field__label">Step title</label>
              <UInput v-model="step.title" :disabled="saving" placeholder="Step title..." />
            </div>

            <div class="admin-field">
              <label class="admin-field__label">Content</label>
              <TipTapEditor v-model="step.content" placeholder="Describe this step..." min-height="120px" />
            </div>
          </div>
        </TransitionGroup>
      </AdminPanel>
    </template>

    <AdminPanel
      v-else
      title="Preview"
      description="A minimal preview of the onboarding flow."
      icon="i-heroicons-eye"
    >
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
                <div
                  class="prose prose-sm mt-3 max-w-none dark:prose-invert"
                  v-html="renderPreviewContent(step.content)"
                />
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
  form.steps.push({ id: nextStepId++, title: "", content: "" })
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

let dragIndex = -1
let dragCleanup: (() => void) | null = null

function startDrag(index: number, event: MouseEvent) {
  dragIndex = index
  const startY = event.clientY

  const onMove = (moveEvent: MouseEvent) => {
    const diff = moveEvent.clientY - startY
    const stepHeight = 200
    const steps = Math.round(diff / stepHeight)

    if (steps !== 0 && dragIndex + steps >= 0 && dragIndex + steps < form.steps.length) {
      moveStep(dragIndex, steps)
      dragIndex += steps
    }
  }

  const onUp = () => {
    dragIndex = -1
    window.removeEventListener("mousemove", onMove)
    window.removeEventListener("mouseup", onUp)
    dragCleanup = null
  }

  // Stored so onUnmounted can detach listeners if the user navigates away mid-drag
  dragCleanup = onUp

  window.addEventListener("mousemove", onMove)
  window.addEventListener("mouseup", onUp)
}

onUnmounted(() => {
  if (dragCleanup) dragCleanup()
})

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
            return { id: nextStepId++, title: stripHtml(title), content }
          })
          .filter(step => step.content || step.title)
      }
    }

    if (!form.steps.length) {
      form.steps = [{ id: nextStepId++, title: "", content: "" }]
    }
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
.step-list-enter-active,
.step-list-leave-active {
  transition: all 0.25s ease;
}

.step-list-enter-from {
  opacity: 0;
  transform: translateY(-8px);
}

.step-list-leave-to {
  opacity: 0;
  transform: translateX(12px);
}
</style>

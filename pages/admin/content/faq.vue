<template>
  <div class="space-y-6">
    <AdminPageHeader
      icon="i-heroicons-question-mark-circle"
      eyebrow="Content"
      title="FAQ"
      description="Keep support answers short, grouped and easy to scan."
    >
      <template #badge>
        <UBadge v-if="!loading" color="info" variant="subtle">{{ items.length }} total</UBadge>
      </template>

      <template #actions>
        <UButton icon="i-heroicons-plus" @click="openCreate">
          New Question
        </UButton>
      </template>
    </AdminPageHeader>

    <AdminPanel v-if="loading" title="Questions" description="Loading FAQ entries." icon="i-heroicons-question-mark-circle">
      <div class="py-12 text-center">
        <UIcon name="i-heroicons-arrow-path" class="mx-auto h-8 w-8 animate-spin text-blue-500" />
      </div>
    </AdminPanel>

    <AdminPanel
      v-else
      title="Questions"
      description="One good answer per question. Hide outdated entries instead of deleting by default."
      icon="i-heroicons-question-mark-circle"
    >
      <div class="admin-filterbar">
        <div class="flex flex-wrap items-center gap-2">
          <button
            v-for="category in categoryTabs"
            :key="category.value"
            class="admin-segmented__button"
            :class="activeCategory === category.value ? 'admin-segmented__button--active' : ''"
            @click="activeCategory = category.value"
          >
            {{ category.label }}
            <span class="ml-1 text-[11px] opacity-70">{{ category.count }}</span>
          </button>
        </div>
      </div>

      <div v-if="filteredItems.length" class="admin-list mt-5">
        <div v-for="faq in filteredItems" :key="faq.id" class="admin-row">
          <div class="admin-row__content">
            <div class="flex flex-wrap items-center gap-2">
              <UBadge color="info" variant="subtle" size="xs">{{ categoryLabels[faq.category] || faq.category }}</UBadge>
              <UBadge v-if="!faq.isVisible" color="warning" variant="subtle" size="xs">Hidden</UBadge>
            </div>

            <p class="admin-row__title mt-3">{{ faq.question }}</p>
            <p class="admin-row__meta">{{ stripHtml(faq.answer) }}</p>
          </div>

          <div class="admin-row__actions">
            <UButton
              :icon="faq.isVisible ? 'i-heroicons-eye' : 'i-heroicons-eye-slash'"
              size="xs"
              color="neutral"
              variant="ghost"
              @click="toggleVisibility(faq)"
            />
            <UButton icon="i-heroicons-pencil-square" size="xs" color="neutral" variant="ghost" @click="openEdit(faq)" />
            <UButton icon="i-heroicons-trash" size="xs" color="error" variant="ghost" @click="confirmDelete(faq)" />
          </div>
        </div>
      </div>

      <AdminEmptyState
        v-else
        icon="i-heroicons-question-mark-circle"
        title="No FAQ entries"
        description="Create the first question or switch to another category."
      >
        <template #actions>
          <UButton icon="i-heroicons-plus" @click="openCreate">New Question</UButton>
        </template>
      </AdminEmptyState>
    </AdminPanel>

    <UModal v-model:open="modalOpen" class="sm:max-w-2xl">
      <template #content>
        <div class="p-6">
          <h2 class="text-lg font-semibold text-slate-950 dark:text-white">
            {{ editingFaq ? "Edit Question" : "New Question" }}
          </h2>

          <div class="mt-6 space-y-4">
            <div class="admin-form-grid admin-form-grid--2">
              <div class="admin-field">
                <label class="admin-field__label">Category</label>
                <USelect v-model="form.category" :items="categoryOptions" />
              </div>

              <div class="admin-switch-row">
                <div class="admin-switch-row__content">
                  <p class="admin-switch-row__title">Visible</p>
                  <p class="admin-switch-row__description">Hidden questions stay in the admin only.</p>
                </div>

                <USwitch v-model="form.isVisible" />
              </div>
            </div>

            <div class="admin-field">
              <label class="admin-field__label">Question</label>
              <UInput v-model="form.question" placeholder="What is MagguuUI?" />
            </div>

            <div class="admin-field">
              <label class="admin-field__label">Answer</label>
              <TipTapEditor v-model="form.answer" placeholder="Write the answer..." min-height="180px" />
            </div>
          </div>

          <div class="mt-6 flex justify-end gap-3 border-t border-slate-200 pt-4 dark:border-white/8">
            <UButton color="neutral" variant="ghost" @click="modalOpen = false">Cancel</UButton>
            <UButton :loading="saving" icon="i-heroicons-check" @click="saveForm">
              {{ editingFaq ? "Update" : "Create" }}
            </UButton>
          </div>
        </div>
      </template>
    </UModal>

    <UModal v-model:open="deleteOpen">
      <template #content>
        <div class="p-6">
          <div class="flex items-start gap-4">
            <div class="admin-empty-state__icon admin-tone-danger h-10 w-10">
              <UIcon name="i-heroicons-exclamation-triangle" class="h-5 w-5" />
            </div>

            <div>
              <h2 class="text-lg font-semibold text-slate-950 dark:text-white">Delete question?</h2>
              <p class="mt-2 text-sm text-slate-500 dark:text-slate-400">
                <strong class="text-slate-950 dark:text-white">{{ deletingFaq?.question }}</strong> will be permanently deleted.
              </p>
            </div>
          </div>

          <div class="mt-6 flex justify-end gap-3 border-t border-slate-200 pt-4 dark:border-white/8">
            <UButton color="neutral" variant="ghost" @click="deleteOpen = false">Cancel</UButton>
            <UButton color="error" :loading="saving" icon="i-heroicons-trash" @click="doDelete">Delete</UButton>
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: "admin" })

const toast = useToast()
const { apiFetch } = useApi()

interface FaqItem {
  id: number
  category: string
  question: string
  answer: string
  sortOrder: number
  isVisible: boolean
}

const loading = ref(true)
const saving = ref(false)
const items = ref<FaqItem[]>([])
const activeCategory = ref("all")

const categoryLabels: Record<string, string> = {
  general: "General",
  installation: "Installation",
  addons: "Addons",
  troubleshooting: "Troubleshooting",
}

const categoryOptions = [
  { label: "General", value: "general" },
  { label: "Installation", value: "installation" },
  { label: "Addons", value: "addons" },
  { label: "Troubleshooting", value: "troubleshooting" },
]

const categoryTabs = computed(() => {
  const counts: Record<string, number> = {}

  for (const item of items.value) {
    counts[item.category] = (counts[item.category] || 0) + 1
  }

  return [
    { label: "All", value: "all", count: items.value.length },
    ...categoryOptions.map(option => ({
      label: option.label,
      value: option.value,
      count: counts[option.value] || 0,
    })),
  ]
})

const filteredItems = computed(() => {
  if (activeCategory.value === "all") return items.value
  return items.value.filter(item => item.category === activeCategory.value)
})

function stripHtml(html: string) {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim()
}

const modalOpen = ref(false)
const editingFaq = ref<FaqItem | null>(null)
const form = reactive({
  category: "general",
  question: "",
  answer: "",
  isVisible: true,
})

const deleteOpen = ref(false)
const deletingFaq = ref<FaqItem | null>(null)

function openCreate() {
  editingFaq.value = null
  form.category = activeCategory.value === "all" ? "general" : activeCategory.value
  form.question = ""
  form.answer = ""
  form.isVisible = true
  modalOpen.value = true
}

function openEdit(faq: FaqItem) {
  editingFaq.value = faq
  form.category = faq.category
  form.question = faq.question
  form.answer = faq.answer
  form.isVisible = faq.isVisible
  modalOpen.value = true
}

function confirmDelete(faq: FaqItem) {
  deletingFaq.value = faq
  deleteOpen.value = true
}

async function load() {
  loading.value = true

  try {
    const data = await apiFetch<FaqItem[]>("/api/v1/admin/faqs")
    items.value = data || []
  } catch {
    items.value = []
  } finally {
    loading.value = false
  }
}

async function saveForm() {
  if (!form.question.trim() || !form.answer.trim()) {
    toast.add({ title: "Question and answer are required", color: "warning" })
    return
  }

  saving.value = true

  try {
    if (editingFaq.value) {
      await apiFetch(`/api/v1/admin/faqs/${editingFaq.value.id}`, { method: "PUT", body: { ...form } })
      toast.add({ title: "Question updated", color: "success" })
    } else {
      await apiFetch("/api/v1/admin/faqs", { method: "POST", body: { ...form, sortOrder: items.value.length } })
      toast.add({ title: "Question created", color: "success" })
    }

    modalOpen.value = false
    await load()
  } catch {
    toast.add({ title: "Error saving", color: "error" })
  } finally {
    saving.value = false
  }
}

async function doDelete() {
  if (!deletingFaq.value) return

  saving.value = true

  try {
    await apiFetch(`/api/v1/admin/faqs/${deletingFaq.value.id}`, { method: "DELETE" })
    toast.add({ title: "Question deleted", color: "success" })
    deleteOpen.value = false
    await load()
  } catch {
    toast.add({ title: "Error deleting", color: "error" })
  } finally {
    saving.value = false
  }
}

async function toggleVisibility(faq: FaqItem) {
  try {
    await apiFetch(`/api/v1/admin/faqs/${faq.id}`, { method: "PUT", body: { isVisible: !faq.isVisible } })
    faq.isVisible = !faq.isVisible
    toast.add({ title: faq.isVisible ? "FAQ visible" : "FAQ hidden", color: "success" })
  } catch {
    toast.add({ title: "Error", color: "error" })
  }
}

onMounted(load)
</script>

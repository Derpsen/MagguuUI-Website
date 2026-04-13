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
        <UButton icon="i-heroicons-plus" @click="openCreate">New Question</UButton>
      </template>
    </AdminPageHeader>

    <AdminPanel v-if="loading" title="Questions" description="Loading FAQ entries." icon="i-heroicons-question-mark-circle">
      <div class="py-12 text-center">
        <UIcon name="i-heroicons-arrow-path" class="mx-auto h-8 w-8 animate-spin text-blue-500" />
      </div>
    </AdminPanel>

    <AdminPanel v-else title="Questions" description="One good answer per question." icon="i-heroicons-question-mark-circle">
      <!-- Category filter -->
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

      <!-- FAQ list -->
      <div v-if="filteredItems.length" class="mt-5 space-y-2">
        <div v-for="(faq, index) in filteredItems" :key="faq.id"
          class="faq-card"
          :class="[
            expandedId === faq.id ? 'faq-card--expanded' : '',
            deletingId === faq.id ? 'faq-card--deleting' : '',
          ]">
          <!-- Collapsed view -->
          <div class="flex items-center gap-3 px-4 py-3">
            <!-- Reorder buttons -->
            <div class="flex flex-col shrink-0">
              <button
                class="p-0.5 rounded transition-colors disabled:opacity-20"
                :class="isDark ? 'text-white/30 hover:text-white/60' : 'text-slate-300 hover:text-slate-500'"
                :disabled="index === 0 || reordering"
                @click="moveItem(faq, -1)"
              >
                <UIcon name="i-heroicons-chevron-up" class="h-3.5 w-3.5" />
              </button>
              <button
                class="p-0.5 rounded transition-colors disabled:opacity-20"
                :class="isDark ? 'text-white/30 hover:text-white/60' : 'text-slate-300 hover:text-slate-500'"
                :disabled="index === filteredItems.length - 1 || reordering"
                @click="moveItem(faq, 1)"
              >
                <UIcon name="i-heroicons-chevron-down" class="h-3.5 w-3.5" />
              </button>
            </div>

            <!-- Content -->
            <div class="flex-1 min-w-0 cursor-pointer" @click="toggleExpand(faq.id)">
              <div class="flex flex-wrap items-center gap-1.5 mb-1">
                <UBadge color="info" variant="subtle" size="xs">{{ categoryLabels[faq.category] || faq.category }}</UBadge>
                <UBadge v-if="!faq.isVisible" color="warning" variant="subtle" size="xs">Hidden</UBadge>
              </div>
              <p class="text-sm font-medium truncate" :class="isDark ? 'text-white' : 'text-slate-900'">{{ faq.question }}</p>
              <p v-if="expandedId !== faq.id" class="text-xs mt-0.5 line-clamp-1" :class="isDark ? 'text-white/40' : 'text-slate-400'">{{ stripHtml(faq.answer) }}</p>
            </div>

            <!-- Actions -->
            <div class="flex items-center gap-1 shrink-0">
              <template v-if="deletingId === faq.id">
                <span class="text-xs mr-1" :class="isDark ? 'text-red-400' : 'text-red-600'">Delete?</span>
                <UButton icon="i-heroicons-check" size="xs" color="error" variant="ghost" @click="doDelete(faq)" />
                <UButton icon="i-heroicons-x-mark" size="xs" color="neutral" variant="ghost" @click="deletingId = null" />
              </template>
              <template v-else>
                <UButton
                  :icon="faq.isVisible ? 'i-heroicons-eye' : 'i-heroicons-eye-slash'"
                  size="xs" color="neutral" variant="ghost"
                  @click="toggleVisibility(faq)"
                />
                <UButton icon="i-heroicons-pencil-square" size="xs" color="neutral" variant="ghost" @click="toggleExpand(faq.id)" />
                <UButton icon="i-heroicons-trash" size="xs" color="error" variant="ghost" @click="deletingId = faq.id" />
              </template>
            </div>
          </div>

          <!-- Expanded inline edit -->
          <div class="faq-expand" :class="expandedId === faq.id ? 'faq-expand--open' : ''">
            <div class="faq-expand__inner">
              <div class="px-4 pb-4 pt-1 space-y-4 border-t" :class="isDark ? 'border-white/6' : 'border-slate-100'">
                <div class="admin-form-grid admin-form-grid--2">
                  <div class="admin-field">
                    <label :for="`faq-inline-category-${faq.id}`" class="admin-field__label">Category</label>
                    <USelect :id="`faq-inline-category-${faq.id}`" v-model="faq.category" :items="categoryOptions" />
                  </div>
                  <div class="admin-switch-row">
                    <div class="admin-switch-row__content">
                      <p class="admin-switch-row__title">Visible</p>
                    </div>
                    <USwitch v-model="faq.isVisible" />
                  </div>
                </div>
                <div class="admin-field">
                  <label :for="`faq-inline-question-${faq.id}`" class="admin-field__label">Question</label>
                  <UInput :id="`faq-inline-question-${faq.id}`" v-model="faq.question" />
                </div>
                <div class="admin-field">
                  <label :for="`faq-inline-answer-${faq.id}`" class="admin-field__label">Answer</label>
                  <TipTapEditor :id="`faq-inline-answer-${faq.id}`" v-model="faq.answer" placeholder="Write the answer..." min-height="150px" />
                </div>
                <div class="flex justify-end gap-2">
                  <UButton variant="ghost" color="neutral" size="sm" @click="cancelEdit(faq)">Cancel</UButton>
                  <UButton icon="i-heroicons-check" size="sm" :loading="saving" @click="saveInline(faq)">Save</UButton>
                </div>
              </div>
            </div>
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

    <!-- Create modal -->
    <UModal v-model:open="createOpen" class="sm:max-w-2xl">
      <template #content>
        <div class="p-6">
          <h2 class="text-lg font-semibold text-slate-950 dark:text-white">New Question</h2>

          <div class="mt-6 space-y-4">
            <div class="admin-form-grid admin-form-grid--2">
              <div class="admin-field">
                <label for="faq-create-category" class="admin-field__label">Category</label>
                <USelect id="faq-create-category" v-model="createForm.category" :items="categoryOptions" />
              </div>
              <div class="admin-switch-row">
                <div class="admin-switch-row__content">
                  <p class="admin-switch-row__title">Visible</p>
                  <p class="admin-switch-row__description">Hidden questions stay in the admin only.</p>
                </div>
                <USwitch v-model="createForm.isVisible" />
              </div>
            </div>
            <div class="admin-field">
              <label for="faq-create-question" class="admin-field__label">Question</label>
              <UInput id="faq-create-question" v-model="createForm.question" placeholder="What is MagguuUI?" />
            </div>
            <div class="admin-field">
              <label for="faq-create-answer" class="admin-field__label">Answer</label>
              <TipTapEditor id="faq-create-answer" v-model="createForm.answer" placeholder="Write the answer..." min-height="180px" />
            </div>
          </div>

          <div class="mt-6 flex justify-end gap-3 border-t border-slate-200 pt-4 dark:border-white/8">
            <UButton color="neutral" variant="ghost" @click="createOpen = false">Cancel</UButton>
            <UButton :loading="saving" icon="i-heroicons-check" @click="doCreate">Create</UButton>
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
const isDark = useIsDark()

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
const reordering = ref(false)
const items = ref<FaqItem[]>([])
const activeCategory = ref("all")
const expandedId = ref<number | null>(null)
const deletingId = ref<number | null>(null)
const editSnapshot = ref<string>("")

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
  for (const item of items.value) counts[item.category] = (counts[item.category] || 0) + 1
  return [
    { label: "All", value: "all", count: items.value.length },
    ...categoryOptions.map(o => ({ label: o.label, value: o.value, count: counts[o.value] || 0 })),
  ]
})

const filteredItems = computed(() => {
  if (activeCategory.value === "all") return items.value
  return items.value.filter(i => i.category === activeCategory.value)
})

function stripHtml(html: string) {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim()
}

// Inline edit
function toggleExpand(id: number) {
  if (expandedId.value === id) {
    expandedId.value = null
    return
  }
  const faq = items.value.find(i => i.id === id)
  if (faq) editSnapshot.value = JSON.stringify({ category: faq.category, question: faq.question, answer: faq.answer, isVisible: faq.isVisible })
  expandedId.value = id
}

function cancelEdit(faq: FaqItem) {
  if (editSnapshot.value) {
    const snap = JSON.parse(editSnapshot.value)
    Object.assign(faq, snap)
  }
  expandedId.value = null
}

async function saveInline(faq: FaqItem) {
  if (!faq.question.trim() || !faq.answer.trim()) {
    toast.add({ title: "Question and answer are required", color: "warning" })
    return
  }
  saving.value = true
  try {
    await apiFetch(`/api/v1/admin/faqs/${faq.id}`, {
      method: "PUT",
      body: { category: faq.category, question: faq.question, answer: faq.answer, isVisible: faq.isVisible },
    })
    toast.add({ title: "Question updated", color: "success" })
    expandedId.value = null
  } catch {
    toast.add({ title: "Error saving", color: "error" })
  } finally {
    saving.value = false
  }
}

// Reorder
async function moveItem(faq: FaqItem, direction: number) {
  const idx = items.value.indexOf(faq)
  const target = idx + direction
  if (target < 0 || target >= items.value.length) return

  const [moved] = items.value.splice(idx, 1)
  items.value.splice(target, 0, moved)

  reordering.value = true
  try {
    await apiFetch("/api/v1/admin/faqs/reorder", {
      method: "POST",
      body: { items: items.value.map((item, i) => ({ id: item.id, sortOrder: i })) },
    })
  } catch {
    toast.add({ title: "Reorder failed", color: "error" })
    await load()
  } finally {
    reordering.value = false
  }
}

// Visibility toggle
async function toggleVisibility(faq: FaqItem) {
  try {
    await apiFetch(`/api/v1/admin/faqs/${faq.id}`, { method: "PUT", body: { isVisible: !faq.isVisible } })
    faq.isVisible = !faq.isVisible
    toast.add({ title: faq.isVisible ? "FAQ visible" : "FAQ hidden", color: "success" })
  } catch {
    toast.add({ title: "Error", color: "error" })
  }
}

// Delete (inline confirmation)
async function doDelete(faq: FaqItem) {
  saving.value = true
  try {
    await apiFetch(`/api/v1/admin/faqs/${faq.id}`, { method: "DELETE" })
    toast.add({ title: "Question deleted", color: "success" })
    deletingId.value = null
    await load()
  } catch {
    toast.add({ title: "Error deleting", color: "error" })
  } finally {
    saving.value = false
  }
}

// Create
const createOpen = ref(false)
const createForm = reactive({ category: "general", question: "", answer: "", isVisible: true })

function openCreate() {
  createForm.category = activeCategory.value === "all" ? "general" : activeCategory.value
  createForm.question = ""
  createForm.answer = ""
  createForm.isVisible = true
  createOpen.value = true
}

async function doCreate() {
  if (!createForm.question.trim() || !createForm.answer.trim()) {
    toast.add({ title: "Question and answer are required", color: "warning" })
    return
  }
  saving.value = true
  try {
    await apiFetch("/api/v1/admin/faqs", { method: "POST", body: { ...createForm, sortOrder: items.value.length } })
    toast.add({ title: "Question created", color: "success" })
    createOpen.value = false
    await load()
  } catch {
    toast.add({ title: "Error creating", color: "error" })
  } finally {
    saving.value = false
  }
}

// Load
async function load() {
  loading.value = true
  try {
    items.value = await apiFetch("/api/v1/admin/faqs") || []
  } catch {
    items.value = []
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<style scoped>
.faq-card {
  border-radius: 0.75rem;
  border: 1px solid var(--admin-border);
  background: var(--admin-card-bg);
  transition: border-color 0.15s, box-shadow 0.15s;
}
.faq-card:hover {
  border-color: var(--admin-border-hover, var(--admin-border));
}
.faq-card--expanded {
  border-color: hsl(212 100% 50% / 0.3);
  box-shadow: 0 0 0 1px hsl(212 100% 50% / 0.1);
}
.faq-card--deleting {
  border-color: hsl(0 80% 50% / 0.3);
}

.faq-expand {
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}
.faq-expand--open {
  grid-template-rows: 1fr;
}
.faq-expand__inner {
  overflow: hidden;
}
</style>

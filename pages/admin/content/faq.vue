<!--
  Admin — FAQ Management
  CRUD for FAQ entries with categories, visibility toggle, TipTap editor
-->

<template>
  <div class="max-w-5xl mx-auto">
    <!-- Header Bar -->
    <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 admin-fade-in admin-stagger-1">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          :class="isDark ? 'bg-purple-500/10' : 'bg-purple-50'">
          <UIcon name="i-heroicons-question-mark-circle" class="w-5 h-5 text-purple-500" />
        </div>
        <div>
          <h2 class="text-lg font-semibold" :class="isDark ? 'text-white' : 'text-gray-900'">FAQ</h2>
          <p class="text-xs" :class="isDark ? 'text-silver-500' : 'text-gray-500'">{{ items.length }} entries</p>
        </div>
      </div>
      <UButton icon="i-heroicons-plus" size="sm" @click="openCreate">New Question</UButton>
    </div>

    <!-- Category Tabs -->
    <div class="flex items-center gap-1.5 mb-5 admin-fade-in admin-stagger-2">
      <button v-for="cat in categoryTabs" :key="cat.value"
        class="px-3 py-1.5 text-xs font-medium rounded-lg transition-all"
        :class="activeCategory === cat.value
          ? 'bg-brand-400 text-white'
          : isDark ? 'text-silver-400 hover:text-white hover:bg-white/[0.03]' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'"
        @click="activeCategory = cat.value">
        {{ cat.label }}
        <span class="ml-1 opacity-60">{{ cat.count }}</span>
      </button>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="glass rounded-xl p-12 text-center">
      <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 text-brand-400 animate-spin mx-auto" />
    </div>

    <!-- Empty State -->
    <div v-else-if="filteredItems.length === 0" class="glass rounded-xl p-12 text-center admin-fade-in admin-stagger-3">
      <UIcon name="i-heroicons-question-mark-circle" class="w-12 h-12 mx-auto mb-3" :class="isDark ? 'text-silver-600' : 'text-gray-300'" />
      <p class="font-medium mb-1" :class="isDark ? 'text-silver-400' : 'text-gray-600'">No FAQ entries yet</p>
      <p class="text-sm mb-4" :class="isDark ? 'text-silver-600' : 'text-gray-400'">Create your first question to get started.</p>
      <UButton icon="i-heroicons-plus" size="sm" @click="openCreate">New Question</UButton>
    </div>

    <!-- FAQ List -->
    <div v-else class="space-y-2 admin-fade-in admin-stagger-3">
      <div v-for="(faq, idx) in filteredItems" :key="faq.id"
        class="glass rounded-xl overflow-hidden group transition-all"
        :class="isDark ? 'hover:border-brand-400/10' : 'hover:border-gray-300'">

        <div class="flex items-start gap-3 px-4 py-3">
          <!-- Number -->
          <span class="w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5"
            :class="isDark ? 'bg-brand-400/10 text-brand-400' : 'bg-blue-100 text-blue-600'">
            {{ idx + 1 }}
          </span>

          <!-- Content -->
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 mb-0.5">
              <span class="text-[10px] font-medium px-1.5 py-0.5 rounded"
                :class="isDark ? 'bg-brand-400/10 text-brand-300' : 'bg-blue-50 text-blue-600'">
                {{ categoryLabels[faq.category] || faq.category }}
              </span>
              <span v-if="!faq.isVisible" class="text-[10px] font-medium px-1.5 py-0.5 rounded"
                :class="isDark ? 'bg-amber-400/10 text-amber-400' : 'bg-amber-50 text-amber-600'">Hidden</span>
            </div>
            <h3 class="font-medium text-sm" :class="isDark ? 'text-white' : 'text-gray-900'">{{ faq.question }}</h3>
            <p class="text-xs mt-0.5 line-clamp-1" :class="isDark ? 'text-silver-500' : 'text-gray-500'">{{ stripHtml(faq.answer) }}</p>
          </div>

          <!-- Actions -->
          <div class="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
            <UButton :icon="faq.isVisible ? 'i-heroicons-eye' : 'i-heroicons-eye-slash'" size="xs"
              :color="faq.isVisible ? 'neutral' : 'warning'" variant="ghost"
              @click="toggleVisibility(faq)" />
            <UButton icon="i-heroicons-pencil-square" size="xs" color="neutral" variant="ghost"
              @click="openEdit(faq)" />
            <UButton icon="i-heroicons-trash" size="xs" color="error" variant="ghost"
              @click="confirmDelete(faq)" />
          </div>
        </div>
      </div>
    </div>

    <!-- Create/Edit Modal -->
    <UModal v-model:open="modalOpen" class="sm:max-w-2xl">
      <template #content>
        <div class="p-6">
          <h2 class="text-lg font-semibold mb-5" :class="isDark ? 'text-white' : 'text-gray-900'">
            {{ editingFaq ? 'Edit Question' : 'New Question' }}
          </h2>
          <div class="space-y-4">
            <div class="grid grid-cols-[1fr_auto] gap-4">
              <div>
                <label class="block text-xs font-medium mb-1" :class="labelClass">Category</label>
                <USelect v-model="form.category" :items="categoryOptions" />
              </div>
              <div class="flex items-end pb-0.5">
                <label class="flex items-center gap-2">
                  <USwitch v-model="form.isVisible" />
                  <span class="text-xs" :class="labelClass">Visible</span>
                </label>
              </div>
            </div>
            <div>
              <label class="block text-xs font-medium mb-1" :class="labelClass">Question</label>
              <UInput v-model="form.question" placeholder="What is MagguuUI?" />
            </div>
            <div>
              <label class="block text-xs font-medium mb-1" :class="labelClass">Answer</label>
              <TipTapEditor v-model="form.answer" placeholder="Write the answer..." min-height="160px" />
            </div>
          </div>
          <div class="flex items-center justify-end gap-2 mt-6 pt-4" :class="isDark ? 'border-t border-brand-400/10' : 'border-t border-gray-100'">
            <UButton color="neutral" variant="ghost" @click="modalOpen = false">Cancel</UButton>
            <UButton :loading="saving" @click="saveForm" icon="i-heroicons-check">{{ editingFaq ? 'Update' : 'Create' }}</UButton>
          </div>
        </div>
      </template>
    </UModal>

    <!-- Delete Confirm Modal -->
    <UModal v-model:open="deleteOpen">
      <template #content>
        <div class="p-6">
          <div class="flex items-start gap-4">
            <div class="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center flex-shrink-0">
              <UIcon name="i-heroicons-exclamation-triangle" class="w-5 h-5 text-red-400" />
            </div>
            <div>
              <h2 class="text-lg font-semibold mb-2" :class="isDark ? 'text-white' : 'text-gray-900'">Delete Question</h2>
              <p class="text-sm" :class="isDark ? 'text-silver-400' : 'text-gray-500'">
                <strong>"{{ deletingFaq?.question }}"</strong> will be permanently deleted.
              </p>
            </div>
          </div>
          <div class="flex items-center justify-end gap-2 mt-6 pt-4" :class="isDark ? 'border-t border-brand-400/10' : 'border-t border-gray-100'">
            <UButton color="neutral" variant="ghost" @click="deleteOpen = false">Cancel</UButton>
            <UButton color="error" :loading="saving" @click="doDelete" icon="i-heroicons-trash">Delete</UButton>
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'admin' })
const toast = useToast()
const { apiFetch } = useApi()
const isDark = useIsDark()
const labelClass = computed(() => isDark.value ? 'text-silver-400' : 'text-gray-500')

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
const activeCategory = ref('all')

const categoryLabels: Record<string, string> = {
  general: 'General',
  installation: 'Installation & Setup',
  addons: 'Addons & Profiles',
  troubleshooting: 'Troubleshooting',
}

const categoryOptions = [
  { label: 'General', value: 'general' },
  { label: 'Installation & Setup', value: 'installation' },
  { label: 'Addons & Profiles', value: 'addons' },
  { label: 'Troubleshooting', value: 'troubleshooting' },
]

const categoryTabs = computed(() => {
  const counts: Record<string, number> = {}
  for (const item of items.value) {
    counts[item.category] = (counts[item.category] || 0) + 1
  }
  return [
    { label: 'All', value: 'all', count: items.value.length },
    ...categoryOptions.map(c => ({ label: c.label, value: c.value, count: counts[c.value] || 0 })),
  ]
})

const filteredItems = computed(() => {
  if (activeCategory.value === 'all') return items.value
  return items.value.filter(i => i.category === activeCategory.value)
})

function stripHtml(html: string) {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
}

// Modal state
const modalOpen = ref(false)
const editingFaq = ref<FaqItem | null>(null)
const form = reactive({
  category: 'general',
  question: '',
  answer: '',
  isVisible: true,
})

const deleteOpen = ref(false)
const deletingFaq = ref<FaqItem | null>(null)

function openCreate() {
  editingFaq.value = null
  form.category = activeCategory.value === 'all' ? 'general' : activeCategory.value
  form.question = ''
  form.answer = ''
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
    const data = await apiFetch<FaqItem[]>('/api/v1/admin/faqs')
    items.value = data || []
  } catch {}
  finally { loading.value = false }
}
onMounted(load)

async function saveForm() {
  if (!form.question.trim() || !form.answer.trim()) {
    toast.add({ title: 'Question and answer are required', color: 'warning' })
    return
  }
  saving.value = true
  try {
    if (editingFaq.value) {
      await apiFetch(`/api/v1/admin/faqs/${editingFaq.value.id}`, { method: 'PUT', body: { ...form } })
      toast.add({ title: 'Question updated', color: 'success' })
    } else {
      await apiFetch('/api/v1/admin/faqs', { method: 'POST', body: { ...form, sortOrder: items.value.length } })
      toast.add({ title: 'Question created', color: 'success' })
    }
    modalOpen.value = false
    await load()
  } catch { toast.add({ title: 'Error saving', color: 'error' }) }
  finally { saving.value = false }
}

async function doDelete() {
  if (!deletingFaq.value) return
  saving.value = true
  try {
    await apiFetch(`/api/v1/admin/faqs/${deletingFaq.value.id}`, { method: 'DELETE' })
    toast.add({ title: 'Question deleted', color: 'success' })
    deleteOpen.value = false
    await load()
  } catch { toast.add({ title: 'Error deleting', color: 'error' }) }
  finally { saving.value = false }
}

async function toggleVisibility(faq: FaqItem) {
  try {
    await apiFetch(`/api/v1/admin/faqs/${faq.id}`, { method: 'PUT', body: { isVisible: !faq.isVisible } })
    faq.isVisible = !faq.isVisible
    toast.add({ title: faq.isVisible ? 'FAQ visible' : 'FAQ hidden', color: 'success' })
  } catch { toast.add({ title: 'Error', color: 'error' }) }
}
</script>

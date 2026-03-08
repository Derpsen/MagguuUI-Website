<!--
  Admin — Changelog Management
  Stat cards, search, filter, pagination, CRUD modals
-->

<template>
  <div class="max-w-5xl mx-auto">
    <!-- Header Bar -->
    <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 admin-fade-in admin-stagger-1">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          :class="isDark ? 'bg-blue-500/10' : 'bg-blue-50'">
          <UIcon name="i-heroicons-document-text" class="w-5 h-5 text-blue-500" />
        </div>
        <div>
          <h2 class="text-lg font-semibold" :class="isDark ? 'text-white' : 'text-gray-900'">Changelog</h2>
          <p class="text-xs" :class="isDark ? 'text-silver-500' : 'text-gray-500'">{{ items.length }} entries</p>
        </div>
      </div>
      <UButton icon="i-heroicons-plus" size="sm" @click="openCreate">New Entry</UButton>
    </div>

    <!-- Filters + Search -->
    <div class="flex items-center gap-3 mb-4 admin-fade-in admin-stagger-2">
      <div class="flex items-center gap-2">
        <button v-for="f in statusFilters" :key="f.value"
          class="px-3 py-1.5 text-xs font-medium rounded-lg transition-all"
          :class="statusFilter === f.value
            ? 'bg-brand-400 text-white'
            : isDark ? 'text-silver-400 hover:text-white hover:bg-white/[0.03]' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'"
          @click="statusFilter = f.value; currentPage = 1">
          {{ f.label }}
          <span v-if="f.count !== undefined" class="ml-1 opacity-60">{{ f.count }}</span>
        </button>
      </div>
      <UInput v-model="searchQuery" icon="i-heroicons-magnifying-glass" placeholder="Search changelogs..." class="flex-1" @input="currentPage = 1" />
    </div>

    <!-- Loading -->
    <div v-if="loading" class="glass rounded-xl p-12 text-center">
      <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 text-brand-400 animate-spin mx-auto" />
    </div>

    <!-- Entry List -->
    <div v-else-if="paginatedItems.length" class="space-y-3 admin-fade-in admin-stagger-3">
      <div v-for="item in paginatedItems" :key="item.id"
        class="glass rounded-xl overflow-hidden transition-all hover:scale-[1.005]">
        <div class="flex items-start gap-4 p-5">
          <!-- Left: Version indicator -->
          <div class="flex-shrink-0 w-16 text-center pt-0.5">
            <template v-if="item.version === 'auto'">
              <div class="w-10 h-10 mx-auto rounded-lg flex items-center justify-center"
                :class="isDark ? 'bg-amber-500/10' : 'bg-amber-50'">
                <UIcon name="i-heroicons-bolt" class="w-5 h-5 text-amber-400" />
              </div>
              <p class="text-[10px] font-medium mt-1.5" :class="isDark ? 'text-silver-600' : 'text-gray-400'">Auto</p>
            </template>
            <template v-else>
              <div class="w-10 h-10 mx-auto rounded-lg flex items-center justify-center"
                :class="isDark ? 'bg-brand-400/10' : 'bg-blue-50'">
                <span class="text-sm font-bold" :class="isDark ? 'text-brand-300' : 'text-blue-600'">v{{ shortVersion(item.version) }}</span>
              </div>
              <p class="text-[10px] font-medium mt-1.5" :class="isDark ? 'text-silver-600' : 'text-gray-400'">Release</p>
            </template>
          </div>

          <!-- Center: Content -->
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 mb-1.5 flex-wrap">
              <span class="text-base font-semibold" :class="isDark ? 'text-white' : 'text-gray-900'">
                {{ item.version === 'auto' ? autoTitle(item) : `Version ${item.version}` }}
              </span>
              <span v-if="item.isPublished"
                class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold"
                :class="isDark ? 'bg-green-500/10 text-green-400' : 'bg-green-50 text-green-600'">
                <span class="w-1.5 h-1.5 rounded-full bg-current" /> Live
              </span>
              <span v-else
                class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold"
                :class="isDark ? 'bg-yellow-500/10 text-yellow-400' : 'bg-yellow-50 text-yellow-600'">
                <span class="w-1.5 h-1.5 rounded-full bg-current" /> Draft
              </span>
            </div>

            <p class="text-sm leading-relaxed line-clamp-2" :class="isDark ? 'text-silver-500' : 'text-gray-500'">
              {{ cleanPreview(item.content) }}
            </p>

            <p class="text-xs mt-2" :class="isDark ? 'text-silver-600' : 'text-gray-400'">
              {{ formatDateFull(item.publishedAt || item.createdAt) }}
              <span v-if="changeCount(item.content) > 0" class="ml-2">· {{ changeCount(item.content) }} change{{ changeCount(item.content) !== 1 ? 's' : '' }}</span>
            </p>
          </div>

          <!-- Right: Actions -->
          <div class="flex items-center gap-0.5 flex-shrink-0">
            <UButton icon="i-heroicons-pencil-square" variant="ghost" color="neutral" size="xs" @click="openEdit(item)" title="Edit" />
            <UButton :icon="item.isPublished ? 'i-heroicons-eye-slash' : 'i-heroicons-eye'" variant="ghost" color="neutral" size="xs" @click="togglePublish(item)" :title="item.isPublished ? 'Unpublish' : 'Publish'" />
            <UButton icon="i-heroicons-trash" variant="ghost" color="error" size="xs" @click="confirmDel(item)" title="Delete" />
          </div>
        </div>
      </div>

      <!-- Pagination -->
      <div v-if="totalPages > 1" class="glass rounded-xl flex items-center justify-between px-5 py-3">
        <p class="text-[11px] tabular-nums" :class="isDark ? 'text-silver-500' : 'text-gray-500'">
          Showing {{ (currentPage - 1) * PAGE_SIZE + 1 }}–{{ Math.min(currentPage * PAGE_SIZE, filteredAndSearched.length) }} of {{ filteredAndSearched.length }}
        </p>
        <div class="flex items-center gap-1">
          <UButton icon="i-heroicons-chevron-left" variant="ghost" color="neutral" size="xs" :disabled="currentPage <= 1" @click="currentPage--" />
          <template v-for="page in visiblePages" :key="page">
            <span v-if="page === '...'" class="px-1.5 text-xs" :class="isDark ? 'text-silver-600' : 'text-gray-400'">...</span>
            <UButton v-else
              :variant="currentPage === page ? 'solid' : 'ghost'"
              :color="currentPage === page ? 'primary' : 'neutral'"
              size="xs"
              :label="String(page)"
              @click="currentPage = page as number" />
          </template>
          <UButton icon="i-heroicons-chevron-right" variant="ghost" color="neutral" size="xs" :disabled="currentPage >= totalPages" @click="currentPage++" />
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else class="glass rounded-xl p-12 text-center admin-fade-in admin-stagger-3">
      <UIcon name="i-heroicons-document-text" class="w-12 h-12 mx-auto mb-4" :class="isDark ? 'text-silver-700' : 'text-gray-300'" />
      <p class="mb-4" :class="isDark ? 'text-silver-500' : 'text-gray-500'">
        <template v-if="isFiltering">No changelogs match your search or filter.</template>
        <template v-else>No changelog entries yet.</template>
      </p>
      <UButton v-if="isFiltering" icon="i-heroicons-x-mark" variant="subtle" @click="resetFilters">Clear filters</UButton>
      <UButton v-else icon="i-heroicons-plus" @click="openCreate">Create first entry</UButton>
    </div>

    <!-- Create/Edit Modal -->
    <UModal v-model:open="modalOpen" class="sm:max-w-3xl">
      <template #content>
        <div class="p-6">
          <h2 class="text-lg font-semibold mb-6" :class="isDark ? 'text-white' : 'text-gray-900'">
            {{ editing ? 'Edit Entry' : 'New Entry' }}
          </h2>

          <div class="space-y-4">
            <!-- Version + Publish -->
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium mb-1.5" :class="labelClass">Version *</label>
                <UInput v-model="form.version" placeholder="e.g. 2.1.0" :disabled="saving" />
                <p class="text-xs mt-1" :class="isDark ? 'text-silver-600' : 'text-gray-400'">Use "auto" for auto-generated entries</p>
              </div>
              <div class="flex items-end pb-6">
                <label class="flex items-center gap-2">
                  <USwitch v-model="form.isPublished" :disabled="saving" />
                  <span class="text-sm" :class="labelClass">Publish immediately</span>
                </label>
              </div>
            </div>

            <!-- Content Editor -->
            <div>
              <label class="block text-sm font-medium mb-1.5" :class="labelClass">Content *</label>
              <TipTapEditor v-model="form.content" placeholder="What changed in this version..." min-height="300px" />
            </div>

            <UAlert v-if="formError" color="error" variant="subtle" :title="formError" />
          </div>

          <div class="flex justify-end gap-3 mt-6 pt-4" :class="isDark ? 'border-t border-brand-400/10' : 'border-t border-gray-100'">
            <UButton variant="ghost" color="neutral" @click="modalOpen = false" :disabled="saving">Cancel</UButton>
            <UButton @click="save" :loading="saving" icon="i-heroicons-check">{{ editing ? 'Save' : 'Create' }}</UButton>
          </div>
        </div>
      </template>
    </UModal>

    <!-- Delete Modal -->
    <UModal v-model:open="delModal">
      <template #content>
        <div class="p-6">
          <div class="flex items-start gap-4">
            <div class="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center flex-shrink-0">
              <UIcon name="i-heroicons-exclamation-triangle" class="w-5 h-5 text-red-400" />
            </div>
            <div>
              <h2 class="text-lg font-semibold mb-2" :class="isDark ? 'text-white' : 'text-gray-900'">Delete entry?</h2>
              <p class="text-sm" :class="isDark ? 'text-silver-400' : 'text-gray-500'">
                <template v-if="delItem?.version === 'auto'">This auto-generated entry</template>
                <template v-else>Version <strong>{{ delItem?.version }}</strong></template>
                will be permanently deleted.
              </p>
            </div>
          </div>
          <div class="flex justify-end gap-3 mt-6 pt-4" :class="isDark ? 'border-t border-brand-400/10' : 'border-t border-gray-100'">
            <UButton variant="ghost" color="neutral" @click="delModal = false" :disabled="deleting">Cancel</UButton>
            <UButton color="error" @click="doDelete" :loading="deleting" icon="i-heroicons-trash">Delete</UButton>
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
const labelClass = computed(() => isDark.value ? 'text-silver-300' : 'text-gray-700')

// ─── Types & State ──────────────────────
interface Changelog {
  id: number; version: string; content: string; contentEn: string | null
  isPublished: boolean; publishedAt: string | null; createdAt: string
}

const items = ref<Changelog[]>([])
const loading = ref(true)
const modalOpen = ref(false)
const editing = ref<Changelog | null>(null)
const saving = ref(false)
const formError = ref('')
const form = reactive({ version: '', content: '', isPublished: false })
const delModal = ref(false)
const delItem = ref<Changelog | null>(null)
const deleting = ref(false)
const statusFilter = ref('all')
const searchQuery = ref('')
const currentPage = ref(1)
const PAGE_SIZE = 10

// ─── Filtering & Search ─────────────────
const filteredItems = computed(() => {
  if (statusFilter.value === 'all') return items.value
  if (statusFilter.value === 'published') return items.value.filter(i => i.isPublished)
  if (statusFilter.value === 'draft') return items.value.filter(i => !i.isPublished)
  if (statusFilter.value === 'auto') return items.value.filter(i => i.version === 'auto')
  return items.value
})

const filteredAndSearched = computed(() => {
  if (!searchQuery.value.trim()) return filteredItems.value
  const q = searchQuery.value.toLowerCase().trim()
  return filteredItems.value.filter(item => {
    const version = item.version.toLowerCase()
    const contentText = stripHtml(item.content).toLowerCase()
    return version.includes(q) || contentText.includes(q)
  })
})

const isFiltering = computed(() => statusFilter.value !== 'all' || searchQuery.value.trim().length > 0)

function resetFilters() {
  statusFilter.value = 'all'
  searchQuery.value = ''
  currentPage.value = 1
}

const statusFilters = computed(() => [
  { label: 'All', value: 'all', count: items.value.length },
  { label: 'Live', value: 'published', count: items.value.filter(i => i.isPublished).length },
  { label: 'Draft', value: 'draft', count: items.value.filter(i => !i.isPublished).length },
  { label: 'Auto', value: 'auto', count: items.value.filter(i => i.version === 'auto').length },
])

// ─── Pagination ─────────────────────────
const totalPages = computed(() => Math.max(1, Math.ceil(filteredAndSearched.value.length / PAGE_SIZE)))

const paginatedItems = computed(() => {
  const start = (currentPage.value - 1) * PAGE_SIZE
  return filteredAndSearched.value.slice(start, start + PAGE_SIZE)
})

const visiblePages = computed((): (number | string)[] => {
  const total = totalPages.value
  const current = currentPage.value
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1)
  }
  const pages: (number | string)[] = []
  pages.push(1)
  if (current > 3) pages.push('...')
  const start = Math.max(2, current - 1)
  const end = Math.min(total - 1, current + 1)
  for (let i = start; i <= end; i++) pages.push(i)
  if (current < total - 2) pages.push('...')
  pages.push(total)
  return pages
})

// Clamp currentPage when filteredAndSearched changes
watch(filteredAndSearched, () => {
  if (currentPage.value > totalPages.value) {
    currentPage.value = Math.max(1, totalPages.value)
  }
})

// ─── Helpers ────────────────────────────
function stripHtml(html: string) {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
}

function cleanPreview(html: string) {
  return stripHtml(html).replace(/^###?\s*/gm, '').replace(/^-\s*/gm, '• ').replace(/\*\*/g, '').substring(0, 250)
}

function shortVersion(v: string) {
  const parts = v.split('.')
  return parts.length >= 2 ? parts.slice(0, 2).join('.') : v
}

function autoTitle(item: Changelog) {
  const match = item.content?.match(/Changes\s+(\d{4}-\d{2}-\d{2})/)
  if (match) {
    const d = new Date(match[1])
    return `Changes — ${d.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })}`
  }
  return 'Auto-generated changes'
}

function changeCount(content: string) {
  const text = stripHtml(content)
  return (text.match(/•|—/g) || []).length || (content.match(/<li>/g) || []).length
}

function formatDateFull(d: string | number | null) {
  if (!d) return '—'
  const date = typeof d === 'number' ? new Date(d * 1000) : new Date(d)
  if (isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('en-US', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })
}

// ─── CRUD ───────────────────────────────
const route = useRoute()
async function load() {
  loading.value = true
  try { items.value = await apiFetch('/api/v1/admin/changelogs') }
  catch { toast.add({ title: 'Error', color: 'error' }) }
  finally { loading.value = false }
}
onMounted(() => {
  load()
  // Auto-open create modal when navigated with ?action=create
  if (route.query.action === 'create') { nextTick(() => openCreate()) }
})

function openCreate() {
  editing.value = null; formError.value = ''
  Object.assign(form, { version: '', content: '', isPublished: false })
  modalOpen.value = true
}

function openEdit(i: Changelog) {
  editing.value = i; formError.value = ''
  Object.assign(form, { version: i.version, content: i.content, isPublished: i.isPublished })
  modalOpen.value = true
}

async function save() {
  if (!form.version.trim() || !form.content.trim()) {
    formError.value = 'Version and content are required'
    return
  }
  saving.value = true; formError.value = ''
  try {
    // Save content to both content and contentEn for compatibility
    const body = { ...form, contentEn: form.content }
    if (editing.value) {
      await apiFetch(`/api/v1/admin/changelogs/${editing.value.id}`, { method: 'PUT', body })
      toast.add({ title: 'Entry updated', color: 'success' })
    } else {
      await apiFetch('/api/v1/admin/changelogs', { method: 'POST', body })
      toast.add({ title: 'Entry created', color: 'success' })
    }
    modalOpen.value = false
    await load()
  } catch (e: any) {
    formError.value = e?.data?.message || 'Error'
  } finally { saving.value = false }
}

async function togglePublish(i: Changelog) {
  try {
    await apiFetch(`/api/v1/admin/changelogs/${i.id}`, { method: 'PUT', body: { isPublished: !i.isPublished } })
    await load()
    toast.add({ title: i.isPublished ? 'Unpublished' : 'Published', color: 'success' })
  } catch { toast.add({ title: 'Error', color: 'error' }) }
}

function confirmDel(i: Changelog) { delItem.value = i; delModal.value = true }

async function doDelete() {
  if (!delItem.value) return
  deleting.value = true
  try {
    await apiFetch(`/api/v1/admin/changelogs/${delItem.value.id}`, { method: 'DELETE' })
    toast.add({ title: 'Entry deleted', color: 'success' })
    delModal.value = false
    await load()
  } catch { toast.add({ title: 'Error', color: 'error' }) }
  finally { deleting.value = false }
}
</script>

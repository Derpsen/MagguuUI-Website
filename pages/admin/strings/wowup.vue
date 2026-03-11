<template>
  <div class="space-y-6">
    <AdminPageHeader
      icon="i-heroicons-arrow-down-tray"
      eyebrow="Data"
      title="WowUp Strings"
      description="Keep package strings ordered, visible and ready for one-click addon installation."
    >
      <template #badge>
        <UBadge v-if="!loading && isFiltering" color="warning" variant="subtle">{{ filtered.length }} results</UBadge>
        <UBadge v-else-if="!loading" color="info" variant="subtle">{{ items.length }} total</UBadge>
      </template>

      <template #meta>
        <span v-if="lastUpdatedText && !loading" class="admin-pill">{{ lastUpdatedText }}</span>
      </template>

      <template #actions>
        <UButton icon="i-heroicons-plus" @click="openCreate">New String</UButton>
      </template>
    </AdminPageHeader>

    <div v-if="loading" class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <div v-for="i in 4" :key="i" class="admin-metric-card">
        <div class="flex items-center gap-3">
          <div class="h-10 w-10 rounded-2xl skeleton bg-slate-200/70 dark:bg-slate-800/70" />
          <div class="flex-1 space-y-2">
            <div class="h-7 w-14 rounded skeleton bg-slate-200/70 dark:bg-slate-800/70" />
            <div class="h-3 w-24 rounded skeleton bg-slate-200/70 dark:bg-slate-800/70" />
          </div>
        </div>
      </div>
    </div>

    <div v-else class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <AdminMetricCard
        v-for="stat in statCards"
        :key="stat.label"
        :label="stat.label"
        :value="stat.value"
        :icon="stat.icon"
        :tone="stat.tone"
      />
    </div>

    <div class="admin-filterbar">
      <UInput v-model="search" icon="i-heroicons-magnifying-glass" placeholder="Search package name" class="min-w-0 flex-1" />
    </div>

    <div v-if="selected.size" class="admin-bulkbar">
      <span class="text-sm font-semibold">{{ selected.size }} selected</span>
      <div class="flex-1" />
      <UButton size="sm" variant="ghost" color="neutral" @click="selected.clear()">Clear selection</UButton>
      <UButton size="sm" color="error" variant="subtle" icon="i-heroicons-trash" @click="bulkDelModal = true">
        Delete {{ selected.size }}
      </UButton>
    </div>

    <AdminPanel v-if="loading" title="WowUp inventory" description="Loading package strings from the database." icon="i-heroicons-arrow-down-tray">
      <div class="py-10 text-center">
        <UIcon name="i-heroicons-arrow-path" class="mx-auto h-8 w-8 animate-spin text-blue-500" />
      </div>
    </AdminPanel>

    <AdminPanel
      v-else-if="filtered.length"
      title="WowUp inventory"
      description="Maintain display visibility, copy actions and drag-and-drop ordering for package strings."
      icon="i-heroicons-arrow-down-tray"
    >
      <div class="admin-table-shell">
        <div class="overflow-x-auto">
          <table class="admin-table">
            <thead>
              <tr>
                <th class="w-10" />
                <th class="w-12">
                  <input
                    type="checkbox"
                    :checked="allVisibleSelected"
                    :indeterminate="someVisibleSelected && !allVisibleSelected"
                    class="rounded border-slate-300 bg-transparent text-blue-600 focus:ring-blue-500 focus:ring-offset-0"
                    @change="toggleSelectAll"
                  >
                </th>
                <th class="text-left">Name</th>
                <th class="text-center w-24">Visible</th>
                <th class="text-right w-36">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(item, idx) in filtered"
                :key="item.id"
                class="drag-row"
                :class="[
                  selected.has(item.id) ? 'bg-blue-50/70 dark:bg-blue-500/10' : '',
                  dragOverIdx === idx ? 'drag-over' : '',
                  dragIdx === idx ? 'dragging' : '',
                ]"
                draggable="true"
                @dragstart="onDragStart($event, idx)"
                @dragover.prevent="dragOverIdx = idx"
                @dragleave="dragOverIdx = null"
                @drop="onDrop($event, idx)"
                @dragend="resetDrag"
              >
                <td class="cursor-grab text-center text-slate-400 active:cursor-grabbing dark:text-slate-500">&#x283F;</td>
                <td>
                  <input
                    type="checkbox"
                    :checked="selected.has(item.id)"
                    class="rounded border-slate-300 bg-transparent text-blue-600 focus:ring-blue-500 focus:ring-offset-0"
                    @change="toggleSelect(item.id)"
                  >
                </td>
                <td>
                  <div>
                    <p class="text-sm font-semibold text-slate-950 dark:text-white">{{ item.name }}</p>
                    <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">{{ formatBytes(item.string?.length || 0) }}</p>
                  </div>
                </td>
                <td class="text-center">
                  <USwitch :model-value="item.isVisible" size="sm" @update:model-value="toggleVis(item)" />
                </td>
                <td>
                  <div class="flex items-center justify-end gap-1">
                    <UTooltip text="Edit">
                      <UButton icon="i-heroicons-pencil-square" variant="ghost" color="neutral" size="sm" @click="openEdit(item)" />
                    </UTooltip>
                    <UTooltip text="Copy String">
                      <UButton icon="i-heroicons-document-duplicate" variant="ghost" color="neutral" size="sm" @click="copyString(item)" />
                    </UTooltip>
                    <UTooltip text="Delete">
                      <UButton icon="i-heroicons-trash" variant="ghost" color="error" size="sm" @click="confirmDel(item)" />
                    </UTooltip>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <template #footer>
        <div class="flex w-full flex-wrap items-center justify-between gap-3 text-sm text-slate-500 dark:text-slate-400">
          <span>Showing {{ filtered.length }} of {{ items.length }}</span>
          <button
            v-if="isFiltering"
            class="font-medium text-blue-600 hover:text-blue-700 dark:text-blue-300 dark:hover:text-blue-200"
            @click="search = ''"
          >
            Clear filters
          </button>
        </div>
      </template>
    </AdminPanel>

    <AdminPanel v-else title="WowUp inventory" description="No package strings have been created yet." icon="i-heroicons-arrow-down-tray">
      <AdminEmptyState
        icon="i-heroicons-arrow-down-tray"
        title="No WowUp strings yet"
        description="Add the first package string so visitors can install the required addon bundle with one action."
      >
        <template #actions>
          <UButton icon="i-heroicons-plus" @click="openCreate">Create first string</UButton>
        </template>
      </AdminEmptyState>
    </AdminPanel>

    <UModal v-model:open="modalOpen">
      <template #content>
        <div class="p-6">
          <h2 class="text-lg font-semibold text-slate-950 dark:text-white">{{ editing ? 'Edit String' : 'New WowUp String' }}</h2>

          <div class="mt-6 space-y-4">
            <div>
              <label class="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Name *</label>
              <UInput v-model="form.name" placeholder="e.g. Required Addons" :disabled="saving" />
            </div>

            <div>
              <label class="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Import String *</label>
              <UTextarea v-model="form.string" :rows="6" :disabled="saving" class="font-mono text-xs" placeholder="WowUp String..." />
            </div>

            <div class="grid gap-4 sm:grid-cols-2">
              <div>
                <label class="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Sort Order</label>
                <UInput v-model.number="form.sortOrder" type="number" placeholder="0" :disabled="saving" />
              </div>
              <div class="flex items-end">
                <label class="flex items-center gap-2 pb-2">
                  <USwitch v-model="form.isVisible" :disabled="saving" />
                  <span class="text-sm text-slate-700 dark:text-slate-300">Visible</span>
                </label>
              </div>
            </div>

            <UAlert v-if="formError" color="error" variant="subtle" icon="i-heroicons-exclamation-circle" :title="formError" />
          </div>

          <div class="mt-6 flex justify-end gap-3 border-t border-slate-200 pt-4 dark:border-white/8">
            <UButton variant="ghost" color="neutral" :disabled="saving" @click="modalOpen = false">Cancel</UButton>
            <UButton :loading="saving" @click="save">{{ editing ? 'Save' : 'Create' }}</UButton>
          </div>
        </div>
      </template>
    </UModal>

    <UModal v-model:open="delModal">
      <template #content>
        <div class="p-6">
          <div class="flex items-start gap-4">
            <div class="admin-empty-state__icon admin-tone-danger h-10 w-10">
              <UIcon name="i-heroicons-exclamation-triangle" class="h-5 w-5" />
            </div>
            <div>
              <h2 class="text-lg font-semibold text-slate-950 dark:text-white">Delete string?</h2>
              <p class="mt-2 text-sm text-slate-500 dark:text-slate-400">
                <strong class="text-slate-950 dark:text-white">{{ delItem?.name }}</strong> will be permanently deleted.
              </p>
            </div>
          </div>

          <div class="mt-6 flex justify-end gap-3 border-t border-slate-200 pt-4 dark:border-white/8">
            <UButton variant="ghost" color="neutral" :disabled="deleting" @click="delModal = false">Cancel</UButton>
            <UButton color="error" :loading="deleting" @click="doDelete">Delete</UButton>
          </div>
        </div>
      </template>
    </UModal>

    <UModal v-model:open="bulkDelModal">
      <template #content>
        <div class="p-6">
          <div class="flex items-start gap-4">
            <div class="admin-empty-state__icon admin-tone-danger h-10 w-10">
              <UIcon name="i-heroicons-exclamation-triangle" class="h-5 w-5" />
            </div>
            <div>
              <h2 class="text-lg font-semibold text-slate-950 dark:text-white">Delete {{ selected.size }} strings?</h2>
              <p class="mt-2 text-sm text-slate-500 dark:text-slate-400">This action cannot be undone.</p>
            </div>
          </div>

          <div class="mt-6 flex justify-end gap-3 border-t border-slate-200 pt-4 dark:border-white/8">
            <UButton variant="ghost" color="neutral" :disabled="bulkDeleting" @click="bulkDelModal = false">Cancel</UButton>
            <UButton color="error" :loading="bulkDeleting" @click="bulkDelete">Delete {{ selected.size }}</UButton>
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

interface Item {
  id: number
  name: string
  string: string
  description: string | null
  sortOrder?: number
  isVisible: boolean
}

const items = ref<Item[]>([])
const loading = ref(true)
const search = ref('')
const selected = reactive(new Set<number>())
const modalOpen = ref(false)
const editing = ref<Item | null>(null)
const saving = ref(false)
const formError = ref('')
const form = reactive({ name: '', string: '', sortOrder: 0, isVisible: true })
const delModal = ref(false)
const delItem = ref<Item | null>(null)
const deleting = ref(false)
const bulkDelModal = ref(false)
const bulkDeleting = ref(false)

const dragIdx = ref<number | null>(null)
const dragOverIdx = ref<number | null>(null)

function onDragStart(event: DragEvent, idx: number) {
  dragIdx.value = idx
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', String(idx))
  }
}

function resetDrag() {
  dragIdx.value = null
  dragOverIdx.value = null
}

async function onDrop(event: DragEvent, toIdx: number) {
  event.preventDefault()
  const fromIdx = dragIdx.value
  resetDrag()
  if (fromIdx === null || fromIdx === toIdx) return

  const ordered = [...filtered.value]
  const [moved] = ordered.splice(fromIdx, 1)
  ordered.splice(toIdx, 0, moved)

  const idOrder = ordered.map(item => item.id)
  items.value = [...items.value].sort((a, b) => {
    const aIndex = idOrder.indexOf(a.id)
    const bIndex = idOrder.indexOf(b.id)
    if (aIndex === -1 && bIndex === -1) return 0
    if (aIndex === -1) return 1
    if (bIndex === -1) return -1
    return aIndex - bIndex
  })

  try {
    await apiFetch('/api/v1/admin/wowup/reorder', {
      method: 'POST',
      body: { items: ordered.map((item, idx) => ({ id: item.id, sortOrder: idx })) },
    })
  } catch {
    toast.add({ title: 'Error', color: 'error' })
  }
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  const kb = bytes / 1024
  if (kb < 1024) return `${kb.toFixed(1)} KB`
  const mb = kb / 1024
  return `${mb.toFixed(1)} MB`
}

const statCards = computed(() => {
  const visibleCount = items.value.filter(item => item.isVisible).length
  const hiddenCount = items.value.filter(item => !item.isVisible).length
  const totalLength = items.value.reduce((sum, item) => sum + (item.string?.length || 0), 0)
  const avgSize = items.value.length > 0 ? totalLength / items.value.length : 0

  return [
    { label: 'Total Strings', value: items.value.length, icon: 'i-heroicons-arrow-down-tray', tone: 'brand' as const },
    { label: 'Visible', value: visibleCount, icon: 'i-heroicons-eye', tone: 'success' as const },
    { label: 'Hidden', value: hiddenCount, icon: 'i-heroicons-eye-slash', tone: 'danger' as const },
    { label: 'Avg Size', value: formatBytes(avgSize), icon: 'i-heroicons-document-text', tone: 'warning' as const },
  ]
})

const isFiltering = computed(() => search.value.trim() !== '')
const filtered = computed(() => {
  if (!search.value) return items.value
  const query = search.value.toLowerCase()
  return items.value.filter(item => item.name.toLowerCase().includes(query))
})

const allVisibleSelected = computed(() =>
  filtered.value.length > 0 && filtered.value.every(item => selected.has(item.id)),
)

const someVisibleSelected = computed(() =>
  filtered.value.some(item => selected.has(item.id)),
)

function toggleSelect(id: number) {
  selected.has(id) ? selected.delete(id) : selected.add(id)
}

function toggleSelectAll() {
  if (allVisibleSelected.value) {
    filtered.value.forEach(item => selected.delete(item.id))
  } else {
    filtered.value.forEach(item => selected.add(item.id))
  }
}

const lastLoaded = ref<Date | null>(null)
const lastUpdatedText = ref('')
let lastUpdatedTimer: ReturnType<typeof setInterval>

function updateLastUpdatedText() {
  if (!lastLoaded.value) return
  const seconds = Math.floor((Date.now() - lastLoaded.value.getTime()) / 1000)
  if (seconds < 10) lastUpdatedText.value = 'Updated just now'
  else if (seconds < 60) lastUpdatedText.value = `Updated ${seconds}s ago`
  else if (seconds < 3600) lastUpdatedText.value = `Updated ${Math.floor(seconds / 60)}m ago`
  else lastUpdatedText.value = `Updated ${Math.floor(seconds / 3600)}h ago`
}

async function load() {
  loading.value = true
  try {
    items.value = await apiFetch('/api/v1/admin/wowup')
    lastLoaded.value = new Date()
    updateLastUpdatedText()
  } catch {
    toast.add({ title: 'Error', color: 'error' })
  } finally {
    loading.value = false
  }
}

const route = useRoute()

onMounted(() => {
  load()
  lastUpdatedTimer = setInterval(updateLastUpdatedText, 10000)
  if (route.query.action === 'create') nextTick(() => openCreate())
})

onUnmounted(() => {
  clearInterval(lastUpdatedTimer)
})

function openCreate() {
  editing.value = null
  formError.value = ''
  Object.assign(form, { name: '', string: '', sortOrder: 0, isVisible: true })
  modalOpen.value = true
}

function openEdit(item: Item) {
  editing.value = item
  formError.value = ''
  Object.assign(form, { name: item.name, string: item.string, sortOrder: item.sortOrder ?? 0, isVisible: item.isVisible })
  modalOpen.value = true
}

async function save() {
  if (!form.name.trim() || !form.string.trim()) {
    formError.value = 'Name and string are required'
    return
  }

  saving.value = true
  formError.value = ''

  try {
    if (editing.value) {
      await apiFetch(`/api/v1/admin/wowup/${editing.value.id}`, { method: 'PUT', body: { ...form } })
      toast.add({ title: 'Updated', color: 'success' })
    } else {
      await apiFetch('/api/v1/admin/wowup', { method: 'POST', body: { ...form } })
      toast.add({ title: 'Created', color: 'success' })
    }

    modalOpen.value = false
    await load()
  } catch (error: any) {
    formError.value = error?.data?.message || 'Error'
  } finally {
    saving.value = false
  }
}

async function toggleVis(item: Item) {
  try {
    await apiFetch(`/api/v1/admin/wowup/${item.id}`, { method: 'PATCH', body: { isVisible: !item.isVisible } })
    item.isVisible = !item.isVisible
  } catch {
    toast.add({ title: 'Error', color: 'error' })
  }
}

function confirmDel(item: Item) {
  delItem.value = item
  delModal.value = true
}

async function doDelete() {
  if (!delItem.value) return
  deleting.value = true
  try {
    await apiFetch(`/api/v1/admin/wowup/${delItem.value.id}`, { method: 'DELETE' })
    toast.add({ title: 'Deleted', color: 'success' })
    delModal.value = false
    await load()
  } catch {
    toast.add({ title: 'Error', color: 'error' })
  } finally {
    deleting.value = false
  }
}

async function bulkDelete() {
  bulkDeleting.value = true
  try {
    await apiFetch('/api/v1/admin/wowup/bulk-delete', { method: 'POST', body: { ids: [...selected] } })
    toast.add({ title: `${selected.size} strings deleted`, icon: 'i-heroicons-check-circle', color: 'success' })
    selected.clear()
    bulkDelModal.value = false
    await load()
  } catch {
    toast.add({ title: 'Error', color: 'error' })
  } finally {
    bulkDeleting.value = false
  }
}

async function copyString(item: Item) {
  try {
    await navigator.clipboard.writeText(item.string)
    toast.add({ title: `${item.name} copied`, icon: 'i-heroicons-clipboard-document-check', color: 'success' })
  } catch {
    const textarea = document.createElement('textarea')
    textarea.value = item.string
    textarea.style.cssText = 'position:fixed;opacity:0'
    document.body.appendChild(textarea)
    textarea.select()
    document.execCommand('copy')
    document.body.removeChild(textarea)
    toast.add({ title: `${item.name} copied`, icon: 'i-heroicons-clipboard-document-check', color: 'success' })
  }
}
</script>

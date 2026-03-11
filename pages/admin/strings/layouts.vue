<template>
  <div class="space-y-6">
    <AdminPageHeader
      icon="i-heroicons-user-circle"
      eyebrow="Data"
      title="Character Layouts"
      description="Organize class and specialization layouts with clearer metadata, visibility states and sorting."
    >
      <template #badge>
        <UBadge v-if="!loading && isFiltering" color="warning" variant="subtle">{{ filtered.length }} results</UBadge>
        <UBadge v-else-if="!loading" color="info" variant="subtle">{{ items.length }} total</UBadge>
      </template>

      <template #meta>
        <span v-if="lastUpdatedText && !loading" class="admin-pill">{{ lastUpdatedText }}</span>
      </template>

      <template #actions>
        <UButton icon="i-heroicons-plus" @click="openCreate">New Layout</UButton>
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
      <UInput v-model="search" icon="i-heroicons-magnifying-glass" placeholder="Search name, class, spec or description" class="min-w-0 flex-1" />
      <USelect v-model="classFilter" :items="classOptions" value-key="value" placeholder="All Classes" class="w-full sm:w-60" />
    </div>

    <div v-if="selected.size" class="admin-bulkbar">
      <span class="text-sm font-semibold">{{ selected.size }} selected</span>
      <div class="flex-1" />
      <UButton size="sm" variant="ghost" color="neutral" @click="selected.clear()">Clear selection</UButton>
      <UButton size="sm" color="error" variant="subtle" icon="i-heroicons-trash" @click="bulkDelModal = true">
        Delete {{ selected.size }}
      </UButton>
    </div>

    <AdminPanel
      v-if="loading"
      title="Layouts"
      description="Loading class and specialization layout inventory."
      icon="i-heroicons-user-circle"
    >
      <div class="py-10 text-center">
        <UIcon name="i-heroicons-arrow-path" class="mx-auto h-8 w-8 animate-spin text-blue-500" />
      </div>
    </AdminPanel>

    <AdminPanel
      v-else-if="filtered.length"
      title="Layouts"
      description="Review layout coverage across classes and keep public visibility under control."
      icon="i-heroicons-user-circle"
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
                <th class="text-left">Class</th>
                <th class="text-left">Specialization</th>
                <th class="hidden text-left lg:table-cell">Description</th>
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
                  <UBadge variant="subtle" color="info">{{ item.className || 'Unknown' }}</UBadge>
                </td>
                <td>
                  <div>
                    <p class="text-sm font-semibold text-slate-950 dark:text-white">{{ item.spec || item.name }}</p>
                    <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">{{ item.name }}</p>
                  </div>
                </td>
                <td class="hidden lg:table-cell">
                  <span class="block max-w-sm truncate text-sm text-slate-500 dark:text-slate-400">{{ item.description || '-' }}</span>
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
            @click="search = ''; classFilter = ''"
          >
            Clear filters
          </button>
        </div>
      </template>
    </AdminPanel>

    <AdminPanel v-else title="Layouts" description="No class layouts have been created yet." icon="i-heroicons-user-circle">
      <AdminEmptyState
        icon="i-heroicons-user-circle"
        title="No layouts yet"
        description="Create the first class layout to expose ready-made interface setups for visitors."
      >
        <template #actions>
          <UButton icon="i-heroicons-plus" @click="openCreate">Create first layout</UButton>
        </template>
      </AdminEmptyState>
    </AdminPanel>

    <UModal v-model:open="modalOpen">
      <template #content>
        <div class="p-6">
          <h2 class="text-lg font-semibold text-slate-950 dark:text-white">{{ editing ? 'Edit Layout' : 'New Layout' }}</h2>

          <div class="mt-6 space-y-4">
            <div>
              <label class="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Name *</label>
              <UInput v-model="form.name" placeholder="e.g. Holy Paladin Raid" :disabled="saving" />
            </div>

            <div class="grid gap-4 sm:grid-cols-2">
              <div>
                <label class="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Class</label>
                <UInput v-model="form.className" placeholder="e.g. Paladin" :disabled="saving" />
              </div>
              <div>
                <label class="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Specialization</label>
                <UInput v-model="form.spec" placeholder="e.g. Holy" :disabled="saving" />
              </div>
            </div>

            <div>
              <label class="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Description</label>
              <UInput v-model="form.description" :disabled="saving" />
            </div>

            <div>
              <label class="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Import String</label>
              <UTextarea v-model="form.importString" :rows="6" :disabled="saving" class="font-mono text-xs" placeholder="ElvUI Layout String..." />
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
              <h2 class="text-lg font-semibold text-slate-950 dark:text-white">Delete layout?</h2>
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
              <h2 class="text-lg font-semibold text-slate-950 dark:text-white">Delete {{ selected.size }} layouts?</h2>
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

interface Layout {
  id: number
  name: string
  className: string | null
  spec: string | null
  description: string | null
  importString: string | null
  sortOrder: number
  isVisible: boolean
}

const items = ref<Layout[]>([])
const loading = ref(true)
const search = ref('')
const classFilter = ref('')
const selected = reactive(new Set<number>())
const modalOpen = ref(false)
const editing = ref<Layout | null>(null)
const saving = ref(false)
const formError = ref('')
const form = reactive({ name: '', className: '', spec: '', description: '', importString: '', sortOrder: 0, isVisible: true })
const delModal = ref(false)
const delItem = ref<Layout | null>(null)
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
    await apiFetch('/api/v1/admin/layouts/reorder', {
      method: 'POST',
      body: { items: ordered.map((item, idx) => ({ id: item.id, sortOrder: idx })) },
    })
  } catch {
    toast.add({ title: 'Error', color: 'error' })
  }
}

const statCards = computed(() => {
  const visibleCount = items.value.filter(item => item.isVisible).length
  const uniqueClasses = new Set(items.value.map(item => item.className).filter(Boolean)).size
  const uniqueSpecs = new Set(items.value.map(item => item.spec).filter(Boolean)).size

  return [
    { label: 'Total Layouts', value: items.value.length, icon: 'i-heroicons-user-circle', tone: 'brand' as const },
    { label: 'Visible', value: visibleCount, icon: 'i-heroicons-eye', tone: 'success' as const },
    { label: 'Classes', value: uniqueClasses, icon: 'i-heroicons-shield-check', tone: 'violet' as const },
    { label: 'Specs', value: uniqueSpecs, icon: 'i-heroicons-star', tone: 'warning' as const },
  ]
})

const isFiltering = computed(() => search.value.trim() !== '' || classFilter.value !== '')
const classOptions = computed(() => {
  const classes = [...new Set(items.value.map(item => item.className).filter(Boolean))].sort()
  return [{ label: 'All Classes', value: '' }, ...classes.map(className => ({ label: className!, value: className! }))]
})

const filtered = computed(() => {
  let result = items.value
  if (classFilter.value) result = result.filter(item => item.className === classFilter.value)
  if (search.value) {
    const query = search.value.toLowerCase()
    result = result.filter(item =>
      item.name.toLowerCase().includes(query)
      || item.className?.toLowerCase().includes(query)
      || item.spec?.toLowerCase().includes(query)
      || item.description?.toLowerCase().includes(query),
    )
  }
  return result
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
    items.value = await apiFetch<Layout[]>('/api/v1/admin/layouts')
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
  Object.assign(form, { name: '', className: '', spec: '', description: '', importString: '', sortOrder: 0, isVisible: true })
  modalOpen.value = true
}

function openEdit(item: Layout) {
  editing.value = item
  formError.value = ''
  Object.assign(form, {
    name: item.name,
    className: item.className || '',
    spec: item.spec || '',
    description: item.description || '',
    importString: item.importString || '',
    sortOrder: item.sortOrder,
    isVisible: item.isVisible,
  })
  modalOpen.value = true
}

async function save() {
  if (!form.name.trim()) {
    formError.value = 'Name is required'
    return
  }

  saving.value = true
  formError.value = ''

  try {
    if (editing.value) {
      await apiFetch(`/api/v1/admin/layouts/${editing.value.id}`, { method: 'PUT', body: { ...form } })
      toast.add({ title: 'Layout updated', color: 'success' })
    } else {
      await apiFetch('/api/v1/admin/layouts', { method: 'POST', body: { ...form } })
      toast.add({ title: 'Layout created', color: 'success' })
    }

    modalOpen.value = false
    await load()
  } catch (error: any) {
    formError.value = error?.data?.message || 'Error'
  } finally {
    saving.value = false
  }
}

async function toggleVis(item: Layout) {
  try {
    await apiFetch(`/api/v1/admin/layouts/${item.id}`, { method: 'PATCH', body: { isVisible: !item.isVisible } })
    item.isVisible = !item.isVisible
  } catch {
    toast.add({ title: 'Error', color: 'error' })
  }
}

function confirmDel(item: Layout) {
  delItem.value = item
  delModal.value = true
}

async function doDelete() {
  if (!delItem.value) return
  deleting.value = true
  try {
    await apiFetch(`/api/v1/admin/layouts/${delItem.value.id}`, { method: 'DELETE' })
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
    await apiFetch('/api/v1/admin/layouts/bulk-delete', { method: 'POST', body: { ids: [...selected] } })
    toast.add({ title: `${selected.size} layouts deleted`, icon: 'i-heroicons-check-circle', color: 'success' })
    selected.clear()
    bulkDelModal.value = false
    await load()
  } catch {
    toast.add({ title: 'Error', color: 'error' })
  } finally {
    bulkDeleting.value = false
  }
}

async function copyString(item: Layout) {
  if (!item.importString) {
    toast.add({ title: 'No import string available', color: 'warning' })
    return
  }

  try {
    await navigator.clipboard.writeText(item.importString)
    toast.add({ title: `${item.className || item.name} copied`, icon: 'i-heroicons-clipboard-document-check', color: 'success' })
  } catch {
    const textarea = document.createElement('textarea')
    textarea.value = item.importString
    textarea.style.cssText = 'position:fixed;opacity:0'
    document.body.appendChild(textarea)
    textarea.select()
    document.execCommand('copy')
    document.body.removeChild(textarea)
    toast.add({ title: `${item.className || item.name} copied`, icon: 'i-heroicons-clipboard-document-check', color: 'success' })
  }
}
</script>

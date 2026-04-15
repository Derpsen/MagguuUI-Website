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
      <AdminMetricCard v-for="stat in statCards" :key="stat.label" v-bind="stat" />
    </div>

    <div class="admin-filterbar">
      <UInput v-model="search" icon="i-heroicons-magnifying-glass" placeholder="Search name, class, spec or description" class="min-w-0 flex-1" />
      <USelect v-model="classFilter" :items="classOptions" value-key="value" placeholder="All Classes" class="w-full sm:w-60" />
    </div>

    <div v-if="selected.size" class="admin-bulkbar">
      <span class="text-sm font-semibold">{{ selected.size }} selected</span>
      <div class="flex-1" />
      <UButton size="sm" variant="ghost" color="neutral" @click="selected.clear()">Clear selection</UButton>
      <UButton size="sm" color="error" variant="subtle" icon="i-heroicons-trash" @click="bulkDeleteModalOpen = true">Delete {{ selected.size }}</UButton>
    </div>

    <AdminPanel v-if="loading" title="Layouts" description="Loading class and specialization layout inventory." icon="i-heroicons-user-circle">
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
      <AdminStringTable
        :items="filtered"
        :columns="columns"
        :selected="selected"
        :drag-idx="dragIdx"
        :drag-over-idx="dragOverIdx"
        :all-selected="isAllSelected(filtered)"
        :some-selected="isSomeSelected(filtered)"
        string-field="importString"
        @toggle-select="toggleSelect"
        @toggle-select-all="toggleSelectAll(filtered)"
        @drag-start="onDragStart"
        @drag-over="(idx: number) => dragOverIdx = idx"
        @drop="(e: DragEvent, idx: number) => onDrop(e, idx, filtered)"
        @drag-end="resetDrag"
        @toggle-visibility="toggleVisibility"
        @edit="openEdit"
        @copy="copyString"
        @delete="confirmDelete"
      >
        <template #cell-className="{ item }">
          <UBadge variant="subtle" color="info">{{ item.className || 'Unknown' }}</UBadge>
        </template>
        <template #cell-spec="{ item }">
          <div>
            <p class="text-sm font-semibold text-slate-950 dark:text-white">{{ item.spec || item.name }}</p>
            <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">{{ item.name }}</p>
          </div>
        </template>
        <template #cell-description="{ item }">
          <span class="block max-w-sm truncate text-sm text-slate-500 dark:text-slate-400">{{ item.description || '-' }}</span>
        </template>
      </AdminStringTable>

      <template #footer>
        <div class="flex w-full flex-wrap items-center justify-between gap-3 text-sm text-slate-500 dark:text-slate-400">
          <span>Showing {{ filtered.length }} of {{ items.length }}</span>
          <button v-if="isFiltering" class="font-medium text-blue-600 hover:text-blue-700 dark:text-blue-300 dark:hover:text-blue-200" @click="search = ''; classFilter = ''">Clear filters</button>
        </div>
      </template>
    </AdminPanel>

    <AdminPanel v-else title="Layouts" description="No class layouts have been created yet." icon="i-heroicons-user-circle">
      <AdminEmptyState icon="i-heroicons-user-circle" title="No layouts yet" description="Create the first class layout to expose ready-made interface setups for visitors.">
        <template #actions>
          <UButton icon="i-heroicons-plus" @click="openCreate">Create first layout</UButton>
        </template>
      </AdminEmptyState>
    </AdminPanel>

    <AdminCrudModal :open="modalOpen" :title="editingItem ? 'Edit Layout' : 'New Layout'" :saving="saving" :error="formError" @update:open="modalOpen = $event" @save="handleSave">
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
    </AdminCrudModal>

    <UModal v-model:open="deleteModalOpen">
      <template #content>
        <div class="p-6">
          <div class="flex items-start gap-4">
            <div class="admin-empty-state__icon admin-tone-danger h-10 w-10">
              <UIcon name="i-heroicons-exclamation-triangle" class="h-5 w-5" />
            </div>
            <div>
              <h2 class="text-lg font-semibold text-slate-950 dark:text-white">Delete layout?</h2>
              <p class="mt-2 text-sm text-slate-500 dark:text-slate-400">
                <strong class="text-slate-950 dark:text-white">{{ deletingItem?.name }}</strong> will be permanently deleted.
              </p>
            </div>
          </div>
          <div class="mt-6 flex justify-end gap-3 border-t border-slate-200 pt-4 dark:border-white/8">
            <UButton variant="ghost" color="neutral" @click="deleteModalOpen = false">Cancel</UButton>
            <UButton color="error" @click="doDelete">Delete</UButton>
          </div>
        </div>
      </template>
    </UModal>

    <UModal v-model:open="bulkDeleteModalOpen">
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
            <UButton variant="ghost" color="neutral" @click="bulkDeleteModalOpen = false">Cancel</UButton>
            <UButton color="error" @click="doBulkDelete">Delete {{ selected.size }}</UButton>
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'admin' })

interface Layout {
  id: number
  isVisible: boolean
  sortOrder: number
  name: string
  className: string | null
  spec: string | null
  description: string | null
  importString: string
  [key: string]: unknown
}

const {
  items, loading, search, selected,
  modalOpen, form, formError, saving, editingItem,
  deleteModalOpen, deletingItem, bulkDeleteModalOpen,
  lastUpdatedText,
  dragIdx, dragOverIdx,
  isAllSelected, isSomeSelected,
  toggleSelect, toggleSelectAll,
  onDragStart, onDrop, resetDrag,
  openCreate, openEdit, save,
  toggleVisibility, confirmDelete, doDelete, doBulkDelete,
  copyString, setupLifecycle,
} = useStringManager<Layout>({
  apiBase: '/api/v1/admin/layouts',
  entityName: 'layout',
  entityNamePlural: 'layouts',
  stringField: 'importString',
  defaultForm: () => ({ name: '', className: '', spec: '', description: '', importString: '', sortOrder: 0, isVisible: true }),
})

setupLifecycle()

const classFilter = ref('')

const isFiltering = computed(() => search.value.trim() !== '' || classFilter.value !== '')

const classOptions = computed(() => {
  const classes = [...new Set(items.value.map(i => i.className).filter((c): c is string => Boolean(c)))].sort()
  return [{ label: 'All Classes', value: '' }, ...classes.map(c => ({ label: c, value: c }))]
})

const filtered = computed(() => {
  let result = items.value
  if (classFilter.value) result = result.filter(i => i.className === classFilter.value)
  if (search.value) {
    const q = search.value.toLowerCase()
    result = result.filter(i =>
      i.name.toLowerCase().includes(q)
      || i.className?.toLowerCase().includes(q)
      || i.spec?.toLowerCase().includes(q)
      || i.description?.toLowerCase().includes(q),
    )
  }
  return result
})

const columns = [
  { key: 'className', label: 'Class' },
  { key: 'spec', label: 'Specialization' },
  { key: 'description', label: 'Description', class: 'hidden lg:table-cell' },
]

const statCards = computed(() => {
  const visibleCount = items.value.filter(i => i.isVisible).length
  const uniqueClasses = new Set(items.value.map(i => i.className).filter(Boolean)).size
  const uniqueSpecs = new Set(items.value.map(i => i.spec).filter(Boolean)).size
  return [
    { label: 'Total Layouts', value: items.value.length, icon: 'i-heroicons-user-circle', tone: 'brand' as const },
    { label: 'Visible', value: visibleCount, icon: 'i-heroicons-eye', tone: 'success' as const },
    { label: 'Classes', value: uniqueClasses, icon: 'i-heroicons-shield-check', tone: 'violet' as const },
    { label: 'Specs', value: uniqueSpecs, icon: 'i-heroicons-star', tone: 'warning' as const },
  ]
})

function handleSave() {
  if (!form.value.name?.trim()) {
    formError.value = 'Name is required'
    return
  }
  save()
}
</script>

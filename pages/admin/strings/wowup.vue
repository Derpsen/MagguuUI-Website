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

    <!-- Stat cards -->
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

    <!-- Filter bar -->
    <div class="admin-filterbar">
      <UInput v-model="search" icon="i-heroicons-magnifying-glass" placeholder="Search package name" class="min-w-0 flex-1" />
    </div>

    <!-- Bulk bar -->
    <div v-if="selected.size" class="admin-bulkbar">
      <span class="text-sm font-semibold">{{ selected.size }} selected</span>
      <div class="flex-1" />
      <UButton size="sm" variant="ghost" color="neutral" @click="selected.clear()">Clear selection</UButton>
      <UButton size="sm" color="error" variant="subtle" icon="i-heroicons-trash" @click="bulkDeleteModalOpen = true">Delete {{ selected.size }}</UButton>
    </div>

    <!-- Loading -->
    <AdminPanel v-if="loading" title="WowUp inventory" description="Loading package strings from the database." icon="i-heroicons-arrow-down-tray">
      <div class="py-10 text-center">
        <UIcon name="i-heroicons-arrow-path" class="mx-auto h-8 w-8 animate-spin text-blue-500" />
      </div>
    </AdminPanel>

    <!-- Table -->
    <AdminPanel v-else-if="filtered.length" title="WowUp inventory" description="Maintain display visibility, copy actions and drag-and-drop ordering for package strings." icon="i-heroicons-arrow-down-tray">
      <AdminStringTable
        :items="filtered"
        :columns="[{ key: 'name', label: 'Name' }]"
        :selected="selected"
        :drag-idx="dragIdx"
        :drag-over-idx="dragOverIdx"
        :all-selected="isAllSelected(filtered)"
        :some-selected="isSomeSelected(filtered)"
        string-field="string"
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
        <template #cell-name="{ item }">
          <p class="text-sm font-semibold text-slate-950 dark:text-white">{{ item.name }}</p>
          <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">{{ formatBytes(item.string?.length || 0) }}</p>
        </template>
      </AdminStringTable>

      <template #footer>
        <div class="flex w-full flex-wrap items-center justify-between gap-3 text-sm text-slate-500 dark:text-slate-400">
          <span>Showing {{ filtered.length }} of {{ items.length }}</span>
          <button v-if="isFiltering" class="font-medium text-blue-600 hover:text-blue-700 dark:text-blue-300 dark:hover:text-blue-200" @click="search = ''">Clear filters</button>
        </div>
      </template>
    </AdminPanel>

    <!-- Empty state -->
    <AdminPanel v-else title="WowUp inventory" description="No package strings have been created yet." icon="i-heroicons-arrow-down-tray">
      <AdminEmptyState icon="i-heroicons-arrow-down-tray" title="No WowUp strings yet" description="Add the first package string so visitors can install the required addon bundle with one action.">
        <template #actions>
          <UButton icon="i-heroicons-plus" @click="openCreate">Create first string</UButton>
        </template>
      </AdminEmptyState>
    </AdminPanel>

    <!-- Create / Edit modal -->
    <AdminCrudModal :open="modalOpen" :title="editingItem ? 'Edit String' : 'New WowUp String'" :saving="saving" :error="formError" @update:open="modalOpen = $event" @save="save()">
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
    </AdminCrudModal>

    <!-- Delete confirmation -->
    <UModal v-model:open="deleteModalOpen">
      <template #content>
        <div class="p-6">
          <div class="flex items-start gap-4">
            <div class="admin-empty-state__icon admin-tone-danger h-10 w-10">
              <UIcon name="i-heroicons-exclamation-triangle" class="h-5 w-5" />
            </div>
            <div>
              <h2 class="text-lg font-semibold text-slate-950 dark:text-white">Delete string?</h2>
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

    <!-- Bulk delete confirmation -->
    <UModal v-model:open="bulkDeleteModalOpen">
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

interface WowUpString {
  id: number
  isVisible: boolean
  sortOrder: number
  name: string
  string: string
  category?: string | null
  description?: string | null
  [key: string]: unknown
}

const {
  items, loading, search, selected,
  lastUpdatedText,
  modalOpen, form, formError, saving, editingItem,
  deleteModalOpen, deletingItem, bulkDeleteModalOpen,
  dragIdx, dragOverIdx,
  isAllSelected, isSomeSelected,
  onDragStart, onDrop, resetDrag,
  openCreate, openEdit, save,
  toggleVisibility, confirmDelete, doDelete, doBulkDelete,
  copyString, toggleSelect, toggleSelectAll,
  setupLifecycle,
} = useStringManager<WowUpString>({
  apiBase: '/api/v1/admin/wowup',
  entityName: 'string',
  entityNamePlural: 'strings',
  stringField: 'string',
  defaultForm: () => ({ name: '', string: '', sortOrder: 0, isVisible: true }),
})

setupLifecycle()

// --- Page-specific ---

const isFiltering = computed(() => search.value.trim() !== '')

const filtered = computed(() => {
  if (!search.value) return items.value
  const q = search.value.toLowerCase()
  return items.value.filter(item => item.name.toLowerCase().includes(q))
})

const statCards = computed(() => {
  const visible = items.value.filter(i => i.isVisible).length
  const hidden = items.value.filter(i => !i.isVisible).length
  const total = items.value.reduce((sum, i) => sum + (i.string?.length || 0), 0)
  const avg = items.value.length > 0 ? total / items.value.length : 0

  return [
    { label: 'Total Strings', value: items.value.length, icon: 'i-heroicons-arrow-down-tray', tone: 'brand' as const },
    { label: 'Visible', value: visible, icon: 'i-heroicons-eye', tone: 'success' as const },
    { label: 'Hidden', value: hidden, icon: 'i-heroicons-eye-slash', tone: 'danger' as const },
    { label: 'Avg Size', value: formatBytes(avg), icon: 'i-heroicons-document-text', tone: 'warning' as const },
  ]
})
</script>

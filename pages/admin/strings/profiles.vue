<template>
  <div class="space-y-6">
    <AdminPageHeader
      icon="i-heroicons-cube"
      eyebrow="Data"
      title="Addon Profiles"
      description="Manage addon import strings, visibility states and ordering from one clean inventory."
    >
      <template #badge>
        <UBadge v-if="!loading && isFiltering" color="warning" variant="subtle">{{ filteredProfiles.length }} results</UBadge>
        <UBadge v-else-if="!loading" color="info" variant="subtle">{{ items.length }} total</UBadge>
      </template>
      <template #meta>
        <span v-if="lastUpdatedText && !loading" class="admin-pill">{{ lastUpdatedText }}</span>
      </template>
      <template #actions>
        <UButton icon="i-heroicons-plus" @click="openCreate">New Profile</UButton>
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
      <UInput v-model="search" icon="i-heroicons-magnifying-glass" placeholder="Search addon or profile" class="min-w-0 flex-1" />
      <USelect v-model="addonFilter" :items="addonOptions" value-key="value" placeholder="All Addons" class="w-full sm:w-60" />
    </div>

    <div v-if="selected.size" class="admin-bulkbar">
      <span class="text-sm font-semibold">{{ selected.size }} selected</span>
      <div class="flex-1" />
      <UButton size="sm" variant="ghost" color="neutral" @click="selected.clear()">Clear selection</UButton>
      <UButton size="sm" color="error" variant="subtle" icon="i-heroicons-trash" @click="bulkDeleteModalOpen = true">
        Delete {{ selected.size }}
      </UButton>
    </div>

    <AdminPanel v-if="loading" title="Profiles" description="Loading the latest addon import inventory." icon="i-heroicons-cube">
      <div class="py-10 text-center">
        <UIcon name="i-heroicons-arrow-path" class="mx-auto h-8 w-8 animate-spin text-blue-500" />
      </div>
    </AdminPanel>

    <AdminPanel
      v-else-if="filteredProfiles.length"
      title="Profiles"
      description="Reorder by drag and drop, toggle visibility instantly and batch-delete when needed."
      icon="i-heroicons-cube"
    >
      <AdminStringTable
        :items="filteredProfiles"
        :columns="columns"
        :selected="selected"
        :drag-idx="dragIdx"
        :drag-over-idx="dragOverIdx"
        :all-selected="isAllSelected(filteredProfiles)"
        :some-selected="isSomeSelected(filteredProfiles)"
        string-field="string"
        @toggle-select="toggleSelect"
        @toggle-select-all="toggleSelectAll(filteredProfiles)"
        @drag-start="onDragStart"
        @drag-over="(idx) => dragOverIdx = idx"
        @drop="(e, idx) => onDrop(e, idx, filteredProfiles)"
        @drag-end="resetDrag"
        @toggle-visibility="toggleVisibility"
        @edit="openEdit"
        @copy="copyString"
        @delete="confirmDelete"
      >
        <template #cell-addon="{ value }">
          <UBadge variant="subtle" color="info">{{ value }}</UBadge>
        </template>
        <template #cell-profile="{ item }">
          <p class="text-sm font-semibold text-slate-950 dark:text-white">{{ item.profile }}</p>
          <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">Sort #{{ item.sortOrder }}</p>
        </template>
      </AdminStringTable>

      <template #footer>
        <div class="flex w-full flex-wrap items-center justify-between gap-3 text-sm text-slate-500 dark:text-slate-400">
          <span>Showing {{ filteredProfiles.length }} of {{ items.length }}</span>
          <button
            v-if="isFiltering"
            class="font-medium text-blue-600 hover:text-blue-700 dark:text-blue-300 dark:hover:text-blue-200"
            @click="search = ''; addonFilter = ''"
          >Clear filters</button>
        </div>
      </template>
    </AdminPanel>

    <AdminPanel v-else title="Profiles" description="Your addon inventory is still empty." icon="i-heroicons-cube">
      <AdminEmptyState icon="i-heroicons-cube" title="No profiles yet" description="Create the first addon profile to make import strings available on the public site.">
        <template #actions>
          <UButton icon="i-heroicons-plus" @click="openCreate">Create first profile</UButton>
        </template>
      </AdminEmptyState>
    </AdminPanel>

    <!-- Create / Edit modal -->
    <AdminCrudModal :open="modalOpen" :title="editingItem ? 'Edit Profile' : 'New Profile'" :saving="saving" :error="formError" @update:open="modalOpen = $event" @save="save()">
      <div class="grid gap-4 sm:grid-cols-2">
        <div>
          <label class="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Addon *</label>
          <UInput v-model="form.addon" placeholder="e.g. ElvUI, Plater, Details!" :disabled="saving" />
        </div>
        <div>
          <label class="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Profile Name *</label>
          <UInput v-model="form.profile" placeholder="e.g. MagguuUI Default" :disabled="saving" />
        </div>
      </div>
      <div>
        <label class="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Import String *</label>
        <UTextarea v-model="form.string" :rows="6" :disabled="saving" class="font-mono text-xs" placeholder="Import string..." />
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
              <h2 class="text-lg font-semibold text-slate-950 dark:text-white">Delete profile?</h2>
              <p class="mt-2 text-sm text-slate-500 dark:text-slate-400">
                <strong class="text-slate-950 dark:text-white">{{ deletingItem?.addon }}</strong> - {{ deletingItem?.profile }} will be permanently deleted.
              </p>
            </div>
          </div>
          <div class="mt-6 flex justify-end gap-3 border-t border-slate-200 pt-4 dark:border-white/8">
            <UButton variant="ghost" color="neutral" @click="deleteModalOpen = false">Cancel</UButton>
            <UButton color="error" :loading="deletingLoading" @click="doDelete">Delete</UButton>
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
              <h2 class="text-lg font-semibold text-slate-950 dark:text-white">Delete {{ selected.size }} profiles?</h2>
              <p class="mt-2 text-sm text-slate-500 dark:text-slate-400">This action cannot be undone.</p>
            </div>
          </div>
          <div class="mt-6 flex justify-end gap-3 border-t border-slate-200 pt-4 dark:border-white/8">
            <UButton variant="ghost" color="neutral" @click="bulkDeleteModalOpen = false">Cancel</UButton>
            <UButton color="error" :loading="bulkDeletingLoading" @click="doBulkDelete">Delete {{ selected.size }}</UButton>
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'admin' })

const {
  items, loading, search, selected,
  modalOpen, form, formError, saving, editingItem,
  deleteModalOpen, deletingItem, bulkDeleteModalOpen,
  lastUpdatedText,
  dragIdx, dragOverIdx,
  isAllSelected, isSomeSelected,
  onDragStart, onDrop, resetDrag,
  openCreate, openEdit, save, toggleVisibility,
  confirmDelete, doDelete, doBulkDelete,
  copyString, toggleSelect, toggleSelectAll,
  setupLifecycle,
} = useStringManager({
  apiBase: '/api/v1/admin/profiles',
  entityName: 'profile',
  entityNamePlural: 'profiles',
  stringField: 'string',
  defaultForm: () => ({ addon: '', profile: '', string: '', sortOrder: 0, isVisible: true }),
})

setupLifecycle()

// --- Page-specific: addon filter ---
const addonFilter = ref('')

const isFiltering = computed(() => search.value.trim() !== '' || addonFilter.value !== '')

const addonOptions = computed(() => {
  const addons = [...new Set(items.value.map((p: any) => p.addon))].sort()
  return [{ label: 'All Addons', value: '' }, ...addons.map(a => ({ label: a, value: a }))]
})

const filteredProfiles = computed(() => {
  let result = items.value
  if (addonFilter.value) result = result.filter((p: any) => p.addon === addonFilter.value)
  if (search.value) {
    const q = search.value.toLowerCase()
    result = result.filter((p: any) => p.addon.toLowerCase().includes(q) || p.profile.toLowerCase().includes(q))
  }
  return result
})

// --- Page-specific: stat cards with unique "Addons" metric ---
const statCards = computed(() => {
  const visible = items.value.filter((p: any) => p.isVisible).length
  const hidden = items.value.filter((p: any) => !p.isVisible).length
  const uniqueAddons = new Set(items.value.map((p: any) => p.addon)).size
  return [
    { label: 'Total Profiles', value: items.value.length, icon: 'i-heroicons-cube', tone: 'brand' as const },
    { label: 'Visible', value: visible, icon: 'i-heroicons-eye', tone: 'success' as const },
    { label: 'Hidden', value: hidden, icon: 'i-heroicons-eye-slash', tone: 'danger' as const },
    { label: 'Addons', value: uniqueAddons, icon: 'i-heroicons-puzzle-piece', tone: 'violet' as const },
  ]
})

// --- Table column config ---
const columns = [
  { key: 'addon', label: 'Addon' },
  { key: 'profile', label: 'Profile' },
]

// Loading states for delete buttons (composable doesn't expose these separately)
const deletingLoading = ref(false)
const bulkDeletingLoading = ref(false)
</script>

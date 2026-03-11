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
        <UBadge v-else-if="!loading" color="info" variant="subtle">{{ allProfiles.length }} total</UBadge>
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
      <UInput v-model="search" icon="i-heroicons-magnifying-glass" placeholder="Search addon or profile" class="min-w-0 flex-1" />
      <USelect v-model="addonFilter" :items="addonOptions" value-key="value" placeholder="All Addons" class="w-full sm:w-60" />
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
      title="Profiles"
      description="Loading the latest addon import inventory."
      icon="i-heroicons-cube"
    >
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
                <th class="text-left">Addon</th>
                <th class="text-left">Profile</th>
                <th class="text-center w-24">Visible</th>
                <th class="text-right w-36">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(profile, idx) in filteredProfiles"
                :key="profile.id"
                class="drag-row"
                :class="[
                  selected.has(profile.id) ? 'bg-blue-50/70 dark:bg-blue-500/10' : '',
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
                    :checked="selected.has(profile.id)"
                    class="rounded border-slate-300 bg-transparent text-blue-600 focus:ring-blue-500 focus:ring-offset-0"
                    @change="toggleSelect(profile.id)"
                  >
                </td>
                <td>
                  <UBadge variant="subtle" color="info">{{ profile.addon }}</UBadge>
                </td>
                <td>
                  <div>
                    <p class="text-sm font-semibold text-slate-950 dark:text-white">{{ profile.profile }}</p>
                    <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">Sort #{{ profile.sortOrder }}</p>
                  </div>
                </td>
                <td class="text-center">
                  <USwitch :model-value="profile.isVisible" size="sm" @update:model-value="toggleVisibility(profile)" />
                </td>
                <td>
                  <div class="flex items-center justify-end gap-1">
                    <UTooltip text="Edit">
                      <UButton icon="i-heroicons-pencil-square" variant="ghost" color="neutral" size="sm" @click="openEdit(profile)" />
                    </UTooltip>
                    <UTooltip text="Copy String">
                      <UButton icon="i-heroicons-document-duplicate" variant="ghost" color="neutral" size="sm" @click="copyString(profile)" />
                    </UTooltip>
                    <UTooltip text="Delete">
                      <UButton icon="i-heroicons-trash" variant="ghost" color="error" size="sm" @click="confirmDelete(profile)" />
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
          <span>Showing {{ filteredProfiles.length }} of {{ allProfiles.length }}</span>
          <button
            v-if="isFiltering"
            class="font-medium text-blue-600 hover:text-blue-700 dark:text-blue-300 dark:hover:text-blue-200"
            @click="search = ''; addonFilter = ''"
          >
            Clear filters
          </button>
        </div>
      </template>
    </AdminPanel>

    <AdminPanel v-else title="Profiles" description="Your addon inventory is still empty." icon="i-heroicons-cube">
      <AdminEmptyState
        icon="i-heroicons-cube"
        title="No profiles yet"
        description="Create the first addon profile to make import strings available on the public site."
      >
        <template #actions>
          <UButton icon="i-heroicons-plus" @click="openCreate">Create first profile</UButton>
        </template>
      </AdminEmptyState>
    </AdminPanel>

    <UModal v-model:open="modalOpen">
      <template #content>
        <div class="p-6">
          <h2 class="text-lg font-semibold text-slate-950 dark:text-white">{{ editingProfile ? 'Edit Profile' : 'New Profile' }}</h2>

          <div class="mt-6 space-y-4">
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

            <UAlert v-if="formError" color="error" variant="subtle" icon="i-heroicons-exclamation-circle" :title="formError" />
          </div>

          <div class="mt-6 flex justify-end gap-3 border-t border-slate-200 pt-4 dark:border-white/8">
            <UButton variant="ghost" color="neutral" :disabled="saving" @click="modalOpen = false">Cancel</UButton>
            <UButton :loading="saving" @click="saveProfile">{{ editingProfile ? 'Save' : 'Create' }}</UButton>
          </div>
        </div>
      </template>
    </UModal>

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
                <strong class="text-slate-950 dark:text-white">{{ deletingProfile?.addon }}</strong> - {{ deletingProfile?.profile }} will be permanently deleted.
              </p>
            </div>
          </div>

          <div class="mt-6 flex justify-end gap-3 border-t border-slate-200 pt-4 dark:border-white/8">
            <UButton variant="ghost" color="neutral" :disabled="deleting" @click="deleteModalOpen = false">Cancel</UButton>
            <UButton color="error" :loading="deleting" @click="deleteProfile">Delete</UButton>
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
              <h2 class="text-lg font-semibold text-slate-950 dark:text-white">Delete {{ selected.size }} profiles?</h2>
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

interface Profile {
  id: number
  addon: string
  profile: string
  string: string
  description: string | null
  sortOrder: number
  isVisible: boolean
  createdAt: string
  updatedAt: string
}

const allProfiles = ref<Profile[]>([])
const loading = ref(true)
const search = ref('')
const addonFilter = ref('')
const selected = reactive(new Set<number>())
const modalOpen = ref(false)
const editingProfile = ref<Profile | null>(null)
const saving = ref(false)
const formError = ref('')
const form = reactive({ addon: '', profile: '', string: '', sortOrder: 0, isVisible: true })
const deleteModalOpen = ref(false)
const deletingProfile = ref<Profile | null>(null)
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

  const ordered = [...filteredProfiles.value]
  const [moved] = ordered.splice(fromIdx, 1)
  ordered.splice(toIdx, 0, moved)

  const idOrder = ordered.map(profile => profile.id)
  allProfiles.value = [...allProfiles.value].sort((a, b) => {
    const aIndex = idOrder.indexOf(a.id)
    const bIndex = idOrder.indexOf(b.id)
    if (aIndex === -1 && bIndex === -1) return 0
    if (aIndex === -1) return 1
    if (bIndex === -1) return -1
    return aIndex - bIndex
  })

  try {
    await apiFetch('/api/v1/admin/profiles/reorder', {
      method: 'POST',
      body: { items: ordered.map((profile, index) => ({ id: profile.id, sortOrder: index })) },
    })
  } catch {
    toast.add({ title: 'Error', color: 'error' })
  }
}

const statCards = computed(() => {
  const visibleCount = allProfiles.value.filter(profile => profile.isVisible).length
  const hiddenCount = allProfiles.value.filter(profile => !profile.isVisible).length
  const uniqueAddons = new Set(allProfiles.value.map(profile => profile.addon)).size

  return [
    { label: 'Total Profiles', value: allProfiles.value.length, icon: 'i-heroicons-cube', tone: 'brand' as const },
    { label: 'Visible', value: visibleCount, icon: 'i-heroicons-eye', tone: 'success' as const },
    { label: 'Hidden', value: hiddenCount, icon: 'i-heroicons-eye-slash', tone: 'danger' as const },
    { label: 'Addons', value: uniqueAddons, icon: 'i-heroicons-puzzle-piece', tone: 'violet' as const },
  ]
})

const isFiltering = computed(() => search.value.trim() !== '' || addonFilter.value !== '')
const addonOptions = computed(() => {
  const addons = [...new Set(allProfiles.value.map(profile => profile.addon))].sort()
  return [{ label: 'All Addons', value: '' }, ...addons.map(addon => ({ label: addon, value: addon }))]
})

const filteredProfiles = computed(() => {
  let result = allProfiles.value
  if (addonFilter.value) result = result.filter(profile => profile.addon === addonFilter.value)
  if (search.value) {
    const query = search.value.toLowerCase()
    result = result.filter(profile =>
      profile.addon.toLowerCase().includes(query)
      || profile.profile.toLowerCase().includes(query),
    )
  }
  return result
})

const allVisibleSelected = computed(() =>
  filteredProfiles.value.length > 0 && filteredProfiles.value.every(profile => selected.has(profile.id)),
)

const someVisibleSelected = computed(() =>
  filteredProfiles.value.some(profile => selected.has(profile.id)),
)

function toggleSelect(id: number) {
  selected.has(id) ? selected.delete(id) : selected.add(id)
}

function toggleSelectAll() {
  if (allVisibleSelected.value) {
    filteredProfiles.value.forEach(profile => selected.delete(profile.id))
  } else {
    filteredProfiles.value.forEach(profile => selected.add(profile.id))
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

async function loadProfiles() {
  loading.value = true
  try {
    allProfiles.value = await apiFetch<Profile[]>('/api/v1/admin/profiles')
    lastLoaded.value = new Date()
    updateLastUpdatedText()
  } catch {
    toast.add({ title: 'Error loading', color: 'error' })
  } finally {
    loading.value = false
  }
}

const route = useRoute()

onMounted(() => {
  loadProfiles()
  lastUpdatedTimer = setInterval(updateLastUpdatedText, 10000)
  if (route.query.action === 'create') nextTick(() => openCreate())
})

onUnmounted(() => {
  clearInterval(lastUpdatedTimer)
})

function openCreate() {
  editingProfile.value = null
  formError.value = ''
  Object.assign(form, { addon: '', profile: '', string: '', sortOrder: 0, isVisible: true })
  modalOpen.value = true
}

function openEdit(profile: Profile) {
  editingProfile.value = profile
  formError.value = ''
  Object.assign(form, {
    addon: profile.addon,
    profile: profile.profile,
    string: profile.string,
    sortOrder: profile.sortOrder,
    isVisible: profile.isVisible,
  })
  modalOpen.value = true
}

async function saveProfile() {
  if (!form.addon.trim() || !form.profile.trim() || !form.string.trim()) {
    formError.value = 'Addon, profile and string are required'
    return
  }

  saving.value = true
  formError.value = ''

  try {
    if (editingProfile.value) {
      await apiFetch(`/api/v1/admin/profiles/${editingProfile.value.id}`, { method: 'PUT', body: { ...form } })
      toast.add({ title: 'Profile updated', icon: 'i-heroicons-check-circle', color: 'success' })
    } else {
      await apiFetch('/api/v1/admin/profiles', { method: 'POST', body: { ...form } })
      toast.add({ title: 'Profile created', icon: 'i-heroicons-check-circle', color: 'success' })
    }

    modalOpen.value = false
    await loadProfiles()
  } catch (error: any) {
    formError.value = error?.data?.message || 'Error saving'
  } finally {
    saving.value = false
  }
}

async function toggleVisibility(profile: Profile) {
  try {
    await apiFetch(`/api/v1/admin/profiles/${profile.id}`, {
      method: 'PATCH',
      body: { isVisible: !profile.isVisible },
    })
    profile.isVisible = !profile.isVisible
  } catch {
    toast.add({ title: 'Error toggling', color: 'error' })
  }
}

function confirmDelete(profile: Profile) {
  deletingProfile.value = profile
  deleteModalOpen.value = true
}

async function deleteProfile() {
  if (!deletingProfile.value) return
  deleting.value = true

  try {
    await apiFetch(`/api/v1/admin/profiles/${deletingProfile.value.id}`, { method: 'DELETE' })
    toast.add({ title: 'Profile deleted', color: 'success' })
    deleteModalOpen.value = false
    await loadProfiles()
  } catch {
    toast.add({ title: 'Error deleting', color: 'error' })
  } finally {
    deleting.value = false
  }
}

async function bulkDelete() {
  bulkDeleting.value = true
  try {
    await apiFetch('/api/v1/admin/profiles/bulk-delete', {
      method: 'POST',
      body: { ids: [...selected] },
    })
    toast.add({ title: `${selected.size} profiles deleted`, icon: 'i-heroicons-check-circle', color: 'success' })
    selected.clear()
    bulkDelModal.value = false
    await loadProfiles()
  } catch {
    toast.add({ title: 'Error deleting', color: 'error' })
  } finally {
    bulkDeleting.value = false
  }
}

async function copyString(profile: Profile) {
  try {
    await navigator.clipboard.writeText(profile.string)
    toast.add({ title: `${profile.addon} - ${profile.profile} copied`, icon: 'i-heroicons-clipboard-document-check', color: 'success' })
  } catch {
    const textarea = document.createElement('textarea')
    textarea.value = profile.string
    textarea.style.cssText = 'position:fixed;opacity:0'
    document.body.appendChild(textarea)
    textarea.select()
    document.execCommand('copy')
    document.body.removeChild(textarea)
    toast.add({ title: `${profile.addon} - ${profile.profile} copied`, icon: 'i-heroicons-clipboard-document-check', color: 'success' })
  }
}
</script>

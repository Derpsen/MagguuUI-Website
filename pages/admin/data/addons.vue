<template>
  <div class="space-y-6">
    <AdminPageHeader
      icon="i-heroicons-puzzle-piece"
      eyebrow="Data"
      title="Addon Catalogue"
      description="Synced from MagguuUI.toc — admin overrides for emoji, description, URL or category survive the auto-sync."
    >
      <template #badge>
        <UBadge v-if="!loading" color="info" variant="subtle">{{ items.length }} total</UBadge>
      </template>
      <template #meta>
        <span v-if="lastSyncedText" class="admin-pill">{{ lastSyncedText }}</span>
      </template>
      <template #actions>
        <UButton color="neutral" variant="ghost" icon="i-heroicons-arrow-path" :loading="syncing" @click="resync">
          Resync from .toc
        </UButton>
        <UButton icon="i-heroicons-plus" @click="openCreate">Manual entry</UButton>
      </template>
    </AdminPageHeader>

    <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <AdminMetricCard v-for="stat in statCards" :key="stat.label" v-bind="stat" />
    </div>

    <div class="admin-filterbar">
      <UInput v-model="search" icon="i-heroicons-magnifying-glass" placeholder="Search addon" class="min-w-0 flex-1" />
      <USelect v-model="categoryFilter" :items="categoryOptions" value-key="value" placeholder="All Categories" class="w-full sm:w-60" />
    </div>

    <AdminPanel v-if="loading" title="Addons" description="Loading the catalogue..." icon="i-heroicons-puzzle-piece">
      <div class="py-10 text-center">
        <UIcon name="i-heroicons-arrow-path" class="mx-auto h-8 w-8 animate-spin text-blue-500" />
      </div>
    </AdminPanel>

    <AdminPanel
      v-else-if="filteredAddons.length"
      title="Addons"
      description="Toggle visibility instantly, edit any field inline, or remove manual entries."
      icon="i-heroicons-puzzle-piece"
    >
      <div class="admin-table-shell">
        <table class="admin-table">
          <thead>
            <tr>
              <th class="w-[5%]">#</th>
              <th class="w-[10%]">Category</th>
              <th class="w-[20%]">Name</th>
              <th class="w-[35%]">Description</th>
              <th class="w-[10%]">Source</th>
              <th class="w-[10%]">State</th>
              <th class="w-[10%] text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="addon in filteredAddons" :key="addon.id">
              <td class="text-xs text-slate-400">{{ addon.sortOrder }}</td>
              <td>
                <UBadge :color="categoryBadge(addon.category)" variant="subtle" size="xs">{{ addon.category }}</UBadge>
              </td>
              <td>
                <div class="flex items-center gap-2">
                  <span class="text-base">{{ addon.emoji || '·' }}</span>
                  <span class="text-sm font-semibold text-slate-950 dark:text-white">{{ addon.name }}</span>
                </div>
                <p v-if="addon.tocName" class="text-xs text-slate-500 dark:text-slate-400">.toc: {{ addon.tocName }}</p>
              </td>
              <td>
                <p class="line-clamp-2 text-xs text-slate-600 dark:text-slate-300">{{ addon.description || '—' }}</p>
              </td>
              <td>
                <UBadge :color="addon.source === 'toc' ? 'info' : 'warning'" variant="subtle" size="xs">{{ addon.source }}</UBadge>
              </td>
              <td>
                <div class="flex items-center gap-1.5">
                  <UBadge v-if="!addon.isAvailable" color="error" variant="subtle" size="xs">unavailable</UBadge>
                  <UBadge v-else-if="!addon.isVisible" color="neutral" variant="subtle" size="xs">hidden</UBadge>
                  <UBadge v-else color="success" variant="subtle" size="xs">live</UBadge>
                </div>
              </td>
              <td class="text-right">
                <div class="inline-flex items-center gap-1">
                  <UButton size="xs" variant="ghost" color="neutral" :icon="addon.isVisible ? 'i-heroicons-eye' : 'i-heroicons-eye-slash'" @click="toggleVisibility(addon)" />
                  <UButton size="xs" variant="ghost" color="neutral" icon="i-heroicons-pencil-square" @click="openEdit(addon)" />
                  <UButton size="xs" variant="ghost" color="error" icon="i-heroicons-trash" @click="confirmDelete(addon)" />
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </AdminPanel>

    <AdminPanel v-else title="Addons" description="Catalogue is empty." icon="i-heroicons-puzzle-piece">
      <AdminEmptyState icon="i-heroicons-puzzle-piece" title="No addons yet" description="Run a resync against the .toc, or add a manual entry.">
        <template #actions>
          <UButton icon="i-heroicons-arrow-path" @click="resync">Resync from .toc</UButton>
        </template>
      </AdminEmptyState>
    </AdminPanel>

    <UModal v-model:open="modalOpen">
      <template #content>
        <div class="p-6 space-y-4">
          <h2 class="text-lg font-semibold text-slate-950 dark:text-white">{{ editingItem ? 'Edit Addon' : 'New Addon' }}</h2>

          <div class="grid gap-3 sm:grid-cols-2">
            <div>
              <label class="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">Slug *</label>
              <UInput v-model="form.slug" placeholder="lowercase-kebab-case" :disabled="saving || !!editingItem" />
            </div>
            <div>
              <label class="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">.toc Name</label>
              <UInput v-model="form.tocName" placeholder="optional" :disabled="saving" />
            </div>
          </div>

          <div class="grid gap-3 sm:grid-cols-2">
            <div>
              <label class="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">Display Name *</label>
              <UInput v-model="form.name" :disabled="saving" />
            </div>
            <div>
              <label class="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">Category *</label>
              <USelect v-model="form.category" :items="categoryFormOptions" value-key="value" :disabled="saving" />
            </div>
          </div>

          <div class="grid gap-3 sm:grid-cols-2">
            <div>
              <label class="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">Emoji</label>
              <UInput v-model="form.emoji" placeholder="🎯" :disabled="saving" />
            </div>
            <div>
              <label class="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">Sort Order</label>
              <UInput v-model.number="form.sortOrder" type="number" :disabled="saving" />
            </div>
          </div>

          <div>
            <label class="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">URL</label>
            <UInput v-model="form.url" placeholder="https://www.curseforge.com/wow/addons/..." :disabled="saving" />
          </div>

          <div>
            <label class="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">Description</label>
            <UTextarea v-model="form.description" :rows="3" :disabled="saving" />
          </div>

          <div class="flex items-center gap-4 pt-2">
            <label class="flex items-center gap-2">
              <USwitch v-model="form.isVisible" :disabled="saving" />
              <span class="text-sm text-slate-700 dark:text-slate-300">Visible</span>
            </label>
            <label v-if="editingItem" class="flex items-center gap-2">
              <USwitch v-model="form.isAvailable" :disabled="saving" />
              <span class="text-sm text-slate-700 dark:text-slate-300">Available</span>
            </label>
          </div>

          <UAlert v-if="formError" color="error" variant="subtle" :title="formError" />

          <div class="flex justify-end gap-3 border-t border-slate-200 pt-4 dark:border-white/8">
            <UButton variant="ghost" color="neutral" @click="modalOpen = false">Cancel</UButton>
            <UButton :loading="saving" :disabled="!canSubmit" @click="save">Save</UButton>
          </div>
        </div>
      </template>
    </UModal>

    <UModal v-model:open="deleteModalOpen">
      <template #content>
        <div class="p-6">
          <h2 class="text-lg font-semibold text-slate-950 dark:text-white">Delete addon?</h2>
          <p class="mt-2 text-sm text-slate-500 dark:text-slate-400">
            <strong class="text-slate-950 dark:text-white">{{ deletingItem?.name }}</strong> will be removed.
            If it still appears in MagguuUI.toc, the next sync will recreate it.
          </p>
          <div class="mt-6 flex justify-end gap-3 border-t border-slate-200 pt-4 dark:border-white/8">
            <UButton variant="ghost" color="neutral" @click="deleteModalOpen = false">Cancel</UButton>
            <UButton color="error" :loading="deleting" @click="doDelete">Delete</UButton>
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'admin' })

interface AddonRow {
  id: number
  slug: string
  tocName: string | null
  name: string
  category: 'required' | 'core' | 'optional'
  emoji: string | null
  description: string | null
  url: string | null
  sortOrder: number
  isVisible: boolean
  isAvailable: boolean
  source: 'toc' | 'manual'
  lastSyncedAt: string | number | null
}

interface AddonForm {
  slug: string
  tocName: string
  name: string
  category: 'required' | 'core' | 'optional'
  emoji: string
  description: string
  url: string
  sortOrder: number
  isVisible: boolean
  isAvailable: boolean
}

const { apiFetch } = useApi()
const toast = useToast()

const items = ref<AddonRow[]>([])
const loading = ref(true)
const search = ref('')
const categoryFilter = ref('')

const modalOpen = ref(false)
const editingItem = ref<AddonRow | null>(null)
const saving = ref(false)
const formError = ref('')
const form = ref<AddonForm>(emptyForm())

const deleteModalOpen = ref(false)
const deletingItem = ref<AddonRow | null>(null)
const deleting = ref(false)

const syncing = ref(false)

function emptyForm(): AddonForm {
  return {
    slug: '',
    tocName: '',
    name: '',
    category: 'optional',
    emoji: '',
    description: '',
    url: '',
    sortOrder: 0,
    isVisible: true,
    isAvailable: true,
  }
}

const categoryOptions = [
  { label: 'All Categories', value: '' },
  { label: 'Required', value: 'required' },
  { label: 'Core', value: 'core' },
  { label: 'Optional', value: 'optional' },
]

const categoryFormOptions = categoryOptions.slice(1)

const filteredAddons = computed(() => {
  let result = items.value
  if (categoryFilter.value) result = result.filter(a => a.category === categoryFilter.value)
  if (search.value.trim()) {
    const q = search.value.toLowerCase().trim()
    result = result.filter(a =>
      a.name.toLowerCase().includes(q)
      || a.slug.toLowerCase().includes(q)
      || (a.tocName && a.tocName.toLowerCase().includes(q)),
    )
  }
  return result
})

const statCards = computed(() => {
  const total = items.value.length
  const visible = items.value.filter(a => a.isVisible && a.isAvailable).length
  const required = items.value.filter(a => a.category === 'required').length + items.value.filter(a => a.category === 'core').length
  const optional = items.value.filter(a => a.category === 'optional').length
  return [
    { label: 'Total', value: total, icon: 'i-heroicons-puzzle-piece', tone: 'brand' as const },
    { label: 'On Site', value: visible, icon: 'i-heroicons-eye', tone: 'success' as const },
    { label: 'Required + Core', value: required, icon: 'i-heroicons-bolt', tone: 'warning' as const },
    { label: 'Optional', value: optional, icon: 'i-heroicons-plus-circle', tone: 'violet' as const },
  ]
})

const canSubmit = computed(() => Boolean(form.value.slug.trim() && form.value.name.trim()))

const lastSyncedText = computed(() => {
  const stamps = items.value
    .map(a => (typeof a.lastSyncedAt === 'number' ? a.lastSyncedAt * 1000 : a.lastSyncedAt ? Date.parse(String(a.lastSyncedAt)) : 0))
    .filter(n => n > 0)
  if (!stamps.length) return ''
  const latest = Math.max(...stamps)
  return `Last sync ${new Date(latest).toLocaleString()}`
})

function categoryBadge(category: string) {
  if (category === 'required') return 'error'
  if (category === 'core') return 'info'
  return 'success'
}

async function load() {
  loading.value = true
  try {
    items.value = await apiFetch<AddonRow[]>('/api/v1/admin/addons')
  } catch (err: unknown) {
    toast.add({ title: errorMessage(err, 'Failed to load addons'), color: 'error' })
  } finally {
    loading.value = false
  }
}

function openCreate() {
  editingItem.value = null
  form.value = emptyForm()
  formError.value = ''
  modalOpen.value = true
}

function openEdit(addon: AddonRow) {
  editingItem.value = addon
  form.value = {
    slug: addon.slug,
    tocName: addon.tocName ?? '',
    name: addon.name,
    category: addon.category,
    emoji: addon.emoji ?? '',
    description: addon.description ?? '',
    url: addon.url ?? '',
    sortOrder: addon.sortOrder,
    isVisible: addon.isVisible,
    isAvailable: addon.isAvailable,
  }
  formError.value = ''
  modalOpen.value = true
}

async function save() {
  saving.value = true
  formError.value = ''
  try {
    const payload = {
      slug: form.value.slug.trim(),
      tocName: form.value.tocName.trim() || null,
      name: form.value.name.trim(),
      category: form.value.category,
      emoji: form.value.emoji.trim() || null,
      description: form.value.description.trim() || null,
      url: form.value.url.trim() || null,
      sortOrder: Number.isFinite(form.value.sortOrder) ? form.value.sortOrder : 0,
      isVisible: form.value.isVisible,
      isAvailable: form.value.isAvailable,
    }
    if (editingItem.value) {
      await apiFetch(`/api/v1/admin/addons/${editingItem.value.id}`, { method: 'PATCH', body: payload })
      toast.add({ title: 'Addon updated', color: 'success' })
    } else {
      await apiFetch('/api/v1/admin/addons', { method: 'POST', body: payload })
      toast.add({ title: 'Addon created', color: 'success' })
    }
    modalOpen.value = false
    await load()
  } catch (err: unknown) {
    formError.value = errorMessage(err, 'Save failed')
  } finally {
    saving.value = false
  }
}

async function toggleVisibility(addon: AddonRow) {
  try {
    await apiFetch(`/api/v1/admin/addons/${addon.id}`, { method: 'PATCH', body: { isVisible: !addon.isVisible } })
    addon.isVisible = !addon.isVisible
  } catch (err: unknown) {
    toast.add({ title: errorMessage(err, 'Toggle failed'), color: 'error' })
  }
}

function confirmDelete(addon: AddonRow) {
  deletingItem.value = addon
  deleteModalOpen.value = true
}

async function doDelete() {
  if (!deletingItem.value) return
  deleting.value = true
  try {
    await apiFetch(`/api/v1/admin/addons/${deletingItem.value.id}`, { method: 'DELETE' })
    toast.add({ title: 'Addon deleted', color: 'success' })
    deleteModalOpen.value = false
    await load()
  } catch (err: unknown) {
    toast.add({ title: errorMessage(err, 'Delete failed'), color: 'error' })
  } finally {
    deleting.value = false
  }
}

async function resync() {
  syncing.value = true
  try {
    const result = await apiFetch<{ inserted: number, updated: number, unavailable: number, total: number }>('/api/v1/admin/addons/resync', { method: 'POST' })
    toast.add({
      title: `Synced — ${result.inserted} new, ${result.updated} updated, ${result.unavailable} removed`,
      color: 'success',
    })
    await load()
  } catch (err: unknown) {
    toast.add({ title: errorMessage(err, 'Resync failed'), color: 'error' })
  } finally {
    syncing.value = false
  }
}

onMounted(load)
</script>

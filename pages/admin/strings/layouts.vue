<!--
  Admin — Character Layouts Management
-->

<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <div class="flex items-center gap-3">
        <h1 class="text-2xl font-bold text-gradient">Character Layouts</h1>
        <UBadge v-if="!loading && isFiltering" color="warning" variant="subtle" size="xs">{{ filtered.length }} results</UBadge>
        <UBadge v-else-if="!loading" color="info" variant="subtle" size="xs">{{ items.length }} total</UBadge>
        <span v-if="lastUpdatedText && !loading" class="text-xs" :class="isDark ? 'text-silver-600' : 'text-gray-400'">· {{ lastUpdatedText }}</span>
      </div>
      <UButton icon="i-heroicons-plus" @click="openCreate">New Layout</UButton>
    </div>

    <!-- Stat Cards — Skeleton -->
    <div v-if="loading" class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <div v-for="i in 4" :key="'sk-'+i" class="glass rounded-xl p-5 admin-fade-in" :class="'admin-stagger-'+i">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-lg" :class="isDark ? 'bg-brand-900/50 animate-pulse' : 'bg-gray-100 animate-pulse'" />
          <div class="flex-1 space-y-2">
            <div class="h-7 w-14 rounded" :class="isDark ? 'bg-brand-900/50 animate-pulse' : 'bg-gray-100 animate-pulse'" />
            <div class="h-3 w-20 rounded" :class="isDark ? 'bg-brand-900/30 animate-pulse' : 'bg-gray-100 animate-pulse'" />
          </div>
        </div>
      </div>
    </div>

    <!-- Stat Cards — Real -->
    <div v-else class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <div v-for="(stat, idx) in statCards" :key="stat.label" class="glass rounded-xl p-5 admin-fade-in" :class="'admin-stagger-'+(idx+1)">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-lg flex items-center justify-center" :class="stat.bg">
            <UIcon :name="stat.icon" class="w-5 h-5" :class="stat.color" />
          </div>
          <div>
            <p class="text-2xl font-bold" :class="isDark ? 'text-white' : 'text-gray-900'">{{ stat.value }}</p>
            <p class="text-xs" :class="isDark ? 'text-silver-500' : 'text-gray-500'">{{ stat.label }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Search & Filter -->
    <div class="flex flex-col sm:flex-row gap-3 mb-6 admin-fade-in admin-stagger-5">
      <UInput v-model="search" icon="i-heroicons-magnifying-glass" placeholder="Search..." class="flex-1" />
      <USelect v-model="classFilter" :items="classOptions" value-key="value" placeholder="All Classes" class="w-48" />
    </div>

    <!-- Bulk Bar -->
    <Transition enter-active-class="transition duration-200 ease-out" enter-from-class="opacity-0 -translate-y-2" enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition duration-150 ease-in" leave-from-class="opacity-100 translate-y-0" leave-to-class="opacity-0 -translate-y-2">
      <div v-if="selected.size" class="mb-4 flex items-center gap-3 rounded-xl px-4 py-3 bg-brand-400/10 border border-brand-400/20">
        <span class="text-sm font-medium text-brand-300">{{ `${selected.size} selected` }}</span>
        <div class="flex-1" />
        <UButton size="xs" variant="ghost" color="neutral" @click="selected.clear()">Clear selection</UButton>
        <UButton size="xs" color="error" variant="subtle" icon="i-heroicons-trash" @click="bulkDelModal = true">{{ `Delete ${selected.size}` }}</UButton>
      </div>
    </Transition>

    <!-- Loading Spinner -->
    <div v-if="loading" class="glass rounded-xl p-12 text-center admin-fade-in admin-stagger-6">
      <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 text-brand-400 animate-spin mx-auto mb-3" />
      <p class="text-silver-500">Loading layouts...</p>
    </div>

    <!-- Table -->
    <div v-else-if="filtered.length" class="glass rounded-xl overflow-hidden admin-fade-in admin-stagger-6">
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead>
            <tr :class="isDark ? 'border-b border-brand-400/10' : 'border-b border-gray-200'">
              <th class="w-8 px-1 py-3" />
              <th class="w-10 px-4 py-3"><input type="checkbox" :checked="allVisibleSelected" :indeterminate="someVisibleSelected && !allVisibleSelected" class="rounded border-silver-600 bg-transparent text-brand-500 focus:ring-brand-400 focus:ring-offset-0 cursor-pointer" @change="toggleSelectAll" /></th>
              <th class="text-left px-4 py-3 text-xs font-semibold uppercase" :class="isDark ? 'text-silver-500' : 'text-gray-500'">Class</th>
              <th class="text-left px-4 py-3 text-xs font-semibold uppercase" :class="isDark ? 'text-silver-500' : 'text-gray-500'">Specialization</th>
              <th class="text-left px-4 py-3 text-xs font-semibold uppercase hidden lg:table-cell" :class="isDark ? 'text-silver-500' : 'text-gray-500'">Description</th>
              <th class="text-center px-4 py-3 text-xs font-semibold uppercase w-20" :class="isDark ? 'text-silver-500' : 'text-gray-500'">Visible</th>
              <th class="text-right px-4 py-3 text-xs font-semibold uppercase w-32" :class="isDark ? 'text-silver-500' : 'text-gray-500'">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(item, idx) in filtered" :key="item.id"
              class="transition-colors drag-row"
              :class="[isDark ? 'border-b border-brand-400/5' : 'border-b border-gray-100', selected.has(item.id) ? 'bg-brand-400/5' : (isDark ? 'hover:bg-white/[0.02]' : 'hover:bg-gray-50/50'), dragOverIdx === idx ? 'drag-over' : '', dragIdx === idx ? 'dragging' : '']"
              draggable="true" @dragstart="onDragStart($event, idx)" @dragover.prevent="dragOverIdx = idx" @dragleave="dragOverIdx = null" @drop="onDrop($event, idx)" @dragend="resetDrag">
              <td class="px-1 py-3 text-center cursor-grab active:cursor-grabbing" :class="isDark ? 'text-silver-700 hover:text-silver-500' : 'text-gray-300 hover:text-gray-500'">&#x283F;</td>
              <td class="px-4 py-3"><input type="checkbox" :checked="selected.has(item.id)" class="rounded border-silver-600 bg-transparent text-brand-500 focus:ring-brand-400 focus:ring-offset-0 cursor-pointer" @change="toggleSelect(item.id)" /></td>
              <td class="px-4 py-3"><UBadge variant="subtle" color="info" size="sm">{{ item.className || '—' }}</UBadge></td>
              <td class="px-4 py-3"><span class="text-sm font-medium" :class="isDark ? 'text-white' : 'text-gray-900'">{{ item.spec || item.name }}</span></td>
              <td class="px-4 py-3 hidden lg:table-cell"><span class="text-sm truncate block max-w-xs" :class="isDark ? 'text-silver-500' : 'text-gray-500'">{{ item.description || '—' }}</span></td>
              <td class="px-4 py-3 text-center"><USwitch :model-value="item.isVisible" size="sm" @update:model-value="toggleVis(item)" /></td>
              <td class="px-4 py-3">
                <div class="flex items-center justify-end gap-1">
                  <UTooltip text="Edit"><UButton icon="i-heroicons-pencil-square" variant="ghost" color="neutral" size="xs" @click="openEdit(item)" /></UTooltip>
                  <UTooltip text="Copy String"><UButton icon="i-heroicons-document-duplicate" variant="ghost" color="neutral" size="xs" @click="copyString(item)" /></UTooltip>
                  <UTooltip text="Delete"><UButton icon="i-heroicons-trash" variant="ghost" color="error" size="xs" @click="confirmDel(item)" /></UTooltip>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="flex items-center justify-between px-4 py-2.5" :class="isDark ? 'border-t border-brand-400/10' : 'border-t border-gray-100'">
        <p class="text-[11px] tabular-nums" :class="isDark ? 'text-silver-600' : 'text-gray-400'">Showing {{ filtered.length }} of {{ items.length }}</p>
        <p v-if="isFiltering" class="text-[11px]">
          <button class="hover:underline" :class="isDark ? 'text-brand-400' : 'text-brand-600'" @click="search = ''; classFilter = ''">Clear filters</button>
        </p>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else class="glass rounded-xl p-12 text-center admin-fade-in admin-stagger-6">
      <UIcon name="i-heroicons-user-circle" class="w-12 h-12 mx-auto mb-4" :class="isDark ? 'text-silver-700' : 'text-gray-300'" />
      <p class="text-base font-medium mb-1" :class="isDark ? 'text-silver-400' : 'text-gray-600'">No layouts yet</p>
      <p class="text-sm mb-5 max-w-sm mx-auto" :class="isDark ? 'text-silver-600' : 'text-gray-400'">Character layouts define the UI arrangement for different classes and specs.</p>
      <UButton icon="i-heroicons-plus" @click="openCreate">Create manually</UButton>
    </div>

    <!-- Create/Edit Modal -->
    <UModal v-model:open="modalOpen">
      <template #content>
        <div class="p-6">
          <h2 class="text-lg font-semibold mb-6" :class="isDark ? 'text-white' : 'text-gray-900'">{{ editing ? 'Edit Layout' : 'New Layout' }}</h2>
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium mb-1.5" :class="isDark ? 'text-silver-300' : 'text-gray-700'">Name *</label>
              <UInput v-model="form.name" placeholder="e.g. Holy Paladin Raid" :disabled="saving" />
            </div>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium mb-1.5" :class="isDark ? 'text-silver-300' : 'text-gray-700'">Class</label>
                <UInput v-model="form.className" placeholder="e.g. Paladin" :disabled="saving" />
              </div>
              <div>
                <label class="block text-sm font-medium mb-1.5" :class="isDark ? 'text-silver-300' : 'text-gray-700'">Specialization</label>
                <UInput v-model="form.spec" placeholder="e.g. Holy" :disabled="saving" />
              </div>
            </div>
            <div>
              <label class="block text-sm font-medium mb-1.5" :class="isDark ? 'text-silver-300' : 'text-gray-700'">Description</label>
              <UInput v-model="form.description" :disabled="saving" />
            </div>
            <div>
              <label class="block text-sm font-medium mb-1.5" :class="isDark ? 'text-silver-300' : 'text-gray-700'">Import String</label>
              <UTextarea v-model="form.importString" placeholder="ElvUI Layout String..." :rows="6" :disabled="saving" class="font-mono text-xs" />
            </div>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium mb-1.5" :class="isDark ? 'text-silver-300' : 'text-gray-700'">Sort Order</label>
                <UInput v-model.number="form.sortOrder" type="number" placeholder="0" :disabled="saving" />
              </div>
              <div class="flex items-end">
                <label class="flex items-center gap-2 pb-2"><USwitch v-model="form.isVisible" :disabled="saving" /><span class="text-sm" :class="isDark ? 'text-silver-300' : 'text-gray-700'">Visible</span></label>
              </div>
            </div>
            <UAlert v-if="formError" color="error" variant="subtle" icon="i-heroicons-exclamation-circle" :title="formError" />
          </div>
          <div class="flex justify-end gap-3 mt-6 pt-4" :class="isDark ? 'border-t border-brand-400/10' : 'border-t border-gray-100'">
            <UButton variant="ghost" color="neutral" @click="modalOpen = false" :disabled="saving">Cancel</UButton>
            <UButton @click="save" :loading="saving">{{ editing ? 'Save' : 'Create' }}</UButton>
          </div>
        </div>
      </template>
    </UModal>

    <!-- Single Delete -->
    <UModal v-model:open="delModal">
      <template #content>
        <div class="p-6">
          <div class="flex items-start gap-4">
            <div class="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center flex-shrink-0"><UIcon name="i-heroicons-exclamation-triangle" class="w-5 h-5 text-red-400" /></div>
            <div>
              <h2 class="text-lg font-semibold mb-2" :class="isDark ? 'text-white' : 'text-gray-900'">Delete layout?</h2>
              <p class="text-sm" :class="isDark ? 'text-silver-400' : 'text-gray-500'"><strong>{{ delItem?.name }}</strong> will be permanently deleted.</p>
            </div>
          </div>
          <div class="flex justify-end gap-3 mt-6 pt-4" :class="isDark ? 'border-t border-brand-400/10' : 'border-t border-gray-100'">
            <UButton variant="ghost" color="neutral" @click="delModal = false" :disabled="deleting">Cancel</UButton>
            <UButton color="error" @click="doDelete" :loading="deleting">Delete</UButton>
          </div>
        </div>
      </template>
    </UModal>

    <!-- Bulk Delete -->
    <UModal v-model:open="bulkDelModal">
      <template #content>
        <div class="p-6">
          <div class="flex items-start gap-4">
            <div class="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center flex-shrink-0"><UIcon name="i-heroicons-exclamation-triangle" class="w-5 h-5 text-red-400" /></div>
            <div>
              <h2 class="text-lg font-semibold mb-2" :class="isDark ? 'text-white' : 'text-gray-900'">{{ `Delete ${selected.size} layouts?` }}</h2>
              <p class="text-sm" :class="isDark ? 'text-silver-400' : 'text-gray-500'">This action cannot be undone.</p>
            </div>
          </div>
          <div class="flex justify-end gap-3 mt-6 pt-4" :class="isDark ? 'border-t border-brand-400/10' : 'border-t border-gray-100'">
            <UButton variant="ghost" color="neutral" @click="bulkDelModal = false" :disabled="bulkDeleting">Cancel</UButton>
            <UButton color="error" @click="bulkDelete" :loading="bulkDeleting">{{ `Delete ${selected.size}` }}</UButton>
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

interface Layout { id: number; name: string; className: string | null; spec: string | null; description: string | null; importString: string | null; sortOrder: number; isVisible: boolean }
const items = ref<Layout[]>([]); const loading = ref(true); const search = ref(''); const classFilter = ref('')
const selected = reactive(new Set<number>())
const modalOpen = ref(false); const editing = ref<Layout | null>(null); const saving = ref(false); const formError = ref('')
const form = reactive({ name: '', className: '', spec: '', description: '', importString: '', sortOrder: 0, isVisible: true })

// Drag & Drop
const dragIdx = ref<number | null>(null)
const dragOverIdx = ref<number | null>(null)
function onDragStart(e: DragEvent, idx: number) { dragIdx.value = idx; if (e.dataTransfer) { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', String(idx)) } }
function resetDrag() { dragIdx.value = null; dragOverIdx.value = null }
async function onDrop(e: DragEvent, toIdx: number) {
  e.preventDefault(); const fromIdx = dragIdx.value; resetDrag()
  if (fromIdx === null || fromIdx === toIdx) return
  const arr = [...filtered.value]; const [moved] = arr.splice(fromIdx, 1); arr.splice(toIdx, 0, moved)
  const idOrder = arr.map(i => i.id)
  items.value = [...items.value].sort((a, b) => { const ai = idOrder.indexOf(a.id); const bi = idOrder.indexOf(b.id); if (ai === -1 && bi === -1) return 0; if (ai === -1) return 1; if (bi === -1) return -1; return ai - bi })
  try { await apiFetch('/api/v1/admin/layouts/reorder', { method: 'POST', body: { items: arr.map((i, idx) => ({ id: i.id, sortOrder: idx })) } }) } catch { toast.add({ title: 'Error', color: 'error' }) }
}
const delModal = ref(false); const delItem = ref<Layout | null>(null); const deleting = ref(false)
const bulkDelModal = ref(false); const bulkDeleting = ref(false)

// Stat Cards
const statCards = computed(() => {
  const visibleCount = items.value.filter(i => i.isVisible).length
  const hiddenCount = items.value.filter(i => !i.isVisible).length
  const uniqueClasses = new Set(items.value.map(i => i.className).filter(Boolean)).size
  const uniqueSpecs = new Set(items.value.map(i => i.spec).filter(Boolean)).size
  return [
    { label: 'Total Layouts', value: items.value.length, icon: 'i-heroicons-user-circle', bg: 'bg-blue-500/10', color: 'text-blue-400' },
    { label: 'Visible', value: visibleCount, icon: 'i-heroicons-eye', bg: 'bg-green-500/10', color: 'text-green-400' },
    { label: 'Classes', value: uniqueClasses, icon: 'i-heroicons-shield-check', bg: 'bg-purple-500/10', color: 'text-purple-400' },
    { label: 'Specs', value: uniqueSpecs, icon: 'i-heroicons-star', bg: 'bg-amber-500/10', color: 'text-amber-400' },
  ]
})

// Filtering
const isFiltering = computed(() => search.value.trim() !== '' || classFilter.value !== '')
const classOptions = computed(() => { const classes = [...new Set(items.value.map(i => i.className).filter(Boolean))].sort(); return [{ label: 'All Classes', value: '' }, ...classes.map(c => ({ label: c!, value: c! }))] })
const filtered = computed(() => { let r = items.value; if (classFilter.value) r = r.filter(i => i.className === classFilter.value); if (search.value) { const q = search.value.toLowerCase(); r = r.filter(i => i.name.toLowerCase().includes(q) || i.className?.toLowerCase().includes(q) || i.spec?.toLowerCase().includes(q) || i.description?.toLowerCase().includes(q)) } return r })
const allVisibleSelected = computed(() => filtered.value.length > 0 && filtered.value.every(i => selected.has(i.id)))
const someVisibleSelected = computed(() => filtered.value.some(i => selected.has(i.id)))

function toggleSelect(id: number) { selected.has(id) ? selected.delete(id) : selected.add(id) }
function toggleSelectAll() { if (allVisibleSelected.value) { filtered.value.forEach(i => selected.delete(i.id)) } else { filtered.value.forEach(i => selected.add(i.id)) } }

// Last Updated
const lastLoaded = ref<Date | null>(null)
const lastUpdatedText = ref('')
function updateLastUpdatedText() {
  if (!lastLoaded.value) return
  const s = Math.floor((Date.now() - lastLoaded.value.getTime()) / 1000)
  if (s < 10) lastUpdatedText.value = 'just now'
  else if (s < 60) lastUpdatedText.value = `${s}s ago`
  else if (s < 3600) lastUpdatedText.value = `${Math.floor(s / 60)}m ago`
  else lastUpdatedText.value = `${Math.floor(s / 3600)}h ago`
}
let lastUpdatedTimer: ReturnType<typeof setInterval>

const route = useRoute()
async function load() { loading.value = true; try { items.value = await apiFetch<Layout[]>('/api/v1/admin/layouts'); lastLoaded.value = new Date(); updateLastUpdatedText() } catch { toast.add({ title: 'Error', color: 'error' }) } finally { loading.value = false } }
onMounted(() => {
  load(); lastUpdatedTimer = setInterval(updateLastUpdatedText, 10000)
  if (route.query.action === 'create') { nextTick(() => openCreate()) }
})
onUnmounted(() => { clearInterval(lastUpdatedTimer) })

function openCreate() { editing.value = null; formError.value = ''; Object.assign(form, { name: '', className: '', spec: '', description: '', importString: '', sortOrder: 0, isVisible: true }); modalOpen.value = true }
function openEdit(item: Layout) { editing.value = item; formError.value = ''; Object.assign(form, { name: item.name, className: item.className || '', spec: item.spec || '', description: item.description || '', importString: item.importString || '', sortOrder: item.sortOrder, isVisible: item.isVisible }); modalOpen.value = true }

async function save() {
  if (!form.name.trim()) { formError.value = 'Name is required'; return }
  saving.value = true; formError.value = ''
  try {
    if (editing.value) { await apiFetch(`/api/v1/admin/layouts/${editing.value.id}`, { method: 'PUT', body: { ...form } }); toast.add({ title: 'Layout updated', color: 'success' }) }
    else { await apiFetch('/api/v1/admin/layouts', { method: 'POST', body: { ...form } }); toast.add({ title: 'Layout created', color: 'success' }) }
    modalOpen.value = false; await load()
  } catch (e: any) { formError.value = e?.data?.message || 'Error' } finally { saving.value = false }
}

async function toggleVis(item: Layout) { try { await apiFetch(`/api/v1/admin/layouts/${item.id}`, { method: 'PATCH', body: { isVisible: !item.isVisible } }); item.isVisible = !item.isVisible } catch { toast.add({ title: 'Error', color: 'error' }) } }
function confirmDel(item: Layout) { delItem.value = item; delModal.value = true }
async function doDelete() { if (!delItem.value) return; deleting.value = true; try { await apiFetch(`/api/v1/admin/layouts/${delItem.value.id}`, { method: 'DELETE' }); toast.add({ title: 'Deleted', color: 'success' }); delModal.value = false; await load() } catch { toast.add({ title: 'Error', color: 'error' }) } finally { deleting.value = false } }
async function bulkDelete() { bulkDeleting.value = true; try { await apiFetch('/api/v1/admin/layouts/bulk-delete', { method: 'POST', body: { ids: [...selected] } }); toast.add({ title: `${selected.size} layouts deleted`, icon: 'i-heroicons-check-circle', color: 'success' }); selected.clear(); bulkDelModal.value = false; await load() } catch { toast.add({ title: 'Error', color: 'error' }) } finally { bulkDeleting.value = false } }

async function copyString(item: Layout) {
  if (!item.importString) { toast.add({ title: 'No import string available', color: 'warning' }); return }
  try { await navigator.clipboard.writeText(item.importString); toast.add({ title: `${item.className} ${item.spec} copied!`, icon: 'i-heroicons-clipboard-document-check', color: 'success' }) }
  catch { const ta = document.createElement('textarea'); ta.value = item.importString; ta.style.cssText = 'position:fixed;opacity:0'; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta); toast.add({ title: `${item.className} ${item.spec} copied!`, icon: 'i-heroicons-clipboard-document-check', color: 'success' }) }
}
</script>

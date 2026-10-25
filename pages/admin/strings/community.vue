<template>
  <div class="space-y-6" data-testid="admin-community-presets">
    <AdminPageHeader
      eyebrow="Data"
      title="Community presets"
      description="Preset strings sent in by visitors. Nothing is public until you approve it. Text is shown as plain text; the string itself cannot be edited."
    >
      <template #actions>
        <UButton color="neutral" variant="ghost" to="/strings#community-presets" target="_blank" rel="noopener">View public list</UButton>
      </template>
    </AdminPageHeader>

    <AdminPanel title="Submissions" description="Pending items are deleted automatically after 30 days, rejected ones 30 days after the review. Approved presets stay until you delete them. No IP address or user agent is stored.">
      <div class="mb-4 flex flex-wrap gap-4 text-sm" role="tablist" aria-label="Filter by status">
        <button
          v-for="f in filters" :key="f.value" type="button" role="tab" :aria-selected="filter === f.value"
          class="border-b-2 pb-1" :class="filter === f.value ? 'border-emerald-600 text-slate-950 dark:border-emerald-400 dark:text-white' : 'border-transparent text-slate-500 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white'"
          :data-testid="`community-filter-${f.value}`" @click="setFilter(f.value)"
        >
          {{ f.label }}<span v-if="f.value !== 'all'" class="ml-1 font-mono text-xs">{{ counts[f.value as Status] }}</span>
        </button>
      </div>

      <p v-if="loading" class="py-8 text-center text-sm text-slate-500 dark:text-slate-400">Loading...</p>

      <div v-else-if="items.length" class="admin-list" data-testid="community-admin-list">
        <div v-for="p in items" :key="p.id" class="admin-row" :data-testid="`community-row-${p.id}`" :data-status="p.status">
          <div class="admin-row__content">
            <p class="admin-row__title" data-testid="community-row-name">{{ p.name }}</p>
            <p class="admin-row__meta">
              {{ p.addon }}<template v-if="p.testedVersion"> · tested with version {{ p.testedVersion }}</template> · {{ STATUS_LABEL[p.status] }}
            </p>
            <p class="admin-row__meta">Sent {{ formatTime(p.createdAt) }}<template v-if="p.reviewedAt"> · reviewed {{ formatTime(p.reviewedAt) }}</template> · {{ p.stringLength }} characters · hash {{ p.hash }}</p>
            <p v-if="p.note" class="mt-1 text-xs text-slate-600 dark:text-slate-300" data-testid="community-row-note">{{ p.note }}</p>
            <p class="mt-1 break-all font-mono text-xs text-slate-500 dark:text-slate-400" data-testid="community-row-preview">{{ p.stringPreview }}<template v-if="p.stringLength > p.stringPreview.length">...</template></p>
          </div>
          <div class="admin-row__actions">
            <UButton v-if="p.status !== 'approved'" size="xs" variant="ghost" color="neutral" :data-testid="`community-approve-${p.id}`" @click="setStatus(p, 'approved')">Approve</UButton>
            <UButton v-if="p.status !== 'rejected'" size="xs" variant="ghost" color="neutral" :data-testid="`community-reject-${p.id}`" @click="setStatus(p, 'rejected')">{{ p.status === 'approved' ? 'Unpublish and reject' : 'Reject' }}</UButton>
            <UButton size="xs" variant="ghost" color="neutral" :data-testid="`community-full-${p.id}`" @click="openFull(p)">View string</UButton>
            <UButton size="xs" variant="ghost" color="neutral" :data-testid="`community-edit-${p.id}`" @click="openEdit(p)">Edit label</UButton>
            <UButton size="xs" variant="ghost" color="error" :data-testid="`community-delete-${p.id}`" @click="confirmDelete(p)">Delete</UButton>
          </div>
        </div>
      </div>

      <p v-else class="py-8 text-center text-sm text-slate-500 dark:text-slate-400" data-testid="community-admin-empty">
        {{ filter !== 'all' ? `No ${filter} submissions.` : 'No submissions yet.' }}
      </p>
    </AdminPanel>

    <UModal v-model:open="editOpen">
      <template #content>
        <form class="p-6" data-testid="community-edit-form" @submit.prevent="saveEdit">
          <h2 class="text-lg font-semibold text-slate-950 dark:text-white">Edit label</h2>
          <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">Name, note and tested version are public once approved. Links are not accepted.</p>
          <div class="mt-5 space-y-4">
            <div class="admin-field">
              <label class="admin-field__label" for="community-edit-name">Name</label>
              <input id="community-edit-name" v-model="editForm.name" class="admin-native-input" type="text" maxlength="60" data-testid="community-edit-name" required>
            </div>
            <div class="admin-field">
              <label class="admin-field__label" for="community-edit-version">Tested with version</label>
              <input id="community-edit-version" v-model="editForm.testedVersion" class="admin-native-input" type="text" maxlength="40" data-testid="community-edit-version">
            </div>
            <div class="admin-field">
              <label class="admin-field__label" for="community-edit-note">Note</label>
              <textarea id="community-edit-note" v-model="editForm.note" class="admin-native-input min-h-20" maxlength="200" data-testid="community-edit-note" />
            </div>
            <UAlert v-if="editError" color="error" variant="subtle" :title="editError" data-testid="community-edit-error" />
          </div>
          <div class="mt-6 flex justify-end gap-3 border-t border-slate-200 pt-4 dark:border-white/8">
            <UButton variant="ghost" color="neutral" :disabled="saving" @click="editOpen = false">Cancel</UButton>
            <UButton type="submit" :loading="saving" data-testid="community-edit-save">Save</UButton>
          </div>
        </form>
      </template>
    </UModal>

    <UModal v-model:open="fullOpen">
      <template #content>
        <div class="p-6">
          <h2 class="text-lg font-semibold text-slate-950 dark:text-white">{{ fullTarget?.name }}</h2>
          <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">{{ fullTarget?.addon }} · plain text, exactly as submitted</p>
          <pre class="mt-4 max-h-80 overflow-auto whitespace-pre-wrap break-all rounded border border-slate-200 p-3 font-mono text-xs text-slate-800 dark:border-white/10 dark:text-slate-200" data-testid="community-full-text">{{ fullText }}</pre>
          <div class="mt-6 flex justify-end border-t border-slate-200 pt-4 dark:border-white/8">
            <UButton variant="ghost" color="neutral" @click="fullOpen = false">Close</UButton>
          </div>
        </div>
      </template>
    </UModal>

    <UModal v-model:open="deleteOpen">
      <template #content>
        <div class="p-6">
          <h2 class="text-lg font-semibold text-slate-950 dark:text-white">Delete submission?</h2>
          <p class="mt-2 text-sm text-slate-500 dark:text-slate-400">
            <strong class="text-slate-950 dark:text-white">{{ deleteTarget?.name }}</strong> is removed for good, including from the public list if it was approved.
          </p>
          <div class="mt-6 flex justify-end gap-3 border-t border-slate-200 pt-4 dark:border-white/8">
            <UButton variant="ghost" color="neutral" :disabled="deleting" @click="deleteOpen = false">Cancel</UButton>
            <UButton color="error" :loading="deleting" data-testid="community-delete-confirm" @click="doDelete">Delete</UButton>
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'admin' })
useHead({ title: 'Community presets' })

type Status = 'pending' | 'approved' | 'rejected'
type Filter = Status | 'all'
interface AdminPreset {
  id: number, name: string, addon: string, note: string, testedVersion: string, status: Status
  createdAt: string, reviewedAt: string | null, stringLength: number, stringPreview: string, hash: string
}

const STATUS_LABEL: Record<Status, string> = { pending: 'Pending', approved: 'Approved', rejected: 'Rejected' }
const toast = useToast()
const route = useRoute()
const { apiFetch } = useApi()

const filters: Array<{ value: Filter, label: string }> = [
  { value: 'pending', label: 'Pending' }, { value: 'approved', label: 'Approved' }, { value: 'rejected', label: 'Rejected' }, { value: 'all', label: 'All' },
]
const initial = String(route.query.status ?? 'pending')
const filter = ref<Filter>((['pending', 'approved', 'rejected', 'all'].includes(initial) ? initial : 'pending') as Filter)
const items = ref<AdminPreset[]>([])
const counts = ref<Record<Status, number>>({ pending: 0, approved: 0, rejected: 0 })
const loading = ref(true)

const formatTime = (iso: string) => new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })

async function load() {
  try {
    const res = await apiFetch<{ items: AdminPreset[], counts: Record<Status, number> }>(`/api/v1/admin/community-presets${filter.value !== 'all' ? `?status=${filter.value}` : ''}`)
    items.value = res.items
    counts.value = res.counts
  } catch (error) {
    items.value = []
    toast.add({ title: errorMessage(error, 'Could not load submissions'), color: 'error' })
  } finally {
    loading.value = false
  }
}
onMounted(load)
function setFilter(v: Filter) { filter.value = v; loading.value = true; load() }

async function setStatus(p: AdminPreset, status: Status) {
  try {
    await apiFetch(`/api/v1/admin/community-presets/${p.id}`, { method: 'PATCH', body: { status } })
    toast.add({ title: status === 'approved' ? 'Approved' : 'Rejected', color: 'success' })
    await load()
  } catch (error) {
    toast.add({ title: errorMessage(error, 'Could not change the status'), color: 'error' })
  }
}

// ─── edit label ────────────────────────────────────────────────────────

const editOpen = ref(false)
const editTarget = ref<AdminPreset | null>(null)
const saving = ref(false)
const editError = ref('')
const editForm = reactive({ name: '', note: '', testedVersion: '' })

function openEdit(p: AdminPreset) {
  editTarget.value = p
  editError.value = ''
  Object.assign(editForm, { name: p.name, note: p.note, testedVersion: p.testedVersion })
  editOpen.value = true
}

async function saveEdit() {
  if (!editTarget.value) return
  saving.value = true
  editError.value = ''
  try {
    await apiFetch(`/api/v1/admin/community-presets/${editTarget.value.id}`, { method: 'PATCH', body: { ...editForm } })
    editOpen.value = false
    toast.add({ title: 'Label saved', color: 'success' })
    await load()
  } catch (error) {
    editError.value = errorMessage(error, 'Could not save the label')
  } finally {
    saving.value = false
  }
}

// ─── view string ───────────────────────────────────────────────────────

const fullOpen = ref(false)
const fullTarget = ref<AdminPreset | null>(null)
const fullText = ref('')

async function openFull(p: AdminPreset) {
  fullTarget.value = p
  fullText.value = 'Loading...'
  fullOpen.value = true
  try {
    fullText.value = (await apiFetch<{ presetString: string }>(`/api/v1/admin/community-presets/${p.id}`)).presetString
  } catch (error) {
    fullText.value = errorMessage(error, 'Could not load the string')
  }
}

// ─── delete ────────────────────────────────────────────────────────────

const deleteOpen = ref(false)
const deleteTarget = ref<AdminPreset | null>(null)
const deleting = ref(false)

function confirmDelete(p: AdminPreset) {
  deleteTarget.value = p
  deleteOpen.value = true
}

async function doDelete() {
  if (!deleteTarget.value) return
  deleting.value = true
  try {
    await apiFetch(`/api/v1/admin/community-presets/${deleteTarget.value.id}`, { method: 'DELETE' })
    deleteOpen.value = false
    toast.add({ title: 'Submission deleted', color: 'success' })
    await load()
  } catch (error) {
    toast.add({ title: errorMessage(error, 'Could not delete the submission'), color: 'error' })
  } finally {
    deleting.value = false
  }
}
</script>

<template>
  <div class="space-y-6" data-testid="admin-status-notices">
    <AdminPageHeader
      eyebrow="System"
      title="Status notices"
      description="Maintenance and incident notices shown on the public status page. Text is limited Markdown; raw HTML is shown as text."
    >
      <template #actions>
        <UButton color="neutral" variant="ghost" to="/status" target="_blank" rel="noopener">View public page</UButton>
        <UButton data-testid="notice-new" @click="openCreate">New notice</UButton>
      </template>
    </AdminPageHeader>

    <AdminPanel title="Notices" description="Open notices first. Resolving keeps a notice in the public history for 90 days; resolved notices are deleted after a year.">
      <p v-if="loading" class="py-8 text-center text-sm text-slate-500 dark:text-slate-400">Loading...</p>

      <div v-else-if="notices.length" class="admin-list" data-testid="notice-list">
        <div v-for="n in notices" :key="n.id" class="admin-row" :data-testid="`notice-row-${n.id}`">
          <div class="admin-row__content">
            <p class="admin-row__title">{{ n.title }}</p>
            <p class="admin-row__meta">
              {{ NOTICE_KIND_LABEL[n.kind] }} · {{ NOTICE_STATUS_LABEL[n.status] }}<template v-if="n.component"> · {{ NOTICE_COMPONENT_LABEL[n.component] }}</template>
            </p>
            <p class="admin-row__meta">
              {{ formatStatusTime(n.startsAt) }}<template v-if="n.endsAt"> to {{ formatStatusTime(n.endsAt) }}</template><template v-if="n.resolvedAt"> · resolved {{ formatStatusTime(n.resolvedAt) }}</template>
              · {{ n.updates.length }} {{ n.updates.length === 1 ? 'update' : 'updates' }}
            </p>
            <p v-if="n.body" class="mt-1 text-xs text-slate-500 dark:text-slate-400">{{ plainTextPreview(n.body, 160) }}</p>
          </div>
          <div class="admin-row__actions">
            <UButton size="xs" variant="ghost" color="neutral" :data-testid="`notice-update-${n.id}`" @click="openUpdate(n)">Add update</UButton>
            <UButton v-if="n.status !== 'resolved'" size="xs" variant="ghost" color="neutral" :data-testid="`notice-resolve-${n.id}`" @click="openUpdate(n, 'resolved')">Resolve</UButton>
            <UButton size="xs" variant="ghost" color="neutral" :data-testid="`notice-edit-${n.id}`" @click="openEdit(n)">Edit</UButton>
            <UButton size="xs" variant="ghost" color="error" :data-testid="`notice-delete-${n.id}`" @click="confirmDelete(n)">Delete</UButton>
          </div>
        </div>
      </div>

      <p v-else class="py-8 text-center text-sm text-slate-500 dark:text-slate-400" data-testid="notice-empty">
        No notices yet. The public page shows none until you create one.
      </p>
    </AdminPanel>

    <UModal v-model:open="formOpen">
      <template #content>
        <form class="p-6" data-testid="notice-form" @submit.prevent="save">
          <h2 class="text-lg font-semibold text-slate-950 dark:text-white">{{ editing ? 'Edit notice' : 'New notice' }}</h2>
          <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">Public text. Do not mention internal hosts, addresses or other services.</p>

          <div class="mt-5 space-y-4">
            <div class="grid gap-4 sm:grid-cols-2">
              <div class="admin-field">
                <label class="admin-field__label" for="notice-kind">Type</label>
                <select id="notice-kind" v-model="form.kind" class="admin-native-select" data-testid="notice-kind">
                  <option v-for="k in NOTICE_KINDS" :key="k" :value="k">{{ NOTICE_KIND_LABEL[k] }}</option>
                </select>
              </div>
              <div class="admin-field">
                <label class="admin-field__label" for="notice-component">Affected component</label>
                <select id="notice-component" v-model="form.component" class="admin-native-select" data-testid="notice-component">
                  <option value="">None</option>
                  <option v-for="c in NOTICE_COMPONENT_IDS" :key="c" :value="c">{{ NOTICE_COMPONENT_LABEL[c] }}</option>
                </select>
              </div>
            </div>

            <div class="admin-field">
              <label class="admin-field__label" for="notice-title">Title</label>
              <input id="notice-title" v-model="form.title" class="admin-native-input" type="text" :maxlength="NOTICE_TITLE_MAX" data-testid="notice-title" required>
            </div>

            <div class="grid gap-4 sm:grid-cols-2">
              <div class="admin-field">
                <label class="admin-field__label" for="notice-start">Starts (your local time)</label>
                <input id="notice-start" v-model="form.startsAt" class="admin-native-input" type="datetime-local" data-testid="notice-start" required>
              </div>
              <div class="admin-field">
                <label class="admin-field__label" for="notice-end">Ends (optional)</label>
                <input id="notice-end" v-model="form.endsAt" class="admin-native-input" type="datetime-local" data-testid="notice-end">
              </div>
            </div>

            <div v-if="!editing" class="admin-field">
              <label class="admin-field__label" for="notice-status">Status</label>
              <select id="notice-status" v-model="form.status" class="admin-native-select" data-testid="notice-status">
                <option value="">Automatic</option>
                <option v-for="s in createStatuses" :key="s" :value="s">{{ NOTICE_STATUS_LABEL[s] }}</option>
              </select>
              <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">Automatic: a maintenance window that starts later is scheduled, everything else is in progress.</p>
            </div>

            <div class="admin-field">
              <label class="admin-field__label" for="notice-body">Description (Markdown)</label>
              <textarea id="notice-body" v-model="form.body" class="admin-native-input min-h-28" :maxlength="NOTICE_BODY_MAX" data-testid="notice-body" />
              <div v-if="bodyPreview" class="mt-2 border-t border-slate-200 pt-2 text-sm dark:border-white/8">
                <p class="mb-1 text-xs text-slate-500 dark:text-slate-400">Preview</p>
                <SafeHtml :html="bodyPreview" class="status-notice-html" data-testid="notice-preview" />
              </div>
            </div>

            <UAlert v-if="formError" color="error" variant="subtle" :title="formError" data-testid="notice-error" />
          </div>

          <div class="mt-6 flex justify-end gap-3 border-t border-slate-200 pt-4 dark:border-white/8">
            <UButton variant="ghost" color="neutral" :disabled="saving" @click="formOpen = false">Cancel</UButton>
            <UButton type="submit" :loading="saving" data-testid="notice-save">{{ editing ? 'Save' : 'Create' }}</UButton>
          </div>
        </form>
      </template>
    </UModal>

    <UModal v-model:open="updateOpen">
      <template #content>
        <form class="p-6" data-testid="notice-update-form" @submit.prevent="saveUpdate">
          <h2 class="text-lg font-semibold text-slate-950 dark:text-white">Add update</h2>
          <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">{{ updateTarget?.title }}. Timeline entries cannot be edited or removed afterwards.</p>

          <div class="mt-5 space-y-4">
            <div class="admin-field">
              <label class="admin-field__label" for="update-status">Status</label>
              <select id="update-status" v-model="updateForm.status" class="admin-native-select" data-testid="update-status">
                <option v-if="updateTarget" value="">Keep: {{ NOTICE_STATUS_LABEL[updateTarget.status] }}</option>
                <option v-for="s in updateStatuses" :key="s" :value="s">{{ NOTICE_STATUS_LABEL[s] }}</option>
              </select>
            </div>
            <div class="admin-field">
              <label class="admin-field__label" for="update-body">Text (Markdown)</label>
              <textarea id="update-body" v-model="updateForm.body" class="admin-native-input min-h-24" :maxlength="NOTICE_UPDATE_MAX" data-testid="update-body" />
            </div>
            <UAlert v-if="updateError" color="error" variant="subtle" :title="updateError" data-testid="update-error" />
          </div>

          <div class="mt-6 flex justify-end gap-3 border-t border-slate-200 pt-4 dark:border-white/8">
            <UButton variant="ghost" color="neutral" :disabled="updating" @click="updateOpen = false">Cancel</UButton>
            <UButton type="submit" :loading="updating" data-testid="update-save">Post update</UButton>
          </div>
        </form>
      </template>
    </UModal>

    <UModal v-model:open="deleteOpen">
      <template #content>
        <div class="p-6">
          <h2 class="text-lg font-semibold text-slate-950 dark:text-white">Delete notice?</h2>
          <p class="mt-2 text-sm text-slate-500 dark:text-slate-400">
            <strong class="text-slate-950 dark:text-white">{{ deleteTarget?.title }}</strong> and its timeline are removed from the public page. Use Resolve to keep it as history.
          </p>
          <div class="mt-6 flex justify-end gap-3 border-t border-slate-200 pt-4 dark:border-white/8">
            <UButton variant="ghost" color="neutral" :disabled="deleting" @click="deleteOpen = false">Cancel</UButton>
            <UButton color="error" :loading="deleting" data-testid="notice-delete-confirm" @click="doDelete">Delete</UButton>
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import {
  NOTICE_COMPONENT_IDS, NOTICE_COMPONENT_LABEL, NOTICE_KINDS, NOTICE_KIND_LABEL, NOTICE_STATUSES, NOTICE_STATUS_LABEL,
  formatStatusTime, nextNoticeStatuses,
  type StatusComponentId, type StatusNoticeKind, type StatusNoticeStatus,
} from '~/utils/publicStatus'
import { renderNoticeMarkdown } from '~/utils/noticeMarkdown'
import { plainTextPreview } from '~/utils/richText'

definePageMeta({ layout: 'admin' })
useHead({ title: 'Status notices' })

// Mirrors the server limits (server/utils/statusNoticeStore.ts); the server enforces them.
const NOTICE_TITLE_MAX = 120
const NOTICE_BODY_MAX = 2000
const NOTICE_UPDATE_MAX = 1000

interface AdminNotice {
  id: number
  kind: StatusNoticeKind
  status: StatusNoticeStatus
  title: string
  body: string
  component: StatusComponentId | null
  startsAt: string
  endsAt: string | null
  resolvedAt: string | null
  updates: Array<{ id: number, status: StatusNoticeStatus, body: string, at: string }>
}

const toast = useToast()
const { apiFetch } = useApi()

const notices = ref<AdminNotice[]>([])
const loading = ref(true)

async function load() {
  try {
    notices.value = await apiFetch<AdminNotice[]>('/api/v1/admin/status-notices')
  } catch (error) {
    notices.value = []
    toast.add({ title: errorMessage(error, 'Could not load notices'), color: 'error' })
  } finally {
    loading.value = false
  }
}
const route = useRoute()
onMounted(async () => {
  await load()
  if (route.query.action === 'create') openCreate()
})

// ─── create / edit ─────────────────────────────────────────────────────

const pad = (n: number) => String(n).padStart(2, '0')
const toLocalInput = (iso: string | null) => {
  if (!iso) return ''
  const d = new Date(iso)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}
const fromLocalInput = (v: string) => v ? new Date(v).toISOString() : null

const formOpen = ref(false)
const editing = ref<AdminNotice | null>(null)
const saving = ref(false)
const formError = ref('')
const form = reactive({ kind: 'maintenance' as StatusNoticeKind, title: '', body: '', component: '' as StatusComponentId | '', startsAt: '', endsAt: '', status: '' as StatusNoticeStatus | '' })

const createStatuses = computed(() => NOTICE_STATUSES.filter(s => !(form.kind === 'incident' && s === 'scheduled')))
const bodyPreview = computed(() => renderNoticeMarkdown(form.body))

function openCreate() {
  editing.value = null
  formError.value = ''
  Object.assign(form, { kind: 'maintenance', title: '', body: '', component: '', startsAt: toLocalInput(new Date().toISOString()), endsAt: '', status: '' })
  formOpen.value = true
}

function openEdit(n: AdminNotice) {
  editing.value = n
  formError.value = ''
  Object.assign(form, { kind: n.kind, title: n.title, body: n.body, component: n.component ?? '', startsAt: toLocalInput(n.startsAt), endsAt: toLocalInput(n.endsAt), status: '' })
  formOpen.value = true
}

async function save() {
  saving.value = true
  formError.value = ''
  try {
    const payload = {
      kind: form.kind,
      title: form.title,
      body: form.body,
      component: form.component || null,
      startsAt: fromLocalInput(form.startsAt),
      endsAt: fromLocalInput(form.endsAt),
    }
    if (editing.value) {
      await apiFetch(`/api/v1/admin/status-notices/${editing.value.id}`, { method: 'PUT', body: payload })
    } else {
      await apiFetch('/api/v1/admin/status-notices', { method: 'POST', body: { ...payload, ...(form.status ? { status: form.status } : {}) } })
    }
    formOpen.value = false
    toast.add({ title: editing.value ? 'Notice saved' : 'Notice created', color: 'success' })
    await load()
  } catch (error) {
    formError.value = errorMessage(error, 'Could not save the notice')
  } finally {
    saving.value = false
  }
}

// ─── timeline update / resolve ─────────────────────────────────────────

const updateOpen = ref(false)
const updateTarget = ref<AdminNotice | null>(null)
const updating = ref(false)
const updateError = ref('')
const updateForm = reactive({ status: '' as StatusNoticeStatus | '', body: '' })
const updateStatuses = computed(() => updateTarget.value ? nextNoticeStatuses(updateTarget.value.status) : [])

function openUpdate(n: AdminNotice, status: StatusNoticeStatus | '' = '') {
  updateTarget.value = n
  updateError.value = ''
  Object.assign(updateForm, { status, body: '' })
  updateOpen.value = true
}

async function saveUpdate() {
  if (!updateTarget.value) return
  updating.value = true
  updateError.value = ''
  try {
    await apiFetch(`/api/v1/admin/status-notices/${updateTarget.value.id}/updates`, {
      method: 'POST',
      body: { ...(updateForm.status ? { status: updateForm.status } : {}), body: updateForm.body },
    })
    updateOpen.value = false
    toast.add({ title: 'Update posted', color: 'success' })
    await load()
  } catch (error) {
    updateError.value = errorMessage(error, 'Could not post the update')
  } finally {
    updating.value = false
  }
}

// ─── delete ────────────────────────────────────────────────────────────

const deleteOpen = ref(false)
const deleteTarget = ref<AdminNotice | null>(null)
const deleting = ref(false)

function confirmDelete(n: AdminNotice) {
  deleteTarget.value = n
  deleteOpen.value = true
}

async function doDelete() {
  if (!deleteTarget.value) return
  deleting.value = true
  try {
    await apiFetch(`/api/v1/admin/status-notices/${deleteTarget.value.id}`, { method: 'DELETE' })
    deleteOpen.value = false
    toast.add({ title: 'Notice deleted', color: 'success' })
    await load()
  } catch (error) {
    toast.add({ title: errorMessage(error, 'Could not delete the notice'), color: 'error' })
  } finally {
    deleting.value = false
  }
}
</script>

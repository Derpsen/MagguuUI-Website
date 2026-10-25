<template>
  <div class="space-y-6">
    <AdminPageHeader
      icon="i-heroicons-document-magnifying-glass"
      eyebrow="System"
      title="Audit log"
      description="Who changed what, with a before/after diff. Content pages, changelog and FAQ entries can be undone while nothing has changed since."
    >
      <template #badge>
        <UBadge v-if="!loading" color="info" variant="subtle">{{ total }} {{ total === 1 ? 'entry' : 'entries' }}</UBadge>
      </template>
    </AdminPageHeader>

    <p class="admin-audit__note">
      Secrets are never stored: passwords, hashes, session and API tokens, passkey data and webhook URLs are redacted before an entry is written.
      The log keeps the newest {{ MAX_ROWS }} entries for up to {{ MAX_DAYS }} days.
    </p>

    <div class="admin-filterbar" data-testid="audit-filters">
      <UInput v-model="search" placeholder="Search entity or text" icon="i-heroicons-magnifying-glass" class="w-full sm:w-52" aria-label="Search the audit log" data-testid="audit-search" />
      <USelect v-model="filterType" :items="typeOptions" value-key="value" class="w-36" aria-label="Filter by type" />
      <USelect v-model="filterAction" :items="actionOptions" value-key="value" class="w-32" aria-label="Filter by action" />
      <UInput v-model="actor" placeholder="Actor" class="w-full sm:w-32" aria-label="Filter by actor" />
      <UInput v-model="dateFrom" type="date" class="w-36" aria-label="From date" />
      <UInput v-model="dateTo" type="date" class="w-36" aria-label="To date" />
      <UButton v-if="hasFilters" variant="ghost" color="neutral" size="xs" icon="i-heroicons-x-mark" @click="clearFilters">Clear</UButton>
    </div>

    <div v-if="loading && !items.length" class="py-12 text-center">
      <UIcon name="i-heroicons-arrow-path" class="mx-auto h-8 w-8 animate-spin text-blue-500" />
    </div>

    <ol v-else-if="items.length" class="admin-audit" :class="loading ? 'opacity-60' : ''" data-testid="audit-list">
      <li v-for="entry in items" :key="entry.id" class="admin-audit__item" :data-testid="`audit-entry-${entry.id}`">
        <div class="admin-audit__row">
          <span class="admin-audit__action" :class="`admin-audit__action--${entry.action}`">{{ entry.action }}</span>
          <div class="min-w-0 flex-1">
            <p class="admin-audit__name">
              {{ entry.entityName }}
              <span v-if="entry.entityId" class="admin-audit__id">#{{ entry.entityId }}</span>
            </p>
            <p class="admin-audit__meta">
              <span class="admin-audit__type">{{ typeLabel(entry.entityType) }}</span>
              · {{ entry.actorName || 'system' }} · {{ formatTime(entry.createdAt) }}
              <template v-if="entry.undoOf"> · undo of #{{ entry.undoOf }}</template>
              <template v-if="entry.undoneBy"> · undone by #{{ entry.undoneBy }}</template>
            </p>
          </div>
          <div class="admin-audit__actions">
            <UButton size="xs" variant="ghost" color="neutral" :aria-expanded="openId === entry.id" :data-testid="`audit-toggle-${entry.id}`" @click="toggle(entry.id)">
              {{ openId === entry.id ? 'Hide diff' : 'Show diff' }}
            </UButton>
            <template v-if="entry.undoable">
              <UButton v-if="confirmId !== entry.id" size="xs" variant="soft" color="neutral" icon="i-heroicons-arrow-uturn-left" :data-testid="`audit-undo-${entry.id}`" @click="confirmId = entry.id">
                Undo
              </UButton>
              <template v-else>
                <UButton size="xs" color="error" variant="soft" :loading="undoing === entry.id" :data-testid="`audit-undo-confirm-${entry.id}`" @click="undo(entry.id)">
                  Restore before-state
                </UButton>
                <UButton size="xs" variant="ghost" color="neutral" @click="confirmId = null">Keep</UButton>
              </template>
            </template>
          </div>
        </div>

        <div v-if="openId === entry.id" class="admin-audit__diff" :data-testid="`audit-diff-${entry.id}`">
          <p v-if="!changesFor(entry).length" class="admin-audit__meta">No visible field changes.</p>
          <div v-for="change in changesFor(entry)" :key="change.field" class="admin-audit__field">
            <p class="admin-audit__fieldname">{{ change.field }} <span>{{ change.kind }}</span></p>
            <pre class="admin-audit__lines"><code><template v-for="(line, i) in change.lines" :key="i"><span class="admin-audit__line" :class="`admin-audit__line--${line.type}`" :data-diff="line.type">{{ linePrefix(line.type) }}{{ line.text }}
</span></template></code></pre>
          </div>
        </div>
      </li>
    </ol>

    <AdminEmptyState
      v-else
      icon="i-heroicons-document-magnifying-glass"
      :title="hasFilters ? 'No matching entries' : 'No audited changes yet'"
      :description="hasFilters ? 'Try broader filters or clear the search.' : 'Content, changelog, FAQ, settings and strings changes will appear here.'"
    />

    <div v-if="totalPages > 1" class="flex items-center justify-between gap-3 text-sm text-slate-500 dark:text-slate-400">
      <span>Page {{ page }} of {{ totalPages }}</span>
      <div class="flex items-center gap-1.5">
        <UButton size="xs" variant="ghost" color="neutral" icon="i-heroicons-chevron-left" aria-label="Previous page" :disabled="page <= 1" @click="page--" />
        <UButton size="xs" variant="ghost" color="neutral" icon="i-heroicons-chevron-right" aria-label="Next page" :disabled="page >= totalPages" @click="page++" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { diffSnapshots } from '~/utils/auditDiff'

definePageMeta({ layout: 'admin' })

interface AuditEntry {
  id: number
  action: 'created' | 'updated' | 'deleted' | 'exported'
  entityType: string
  entityId: number | null
  entityName: string
  before: Record<string, unknown> | null
  after: Record<string, unknown> | null
  actorName: string | null
  undoOf: number | null
  undoneBy: number | null
  createdAt: number
  undoable: boolean
}

const MAX_ROWS = 5000
const MAX_DAYS = 90
const { apiFetch } = useApi()
const toast = useToast()

const items = ref<AuditEntry[]>([])
const loading = ref(true)
const total = ref(0)
const totalPages = ref(1)
const page = ref(1)
const openId = ref<number | null>(null)
const confirmId = ref<number | null>(null)
const undoing = ref<number | null>(null)

const search = ref('')
const actor = ref('')
const filterType = ref('all')
const filterAction = ref('all')
const dateFrom = ref('')
const dateTo = ref('')

const typeOptions = [
  { label: 'All types', value: 'all' },
  { label: 'Content', value: 'content' },
  { label: 'Changelog', value: 'changelog' },
  { label: 'FAQ', value: 'faq' },
  { label: 'Setting', value: 'setting' },
  { label: 'Addon Profile', value: 'profile' },
  { label: 'WowUp String', value: 'wowup' },
  { label: 'Character Layout', value: 'layout' },
  { label: 'Status notice', value: 'status_notice' },
  { label: 'Community preset', value: 'community_preset' },
  { label: 'Visitor export', value: 'visitor_export' },
]
const actionOptions = [
  { label: 'All actions', value: 'all' },
  { label: 'Created', value: 'created' },
  { label: 'Updated', value: 'updated' },
  { label: 'Deleted', value: 'deleted' },
  { label: 'Exported', value: 'exported' },
]
const typeLabel = (t: string) => typeOptions.find(o => o.value === t)?.label || t

const hasFilters = computed(() => !!(search.value || actor.value || dateFrom.value || dateTo.value || filterType.value !== 'all' || filterAction.value !== 'all'))

function clearFilters() {
  search.value = ''
  actor.value = ''
  dateFrom.value = ''
  dateTo.value = ''
  filterType.value = 'all'
  filterAction.value = 'all'
}

const formatTime = (ts: number) => new Date(ts * 1000).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })
const linePrefix = (t: string) => (t === 'add' ? '+ ' : t === 'del' ? '- ' : '  ')

const toggle = (id: number) => { openId.value = openId.value === id ? null : id }
const changesFor = (e: AuditEntry) => diffSnapshots(e.before, e.after)

async function load() {
  loading.value = true
  try {
    const params = new URLSearchParams({ page: String(page.value), limit: '25' })
    if (search.value) params.set('search', search.value)
    if (actor.value) params.set('actor', actor.value)
    if (filterType.value !== 'all') params.set('type', filterType.value)
    if (filterAction.value !== 'all') params.set('action', filterAction.value)
    if (dateFrom.value) params.set('dateFrom', dateFrom.value)
    if (dateTo.value) params.set('dateTo', dateTo.value)
    const res = await apiFetch<{ items: AuditEntry[], total: number, totalPages: number }>(`/api/v1/admin/audit?${params}`)
    items.value = res.items
    total.value = res.total
    totalPages.value = res.totalPages
  } catch {
    items.value = []
  } finally {
    loading.value = false
  }
}

async function undo(id: number) {
  undoing.value = id
  try {
    await apiFetch(`/api/v1/admin/audit/${id}/undo`, { method: 'POST' })
    toast.add({ title: 'Restored', description: 'The before-state is back and the undo is logged as a new entry.', color: 'success' })
    confirmId.value = null
    await load()
  } catch (e) {
    const message = (e as { data?: { message?: string, statusMessage?: string } })?.data?.message
      || (e as { data?: { statusMessage?: string } })?.data?.statusMessage || 'Undo failed'
    toast.add({ title: 'Not restored', description: message, color: 'error' })
    confirmId.value = null
  } finally {
    undoing.value = null
  }
}

let timer: ReturnType<typeof setTimeout> | undefined
watch([search, actor, filterType, filterAction, dateFrom, dateTo], () => {
  page.value = 1
  clearTimeout(timer)
  timer = setTimeout(load, 250)
})
watch(page, load)
onBeforeUnmount(() => clearTimeout(timer))
onMounted(load)
</script>

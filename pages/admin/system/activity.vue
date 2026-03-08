<!--
  Admin — Activity Log (Dashboard-style: 4-col stats, entrance animations, compact)
-->

<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <div class="flex items-center gap-3">
        <h1 class="text-2xl font-bold text-gradient">Activity Log</h1>
        <UBadge v-if="!loading && !hasActiveFilters" color="info" variant="subtle" size="xs">{{ total }} {{ total === 1 ? 'entry' : 'entries' }}</UBadge>
        <UBadge v-if="!loading && hasActiveFilters" color="warning" variant="subtle" size="xs">
          {{ total }} {{ total === 1 ? 'result' : 'results' }}<template v-if="searchQuery"> for "{{ searchQuery }}"</template>
        </UBadge>
      </div>
    </div>

    <!-- Quick Stats — Dashboard Style (4 cards) -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <div v-for="(stat, idx) in statCards" :key="stat.label"
        class="glass rounded-xl p-5 admin-fade-in" :class="'admin-stagger-' + (idx + 1)">
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

    <!-- Filters -->
    <div class="glass rounded-xl p-4 mb-4 admin-fade-in admin-stagger-3">
      <!-- Row 1: Search + Dropdowns + Sort -->
      <div class="flex flex-wrap items-center gap-3">
        <UInput v-model="searchQuery" placeholder="Search by name..." size="sm" class="w-48"
          icon="i-heroicons-magnifying-glass">
          <template #trailing>
            <button v-if="searchQuery" class="text-silver-500 hover:text-silver-300" @click="searchQuery = ''">
              <UIcon name="i-heroicons-x-mark" class="w-3.5 h-3.5" />
            </button>
          </template>
        </UInput>

        <USelect v-model="filterAction" :items="actionOptions" value-key="value" placeholder="All actions" class="w-40" size="sm" />
        <USelect v-model="filterType" :items="typeOptions" value-key="value" placeholder="All types" class="w-44" size="sm" />

        <div class="flex-1" />

        <UButton
          :icon="sortOrder === 'desc' ? 'i-heroicons-bars-arrow-down' : 'i-heroicons-bars-arrow-up'"
          variant="ghost" color="neutral" size="sm"
          @click="toggleSort">
          {{ sortOrder === 'desc' ? 'Newest' : 'Oldest' }}
        </UButton>

        <UButton v-if="hasActiveFilters" variant="ghost" color="neutral" size="xs" icon="i-heroicons-x-mark" @click="clearFilters">
          Clear
        </UButton>
      </div>

      <!-- Row 2: Date range -->
      <div class="flex items-center gap-1.5 pt-2 mt-3" :class="isDark ? 'border-t border-brand-400/5' : 'border-t border-gray-100'">
        <UIcon name="i-heroicons-calendar-days" class="w-4 h-4 flex-shrink-0" :class="isDark ? 'text-silver-500' : 'text-gray-400'" />
        <span class="text-xs font-medium mr-1" :class="isDark ? 'text-silver-500' : 'text-gray-500'">Date range</span>
        <UInput v-model="dateFrom" type="date" size="sm" class="w-36" placeholder="From" />
        <span class="text-xs" :class="isDark ? 'text-silver-600' : 'text-gray-400'">&ndash;</span>
        <UInput v-model="dateTo" type="date" size="sm" class="w-36" placeholder="To" />
      </div>
    </div>

    <!-- List -->
    <div v-if="items.length || loading" class="relative admin-fade-in admin-stagger-4">
      <div v-if="loading && items.length" class="absolute inset-0 z-10 flex items-center justify-center rounded-xl"
        :class="isDark ? 'bg-brand-950/40' : 'bg-white/40'">
        <UIcon name="i-heroicons-arrow-path" class="w-6 h-6 text-brand-400 animate-spin" />
      </div>

      <div v-if="loading && !items.length" class="glass rounded-xl p-12 text-center">
        <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 text-brand-400 animate-spin mx-auto" />
      </div>

      <div v-else class="glass rounded-xl overflow-hidden transition-opacity duration-200"
        :class="loading ? 'opacity-50 pointer-events-none' : ''">
        <div class="divide-y" :class="isDark ? 'divide-brand-400/5' : 'divide-gray-100'">
          <div v-for="item in items" :key="item.id"
            class="px-5 py-3.5 transition-colors cursor-pointer"
            :class="isDark ? 'hover:bg-white/[0.02]' : 'hover:bg-gray-50/50'"
            @click="toggleDetail(item.id)">
            <div class="flex items-start gap-3">
              <!-- Icon -->
              <div class="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                :class="actionBg(item.action)">
                <UIcon :name="actionIcon(item.action)" class="w-4 h-4" :class="actionColor(item.action)" />
              </div>

              <div class="flex-1 min-w-0">
                <div class="flex items-center justify-between gap-2">
                  <p class="text-sm" :class="isDark ? 'text-silver-200' : 'text-gray-800'">
                    <span class="font-medium" :class="actionColor(item.action)">{{ typeLabel(item.entityType) }}</span>
                    <span class="mx-1.5" :class="isDark ? 'text-silver-600' : 'text-gray-400'">&middot;</span>
                    <span class="font-semibold" :class="isDark ? 'text-white' : 'text-gray-900'">{{ item.entityName }}</span>
                  </p>
                  <UBadge :color="actionBadgeColor(item.action)" variant="subtle" size="xs" class="flex-shrink-0">
                    {{ item.action }}
                  </UBadge>
                </div>
                <p class="text-xs mt-0.5" :class="isDark ? 'text-silver-600' : 'text-gray-400'">
                  {{ timeAgo(item.createdAt) }}
                  <span class="mx-1">&middot;</span>
                  {{ formatDate(item.createdAt) }}
                  <template v-if="item.entityId">
                    <span class="mx-1">&middot;</span>
                    <span class="font-mono">ID: {{ item.entityId }}</span>
                  </template>
                </p>

                <!-- Expandable Details -->
                <Transition enter-active-class="transition duration-200 ease-out" enter-from-class="opacity-0 max-h-0" enter-to-class="opacity-100 max-h-40"
                  leave-active-class="transition duration-150 ease-in" leave-from-class="opacity-100 max-h-40" leave-to-class="opacity-0 max-h-0">
                  <div v-if="expandedId === item.id && item.details" class="mt-2 overflow-hidden">
                    <pre class="text-xs p-3 rounded-lg font-mono whitespace-pre-wrap break-words"
                      :class="isDark ? 'bg-brand-900/50 text-silver-400' : 'bg-gray-50 text-gray-500'">{{ formatDetails(item.details) }}</pre>
                  </div>
                </Transition>
              </div>
            </div>
          </div>
        </div>

        <!-- Pagination -->
        <div v-if="totalPages > 1" class="flex items-center justify-between px-5 py-3"
          :class="isDark ? 'border-t border-brand-400/5' : 'border-t border-gray-100'">
          <span class="text-xs" :class="isDark ? 'text-silver-500' : 'text-gray-500'">
            Page {{ page }} of {{ totalPages }}
          </span>
          <div class="flex gap-1.5">
            <UButton size="xs" variant="ghost" color="neutral" icon="i-heroicons-chevron-left" :disabled="page <= 1" @click="page--" />
            <template v-for="p in paginationRange" :key="p">
              <UButton v-if="p !== '...'" size="xs" :variant="p === page ? 'subtle' : 'ghost'" :color="p === page ? 'primary' : 'neutral'" @click="page = p as number">{{ p }}</UButton>
              <span v-else class="text-xs px-1 self-center" :class="isDark ? 'text-silver-600' : 'text-gray-400'">...</span>
            </template>
            <UButton size="xs" variant="ghost" color="neutral" icon="i-heroicons-chevron-right" :disabled="page >= totalPages" @click="page++" />
          </div>
        </div>
      </div>
    </div>

    <!-- Empty state -->
    <div v-else class="glass rounded-xl p-12 text-center admin-fade-in admin-stagger-4">
      <UIcon name="i-heroicons-clock" class="w-12 h-12 mx-auto mb-4" :class="isDark ? 'text-silver-700' : 'text-gray-300'" />
      <template v-if="hasActiveFilters">
        <p class="mb-2" :class="isDark ? 'text-silver-400' : 'text-gray-600'">No entries match your filters</p>
        <UButton variant="ghost" size="sm" @click="clearFilters" icon="i-heroicons-x-mark">Clear filters</UButton>
      </template>
      <p v-else :class="isDark ? 'text-silver-500' : 'text-gray-500'">No activity yet.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'admin' })

const { apiFetch } = useApi()
const isDark = useIsDark()
const route = useRoute()
const router = useRouter()

interface Activity { id: number; action: string; entityType: string; entityId: number | null; entityName: string; details: string | null; userId: number | null; createdAt: string }
const items = ref<Activity[]>([])
const loading = ref(true)
const total = ref(0)
const totalPages = ref(1)
const expandedId = ref<number | null>(null)

// Quick stats (loaded once)
const quickStats = ref<{ created: number; updated: number; deleted: number } | null>(null)

// Dashboard-style stat cards (4 columns)
const statCards = computed(() => [
  { label: 'Total Entries', value: total.value, icon: 'i-heroicons-clipboard-document-list', bg: 'bg-blue-500/10', color: 'text-blue-400' },
  { label: 'Created (7d)', value: quickStats.value?.created ?? '—', icon: 'i-heroicons-plus-circle', bg: 'bg-green-500/10', color: 'text-green-400' },
  { label: 'Updated (7d)', value: quickStats.value?.updated ?? '—', icon: 'i-heroicons-pencil-square', bg: 'bg-amber-500/10', color: 'text-amber-400' },
  { label: 'Deleted (7d)', value: quickStats.value?.deleted ?? '—', icon: 'i-heroicons-trash', bg: 'bg-red-500/10', color: 'text-red-400' },
])

// State from URL query params
const page = ref(Number(route.query.page) || 1)
const filterAction = ref((route.query.action as string) || '')
const filterType = ref((route.query.type as string) || '')
const sortOrder = ref<'asc' | 'desc'>((route.query.sort as 'asc' | 'desc') || 'desc')
const dateFrom = ref((route.query.dateFrom as string) || '')
const dateTo = ref((route.query.dateTo as string) || '')
const searchQuery = ref((route.query.search as string) || '')

const hasActiveFilters = computed(() => !!(filterAction.value || filterType.value || dateFrom.value || dateTo.value || searchQuery.value))

const actionOptions = [
  { label: 'All actions', value: '' },
  { label: 'Created', value: 'created' },
  { label: 'Updated', value: 'updated' },
  { label: 'Deleted', value: 'deleted' },
]

const typeOptions = [
  { label: 'All types', value: '' },
  { label: 'Addon Profile', value: 'profile' },
  { label: 'WowUp String', value: 'wowup' },
  { label: 'Character Layout', value: 'layout' },
  { label: 'Changelog', value: 'changelog' },
  { label: 'Content', value: 'content' },
]

function clearFilters() {
  filterAction.value = ''
  filterType.value = ''
  dateFrom.value = ''
  dateTo.value = ''
  searchQuery.value = ''
}

function toggleSort() { sortOrder.value = sortOrder.value === 'desc' ? 'asc' : 'desc' }
function toggleDetail(id: number) { expandedId.value = expandedId.value === id ? null : id }

function formatDetails(details: string | null): string {
  if (!details) return ''
  try {
    return JSON.stringify(JSON.parse(details), null, 2)
  } catch {
    return details
  }
}

// Pagination range with ellipsis
const paginationRange = computed(() => {
  const total = totalPages.value
  const current = page.value
  if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1)
  const range: (number | string)[] = [1]
  if (current > 3) range.push('...')
  for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) range.push(i)
  if (current < total - 2) range.push('...')
  range.push(total)
  return range
})

// Sync state -> URL query params
function syncQueryParams() {
  const query: Record<string, string> = {}
  if (filterAction.value) query.action = filterAction.value
  if (filterType.value) query.type = filterType.value
  if (page.value > 1) query.page = String(page.value)
  if (sortOrder.value !== 'desc') query.sort = sortOrder.value
  if (dateFrom.value) query.dateFrom = dateFrom.value
  if (dateTo.value) query.dateTo = dateTo.value
  if (searchQuery.value) query.search = searchQuery.value
  router.replace({ query })
}

// Debounced search
let searchTimeout: ReturnType<typeof setTimeout>
watch(searchQuery, () => {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    page.value = 1
    syncQueryParams()
    load()
  }, 300)
})

watch([filterAction, filterType, sortOrder, dateFrom, dateTo], () => {
  page.value = 1
  syncQueryParams()
  load()
})

watch(page, () => {
  syncQueryParams()
  window.scrollTo({ top: 0, behavior: 'smooth' })
  load()
})

async function load() {
  loading.value = true
  try {
    const params = new URLSearchParams({ page: String(page.value), limit: '25', sort: sortOrder.value })
    if (filterAction.value) params.set('action', filterAction.value)
    if (filterType.value) params.set('type', filterType.value)
    if (dateFrom.value) params.set('dateFrom', dateFrom.value)
    if (dateTo.value) params.set('dateTo', dateTo.value)
    if (searchQuery.value) params.set('search', searchQuery.value)
    const res = await apiFetch<any>(`/api/v1/admin/activity?${params}`)
    items.value = res?.items || []
    total.value = res?.total || 0
    totalPages.value = res?.totalPages || 1
  } catch { /* ok */ }
  finally { loading.value = false }
}

async function loadQuickStats() {
  try {
    const res = await apiFetch<any>('/api/v1/admin/activity/stats')
    if (res) quickStats.value = res
  } catch { /* ok */ }
}

onMounted(() => { load(); loadQuickStats() })

// Helpers
function typeLabel(type: string) {
  const labels: Record<string, string> = { profile: 'Addon Profile', wowup: 'WowUp String', layout: 'Character Layout', changelog: 'Changelog', content: 'Content' }
  return labels[type] || type
}
function actionIcon(a: string) { return a === 'created' ? 'i-heroicons-plus-circle' : a === 'updated' ? 'i-heroicons-pencil-square' : a === 'deleted' ? 'i-heroicons-trash' : 'i-heroicons-information-circle' }
function actionColor(a: string) { return a === 'created' ? 'text-green-400' : a === 'updated' ? 'text-blue-400' : a === 'deleted' ? 'text-red-400' : 'text-silver-400' }
function actionBg(a: string) { return a === 'created' ? 'bg-green-500/10' : a === 'updated' ? 'bg-blue-500/10' : a === 'deleted' ? 'bg-red-500/10' : 'bg-silver-500/10' }
function actionBadgeColor(a: string) { return a === 'created' ? 'success' : a === 'updated' ? 'info' : a === 'deleted' ? 'error' : 'neutral' }

function timeAgo(d: string | number | null) {
  if (!d) return ''
  const date = typeof d === 'number' ? new Date(d * 1000) : new Date(d)
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  return `${Math.floor(days / 30)}mo ago`
}

function formatDate(d: string | number) {
  if (!d) return '—'
  const date = typeof d === 'number' ? new Date(d * 1000) : new Date(d)
  return date.toLocaleDateString('en-US', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}
</script>

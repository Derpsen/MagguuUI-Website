<template>
  <div class="space-y-6">
    <AdminPageHeader
      icon="i-heroicons-clock"
      eyebrow="System"
      title="Activity"
      description="Audit changes without turning the log into a dashboard of its own."
    >
      <template #badge>
        <UBadge v-if="!loading" :color="hasActiveFilters ? 'warning' : 'info'" variant="subtle">
          {{ total }} {{ total === 1 ? "entry" : "entries" }}
        </UBadge>
      </template>
    </AdminPageHeader>

    <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <AdminMetricCard
        v-for="stat in statCards"
        :key="stat.label"
        :label="stat.label"
        :value="stat.value"
        :icon="stat.icon"
        :tone="stat.tone"
      />
    </div>

    <AdminPanel
      title="Audit log"
      description="Filter by action, type and date range."
      icon="i-heroicons-clipboard-document-list"
    >
      <!-- Compact single-row filter bar -->
      <div class="admin-filterbar">
        <UInput v-model="searchQuery" placeholder="Search..." icon="i-heroicons-magnifying-glass" class="w-full sm:w-44" />
        <USelect v-model="filterAction" :items="actionOptions" value-key="value" placeholder="All actions" class="w-28" />
        <USelect v-model="filterType" :items="typeOptions" value-key="value" placeholder="All types" class="w-36" />
        <UInput v-model="dateFrom" type="date" class="w-34" />
        <UInput v-model="dateTo" type="date" class="w-34" />

        <div class="flex items-center gap-1.5 sm:ml-auto">
          <UButton
            :icon="sortOrder === 'desc' ? 'i-heroicons-bars-arrow-down' : 'i-heroicons-bars-arrow-up'"
            variant="ghost"
            color="neutral"
            size="xs"
            @click="toggleSort"
          >
            {{ sortOrder === "desc" ? "Newest" : "Oldest" }}
          </UButton>
          <UButton v-if="hasActiveFilters" variant="ghost" color="neutral" size="xs" icon="i-heroicons-x-mark" @click="clearFilters">
            Clear
          </UButton>
        </div>
      </div>

      <!-- Loading spinner -->
      <div v-if="loading && !items.length" class="py-12 text-center">
        <UIcon name="i-heroicons-arrow-path" class="mx-auto h-8 w-8 animate-spin text-blue-500" />
      </div>

      <!-- Timeline grouped by day -->
      <div v-else-if="groupedEntries.length" class="mt-5 space-y-6" :class="loading ? 'opacity-60' : ''">
        <div v-for="group in groupedEntries" :key="group.label">
          <!-- Day header -->
          <div class="mb-3 flex items-center gap-3">
            <span class="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {{ group.label }}
            </span>
            <span class="admin-pill">{{ group.items.length }}</span>
            <div class="h-px flex-1 bg-slate-200/60 dark:bg-slate-700/40" />
          </div>

          <!-- Timeline entries -->
          <div class="relative ml-4 border-l border-slate-200/70 pl-6 dark:border-slate-700/50">
            <div v-for="item in group.items" :key="item.id" class="group relative pb-5 last:pb-0">
              <!-- Timeline dot -->
              <div
                class="absolute -left-[calc(1.5rem+5px)] top-1 flex h-2.5 w-2.5 items-center justify-center rounded-full ring-4 ring-white dark:ring-slate-900"
                :class="dotColor(item.action)"
              />

              <!-- Entry card -->
              <div class="admin-activity-row">
                <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl" :class="actionTone(item.action)">
                  <UIcon :name="actionIcon(item.action)" class="h-4 w-4" />
                </div>

                <div class="min-w-0 flex-1">
                  <div class="flex flex-wrap items-center gap-2">
                    <span class="text-[0.92rem] font-semibold text-slate-800 dark:text-slate-100">
                      {{ item.entityName }}
                    </span>
                    <UBadge :color="actionBadgeColor(item.action)" variant="subtle" size="xs">{{ item.action }}</UBadge>
                    <span class="admin-pill">{{ typeLabel(item.entityType) }}</span>
                  </div>

                  <p class="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                    <span v-if="item.entityId">ID {{ item.entityId }} &middot; </span>
                    {{ timeAgo(item.createdAt) }} &middot; {{ formatTime(item.createdAt) }}
                  </p>

                  <!-- Details expand -->
                  <div v-if="item.details" class="mt-2">
                    <UButton
                      size="xs"
                      color="neutral"
                      variant="ghost"
                      :icon="expandedId === item.id ? 'i-heroicons-chevron-up' : 'i-heroicons-chevron-down'"
                      @click="toggleDetail(item.id)"
                    >
                      {{ expandedId === item.id ? "Hide details" : "Details" }}
                    </UButton>

                    <div v-if="expandedId === item.id" class="admin-subpanel mt-2.5">
                      <template v-if="parsedDetails(item.details)">
                        <div
                          v-for="(val, key) in parsedDetails(item.details)"
                          :key="String(key)"
                          class="flex items-baseline gap-3 py-1.5 text-sm not-last:border-b not-last:border-slate-200/40 dark:not-last:border-slate-700/30"
                        >
                          <span class="w-28 shrink-0 text-xs font-medium text-slate-500 dark:text-slate-400">{{ humanizeKey(String(key)) }}</span>
                          <span class="min-w-0 break-words text-slate-700 dark:text-slate-200">{{ formatValue(val) }}</span>
                        </div>
                      </template>
                      <pre v-else class="whitespace-pre-wrap break-words text-xs text-slate-600 dark:text-slate-300">{{ formatDetailsRaw(item.details) }}</pre>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Empty state -->
      <AdminEmptyState
        v-else
        icon="i-heroicons-clock"
        :title="hasActiveFilters ? 'No matching entries' : 'No activity yet'"
        :description="hasActiveFilters ? 'Try broader filters or clear the search.' : 'Administrative changes will appear here.'"
      >
        <template v-if="hasActiveFilters" #actions>
          <UButton variant="ghost" color="neutral" icon="i-heroicons-x-mark" @click="clearFilters">Clear filters</UButton>
        </template>
      </AdminEmptyState>

      <!-- Pagination -->
      <template v-if="totalPages > 1" #footer>
        <div class="flex w-full items-center justify-between gap-3 text-sm text-slate-500 dark:text-slate-400">
          <span>Page {{ page }} of {{ totalPages }}</span>

          <div class="flex items-center gap-1.5">
            <UButton size="xs" variant="ghost" color="neutral" icon="i-heroicons-chevron-left" :disabled="page <= 1" @click="page--" />
            <template v-for="entry in paginationRange" :key="entry">
              <UButton
                v-if="entry !== '...'"
                size="xs"
                :variant="entry === page ? 'solid' : 'ghost'"
                :color="entry === page ? 'primary' : 'neutral'"
                @click="page = entry as number"
              >
                {{ entry }}
              </UButton>
              <span v-else class="px-1 text-xs">...</span>
            </template>
            <UButton size="xs" variant="ghost" color="neutral" icon="i-heroicons-chevron-right" :disabled="page >= totalPages" @click="page++" />
          </div>
        </div>
      </template>
    </AdminPanel>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: "admin" })

const { apiFetch } = useApi()
const route = useRoute()
const router = useRouter()

interface Activity {
  id: number
  action: string
  entityType: string
  entityId: number | null
  entityName: string
  details: string | null
  userId: number | null
  createdAt: string
}

interface DayGroup {
  label: string
  dateKey: string
  items: Activity[]
}

const items = ref<Activity[]>([])
const loading = ref(true)
const total = ref(0)
const totalPages = ref(1)
const expandedId = ref<number | null>(null)
const quickStats = ref<{ created: number; updated: number; deleted: number } | null>(null)

const statCards = computed(() => [
  { label: "Total Entries", value: total.value, icon: "i-heroicons-clipboard-document-list", tone: "brand" as const },
  { label: "Created (7d)", value: quickStats.value?.created ?? "-", icon: "i-heroicons-plus-circle", tone: "success" as const },
  { label: "Updated (7d)", value: quickStats.value?.updated ?? "-", icon: "i-heroicons-pencil-square", tone: "warning" as const },
  { label: "Deleted (7d)", value: quickStats.value?.deleted ?? "-", icon: "i-heroicons-trash", tone: "danger" as const },
])

const page = ref(Number(route.query.page) || 1)
const filterAction = ref((route.query.action as string) || "")
const filterType = ref((route.query.type as string) || "")
const sortOrder = ref<"asc" | "desc">((route.query.sort as "asc" | "desc") || "desc")
const dateFrom = ref((route.query.dateFrom as string) || "")
const dateTo = ref((route.query.dateTo as string) || "")
const searchQuery = ref((route.query.search as string) || "")

const hasActiveFilters = computed(() => !!(filterAction.value || filterType.value || dateFrom.value || dateTo.value || searchQuery.value))

const actionOptions = [
  { label: "All actions", value: "" },
  { label: "Created", value: "created" },
  { label: "Updated", value: "updated" },
  { label: "Deleted", value: "deleted" },
]

const typeOptions = [
  { label: "All types", value: "" },
  { label: "Addon Profile", value: "profile" },
  { label: "WowUp String", value: "wowup" },
  { label: "Character Layout", value: "layout" },
  { label: "Changelog", value: "changelog" },
  { label: "Content", value: "content" },
]

// Group items by day with relative labels
const groupedEntries = computed<DayGroup[]>(() => {
  if (!items.value.length) return []

  const now = new Date()
  const todayKey = toDateKey(now)
  const yesterdayKey = toDateKey(new Date(now.getTime() - 86400000))

  const groups = new Map<string, Activity[]>()

  for (const item of items.value) {
    const date = typeof item.createdAt === "number" ? new Date((item.createdAt as unknown as number) * 1000) : new Date(item.createdAt)
    const key = toDateKey(date)
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(item)
  }

  const result: DayGroup[] = []
  for (const [key, groupItems] of groups) {
    let label: string
    if (key === todayKey) label = "Today"
    else if (key === yesterdayKey) label = "Yesterday"
    else {
      const [y, m, d] = key.split("-")
      const date = new Date(Number(y), Number(m) - 1, Number(d))
      label = date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })
    }
    result.push({ label, dateKey: key, items: groupItems })
  }

  return result
})

function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
}

function clearFilters() {
  filterAction.value = ""
  filterType.value = ""
  dateFrom.value = ""
  dateTo.value = ""
  searchQuery.value = ""
}

function toggleSort() {
  sortOrder.value = sortOrder.value === "desc" ? "asc" : "desc"
}

function toggleDetail(id: number) {
  expandedId.value = expandedId.value === id ? null : id
}

// Parse details JSON into key-value object, return null if not a flat object
function parsedDetails(details: string | null): Record<string, unknown> | null {
  if (!details) return null
  try {
    const parsed = JSON.parse(details)
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed as Record<string, unknown>
    return null
  } catch {
    return null
  }
}

function formatDetailsRaw(details: string | null): string {
  if (!details) return ""
  try {
    return JSON.stringify(JSON.parse(details), null, 2)
  } catch {
    return details
  }
}

function humanizeKey(key: string): string {
  return key
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return "-"
  if (typeof value === "boolean") return value ? "Yes" : "No"
  if (typeof value === "object") return JSON.stringify(value)
  return String(value)
}

const paginationRange = computed(() => {
  const totalPagesValue = totalPages.value
  const current = page.value
  if (totalPagesValue <= 5) return Array.from({ length: totalPagesValue }, (_, index) => index + 1)
  const range: Array<number | string> = [1]
  if (current > 3) range.push("...")
  for (let index = Math.max(2, current - 1); index <= Math.min(totalPagesValue - 1, current + 1); index += 1) range.push(index)
  if (current < totalPagesValue - 2) range.push("...")
  range.push(totalPagesValue)
  return range
})

function syncQueryParams() {
  const query: Record<string, string> = {}
  if (filterAction.value) query.action = filterAction.value
  if (filterType.value) query.type = filterType.value
  if (page.value > 1) query.page = String(page.value)
  if (sortOrder.value !== "desc") query.sort = sortOrder.value
  if (dateFrom.value) query.dateFrom = dateFrom.value
  if (dateTo.value) query.dateTo = dateTo.value
  if (searchQuery.value) query.search = searchQuery.value
  router.replace({ query })
}

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
  window.scrollTo({ top: 0, behavior: "smooth" })
  load()
})

async function load() {
  loading.value = true

  try {
    const params = new URLSearchParams({ page: String(page.value), limit: "25", sort: sortOrder.value })
    if (filterAction.value) params.set("action", filterAction.value)
    if (filterType.value) params.set("type", filterType.value)
    if (dateFrom.value) params.set("dateFrom", dateFrom.value)
    if (dateTo.value) params.set("dateTo", dateTo.value)
    if (searchQuery.value) params.set("search", searchQuery.value)

    const response = await apiFetch<any>(`/api/v1/admin/activity?${params}`)
    items.value = response?.items || []
    total.value = response?.total || 0
    totalPages.value = response?.totalPages || 1
  } catch {
    items.value = []
  } finally {
    loading.value = false
  }
}

async function loadQuickStats() {
  try {
    const response = await apiFetch<any>("/api/v1/admin/activity/stats")
    if (response) quickStats.value = response
  } catch {
    quickStats.value = null
  }
}

// timeAgo, actionIcon, entityTypeLabel, activityTone
// are auto-imported from utils/adminHelpers.ts
const typeLabel = entityTypeLabel
const actionTone = activityTone

function actionBadgeColor(action: string) {
  if (action === "created") return "success"
  if (action === "updated") return "info"
  if (action === "deleted") return "error"
  return "neutral"
}

function dotColor(action: string) {
  if (action === "created") return "bg-emerald-500"
  if (action === "updated") return "bg-blue-500"
  if (action === "deleted") return "bg-red-500"
  return "bg-slate-400"
}

function formatTime(value: string | number) {
  if (!value) return "-"
  const date = typeof value === "number" ? new Date(value * 1000) : new Date(value)
  return date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
}

onMounted(() => {
  load()
  loadQuickStats()
})
</script>

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
      description="Filter by action, type and date range. Open an entry for the raw payload."
      icon="i-heroicons-clipboard-document-list"
    >
      <div class="admin-filterbar">
        <UInput v-model="searchQuery" placeholder="Search by name..." icon="i-heroicons-magnifying-glass" class="w-full sm:max-w-xs" />
        <USelect v-model="filterAction" :items="actionOptions" value-key="value" placeholder="All actions" class="w-full sm:w-40" />
        <USelect v-model="filterType" :items="typeOptions" value-key="value" placeholder="All types" class="w-full sm:w-44" />
        <UInput v-model="dateFrom" type="date" class="w-full sm:w-40" />
        <UInput v-model="dateTo" type="date" class="w-full sm:w-40" />

        <div class="flex items-center gap-2 sm:ml-auto">
          <UButton
            :icon="sortOrder === 'desc' ? 'i-heroicons-bars-arrow-down' : 'i-heroicons-bars-arrow-up'"
            variant="ghost"
            color="neutral"
            size="sm"
            @click="toggleSort"
          >
            {{ sortOrder === "desc" ? "Newest" : "Oldest" }}
          </UButton>

          <UButton v-if="hasActiveFilters" variant="ghost" color="neutral" size="sm" icon="i-heroicons-x-mark" @click="clearFilters">
            Clear
          </UButton>
        </div>
      </div>

      <div v-if="loading && !items.length" class="py-12 text-center">
        <UIcon name="i-heroicons-arrow-path" class="mx-auto h-8 w-8 animate-spin text-blue-500" />
      </div>

      <div v-else-if="items.length" class="admin-list mt-5" :class="loading ? 'opacity-60' : ''">
        <div v-for="item in items" :key="item.id" class="admin-row">
          <div class="flex min-w-0 flex-1 items-start gap-4">
            <div class="admin-empty-state__icon h-10 w-10" :class="actionTone(item.action)">
              <UIcon :name="actionIcon(item.action)" class="h-4 w-4" />
            </div>

            <div class="admin-row__content">
              <div class="flex flex-wrap items-center gap-2">
                <p class="admin-row__title">
                  {{ item.entityName }}
                </p>
                <UBadge :color="actionBadgeColor(item.action)" variant="subtle" size="xs">{{ item.action }}</UBadge>
              </div>

              <p class="admin-row__meta">
                {{ typeLabel(item.entityType) }}
                <span v-if="item.entityId"> · ID {{ item.entityId }}</span>
                · {{ timeAgo(item.createdAt) }}
                · {{ formatDate(item.createdAt) }}
              </p>

              <div v-if="item.details" class="mt-3">
                <UButton
                  size="xs"
                  color="neutral"
                  variant="ghost"
                  :icon="expandedId === item.id ? 'i-heroicons-chevron-up' : 'i-heroicons-chevron-down'"
                  @click="toggleDetail(item.id)"
                >
                  {{ expandedId === item.id ? "Hide details" : "Show details" }}
                </UButton>

                <pre v-if="expandedId === item.id" class="admin-code-block mt-3 whitespace-pre-wrap break-words">{{ formatDetails(item.details) }}</pre>
              </div>
            </div>
          </div>
        </div>
      </div>

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

function formatDetails(details: string | null): string {
  if (!details) return ""
  try {
    return JSON.stringify(JSON.parse(details), null, 2)
  } catch {
    return details
  }
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

function typeLabel(type: string) {
  const labels: Record<string, string> = {
    profile: "Addon Profile",
    wowup: "WowUp String",
    layout: "Character Layout",
    changelog: "Changelog",
    content: "Content",
  }
  return labels[type] || type
}

function actionIcon(action: string) {
  if (action === "created") return "i-heroicons-plus-circle"
  if (action === "updated") return "i-heroicons-pencil-square"
  if (action === "deleted") return "i-heroicons-trash"
  return "i-heroicons-information-circle"
}

function actionTone(action: string) {
  if (action === "created") return "admin-tone-success"
  if (action === "updated") return "admin-tone-brand"
  if (action === "deleted") return "admin-tone-danger"
  return "admin-tone-neutral"
}

function actionBadgeColor(action: string) {
  if (action === "created") return "success"
  if (action === "updated") return "info"
  if (action === "deleted") return "error"
  return "neutral"
}

function timeAgo(value: string | number | null) {
  if (!value) return ""
  const date = typeof value === "number" ? new Date(value * 1000) : new Date(value)
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
  if (seconds < 60) return "just now"
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  return `${Math.floor(days / 30)}mo ago`
}

function formatDate(value: string | number) {
  if (!value) return "-"
  const date = typeof value === "number" ? new Date(value * 1000) : new Date(value)
  return date.toLocaleDateString("en-US", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })
}

onMounted(() => {
  load()
  loadQuickStats()
})
</script>

<template>
  <div class="space-y-5">
    <AdminPageHeader
      icon="i-simple-icons-github"
      eyebrow="System"
      title="GitHub Sync"
      description="Keep repo connectivity, release checks and import/export workflows in one quiet utility page."
    >
      <template #meta>
        <span v-if="status?.lastCheck" class="admin-pill">Last check {{ formatDate(status.lastCheck) }}</span>
      </template>

      <template #actions>
        <UButton icon="i-heroicons-arrow-path" variant="ghost" color="neutral" :loading="statusLoading" @click="loadStatus">
          Refresh
        </UButton>
      </template>
    </AdminPageHeader>

    <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <AdminMetricCard
        v-for="metric in metrics"
        :key="metric.label"
        :label="metric.label"
        :value="metric.value"
        :icon="metric.icon"
        :tone="metric.tone"
        :hint="metric.hint"
      />
    </div>

    <div class="grid gap-5 xl:grid-cols-2">
      <AdminPanel title="Connection" description="Repository status, permissions and webhook endpoint." icon="i-simple-icons-github">
        <template #actions>
          <UButton
            size="sm"
            variant="ghost"
            color="neutral"
            icon="i-heroicons-signal"
            :loading="testing"
            :disabled="!status?.configured"
            @click="testConnection"
          >
            Test
          </UButton>
        </template>

        <div class="space-y-4">
          <div class="admin-subpanel">
            <div class="flex items-center justify-between gap-3">
              <div>
                <p class="admin-row__eyebrow">Repository</p>
                <p class="mt-2 text-sm font-semibold text-slate-950 dark:text-white">{{ status?.repo || "Not configured" }}</p>
              </div>
              <UBadge :color="status?.configured ? 'success' : 'error'" variant="subtle">
                {{ status?.configured ? "Connected" : "Offline" }}
              </UBadge>
            </div>
          </div>

          <!-- Webhook row (compact, inline) -->
          <div
            class="flex items-center gap-3 rounded-lg border px-3.5 py-2.5"
            :class="isDark ? 'border-[hsl(240,3.7%,22%)] bg-[hsl(222.34,10.43%,12.27%)]' : 'border-slate-200 bg-white'"
          >
            <UIcon name="i-heroicons-link" class="h-4 w-4 shrink-0 text-slate-400" />
            <code class="min-w-0 flex-1 truncate text-xs text-slate-600 dark:text-slate-400">{{ webhookVisible ? webhookUrl : maskedWebhook }}</code>
            <div class="flex shrink-0 items-center gap-1">
              <UButton
                size="xs"
                variant="ghost"
                color="neutral"
                :icon="webhookVisible ? 'i-heroicons-eye-slash' : 'i-heroicons-eye'"
                @click="webhookVisible = !webhookVisible"
              />
              <UButton
                size="xs"
                variant="ghost"
                color="neutral"
                :icon="webhookCopied ? 'i-heroicons-check' : 'i-heroicons-clipboard-document'"
                @click="copyWebhookUrl"
              >
                {{ webhookCopied ? "Copied" : "Copy" }}
              </UButton>
            </div>
          </div>

          <div v-if="testResult" class="admin-subpanel space-y-3">
            <div class="flex items-center gap-2">
              <UBadge :color="testResult.success ? 'success' : 'error'" variant="subtle" size="xs">
                {{ testResult.success ? "Success" : "Failed" }}
              </UBadge>
              <span class="text-sm text-slate-600 dark:text-slate-400">
                {{ testResult.success ? "Connection succeeded." : testResult.error }}
              </span>
            </div>

            <template v-if="testResult.success && testResult.data">
              <div class="grid gap-3 md:grid-cols-2">
                <div class="admin-subpanel">
                  <p class="admin-row__eyebrow">Repo</p>
                  <p class="mt-2 text-sm font-semibold text-slate-950 dark:text-white">{{ testResult.data.repo }}</p>
                </div>

                <div class="admin-subpanel">
                  <p class="admin-row__eyebrow">Rate Limit</p>
                  <p class="mt-2 text-sm font-semibold text-slate-950 dark:text-white">
                    {{ testResult.data.rateLimit?.remaining || 0 }} / {{ testResult.data.rateLimit?.limit || 0 }}
                  </p>
                </div>
              </div>

              <div class="admin-inline-note">
                <UIcon name="i-heroicons-information-circle" class="h-4 w-4 text-blue-500" />
                <span class="text-sm text-slate-600 dark:text-slate-400">
                  Push {{ testResult.data.permissions?.push ? "enabled" : "disabled" }},
                  Admin {{ testResult.data.permissions?.admin ? "enabled" : "disabled" }},
                  Webhook secret {{ testResult.data.webhookSecretConfigured ? "configured" : "missing" }}.
                </span>
              </div>
            </template>
          </div>
        </div>
      </AdminPanel>

      <AdminPanel title="Version" description="Stored local and GitHub release information." icon="i-heroicons-tag">
        <template #actions>
          <UButton
            size="sm"
            variant="ghost"
            color="neutral"
            icon="i-heroicons-arrow-down-tray"
            :loading="checking"
            :disabled="!status?.configured"
            @click="doVersionCheck"
          >
            Check
          </UButton>
        </template>

        <div class="grid gap-4 md:grid-cols-2">
          <div class="admin-subpanel">
            <p class="admin-row__eyebrow">Local</p>
            <p class="mt-2 text-lg font-semibold tracking-tight text-slate-950 dark:text-white">
              {{ versionInfo.local ? `v${versionInfo.local}` : "-" }}
            </p>
          </div>

          <div class="admin-subpanel">
            <p class="admin-row__eyebrow">GitHub</p>
            <p class="mt-2 text-lg font-semibold tracking-tight text-slate-950 dark:text-white">
              {{ versionInfo.github ? `v${versionInfo.github}` : "-" }}
            </p>
          </div>
        </div>

        <div class="mt-4 admin-inline-note">
          <UIcon
            :name="versionInfo.isUpToDate ? 'i-heroicons-check-circle' : 'i-heroicons-exclamation-circle'"
            class="h-4 w-4"
            :class="versionInfo.isUpToDate ? 'text-emerald-500' : 'text-amber-500'"
          />
          <span class="text-sm text-slate-600 dark:text-slate-400">
            {{ versionInfo.github ? (versionInfo.isUpToDate ? "Local version is up to date." : "A newer GitHub release is available.") : "No version information yet." }}
          </span>
        </div>

        <div v-if="versionCheckDetails?.releaseName" class="mt-4 admin-subpanel">
          <p class="admin-row__eyebrow">Latest release</p>
          <p class="mt-2 text-sm font-semibold text-slate-950 dark:text-white">{{ versionCheckDetails.releaseName }}</p>
          <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">{{ formatDate(versionCheckDetails.publishedAt) }}</p>
        </div>
      </AdminPanel>
    </div>

    <AdminPanel title="Actions" description="Manual sync utilities for import, export and remote triggers." icon="i-heroicons-bolt">
      <div class="grid gap-3 md:grid-cols-2">
        <button
          class="admin-subpanel text-left transition hover:border-blue-500/25 hover:bg-white/70 dark:hover:bg-white/5"
          :disabled="pushing || !status?.configured"
          @click="doPush"
        >
          <div class="flex items-center gap-2.5">
            <div class="admin-empty-state__icon admin-tone-brand h-8 w-8">
              <UIcon name="i-heroicons-arrow-up-tray" class="h-3.5 w-3.5" />
            </div>
            <div>
              <p class="admin-row__title text-[13px]">{{ pushing ? "Pushing..." : "Push Trigger" }}</p>
              <p class="admin-row__meta text-xs">Trigger the remote GitHub sync workflow.</p>
            </div>
          </div>
        </button>

        <button
          class="admin-subpanel text-left transition hover:border-blue-500/25 hover:bg-white/70 dark:hover:bg-white/5"
          :disabled="pullingProfiles || !status?.configured"
          @click="doPullProfiles"
        >
          <div class="flex items-center gap-2.5">
            <div class="admin-empty-state__icon admin-tone-violet h-8 w-8">
              <UIcon name="i-heroicons-arrow-down-tray" class="h-3.5 w-3.5" />
            </div>
            <div>
              <p class="admin-row__title text-[13px]">{{ pullingProfiles ? "Pulling..." : "Pull Profiles" }}</p>
              <p class="admin-row__meta text-xs">Import profile data from the repository.</p>
            </div>
          </div>
        </button>

        <button
          class="admin-subpanel text-left transition hover:border-blue-500/25 hover:bg-white/70 dark:hover:bg-white/5"
          @click="doExport"
        >
          <div class="flex items-center gap-2.5">
            <div class="admin-empty-state__icon admin-tone-success h-8 w-8">
              <UIcon name="i-heroicons-arrow-down-on-square" class="h-3.5 w-3.5" />
            </div>
            <div>
              <p class="admin-row__title text-[13px]">Export Backup</p>
              <p class="admin-row__meta text-xs">Download the current admin data as JSON.</p>
            </div>
          </div>
        </button>

        <button
          class="admin-subpanel text-left transition hover:border-blue-500/25 hover:bg-white/70 dark:hover:bg-white/5"
          @click="importModal = true"
        >
          <div class="flex items-center gap-2.5">
            <div class="admin-empty-state__icon admin-tone-warning h-8 w-8">
              <UIcon name="i-heroicons-arrow-up-on-square" class="h-3.5 w-3.5" />
            </div>
            <div>
              <p class="admin-row__title text-[13px]">Import Backup</p>
              <p class="admin-row__meta text-xs">Restore a JSON export using merge or overwrite.</p>
            </div>
          </div>
        </button>
      </div>
    </AdminPanel>

    <AdminPanel title="Sync History" description="Search and inspect recent sync jobs." icon="i-heroicons-clock">
      <div class="admin-filterbar gap-2 py-2">
        <div class="flex flex-wrap items-center gap-1.5">
          <button
            v-for="filter in syncFilters"
            :key="filter.value"
            class="admin-segmented__button"
            :class="syncFilter === filter.value ? 'admin-segmented__button--active' : ''"
            @click="syncFilter = filter.value"
          >
            {{ filter.label }}
            <span class="ml-1 text-[11px] opacity-70">{{ filter.count }}</span>
          </button>
        </div>

        <UInput
          v-model="syncSearch"
          size="sm"
          icon="i-heroicons-magnifying-glass"
          placeholder="Search trigger or details"
          class="min-w-0 flex-1"
        />
      </div>

      <div v-if="statusLoading && !status" class="py-12 text-center">
        <UIcon name="i-heroicons-arrow-path" class="mx-auto h-8 w-8 animate-spin text-blue-500" />
      </div>

      <div v-else-if="filteredSyncs.length" class="admin-table-shell mt-4">
        <table class="admin-table">
          <thead>
            <tr>
              <th class="w-[25%]">Trigger</th>
              <th class="w-[10%]">Status</th>
              <th class="w-[35%]">Details</th>
              <th class="w-[20%]">Time</th>
              <th class="w-[10%] text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            <template v-for="sync in filteredSyncs" :key="sync.id">
              <tr>
                <td class="font-medium text-slate-950 dark:text-white">{{ sync.trigger }}</td>
                <td>
                  <UBadge :color="syncBadgeColor(sync.status)" variant="subtle" size="xs">{{ sync.status }}</UBadge>
                </td>
                <td class="max-w-0">
                  <span class="block truncate text-slate-500 dark:text-slate-400">{{ sync.details || "No details" }}</span>
                </td>
                <td class="text-xs text-slate-400 dark:text-slate-500">{{ formatDate(sync.createdAt) }}</td>
                <td class="text-right">
                  <UButton
                    size="xs"
                    color="neutral"
                    variant="ghost"
                    :icon="expandedSyncId === sync.id ? 'i-heroicons-chevron-up' : 'i-heroicons-chevron-down'"
                    @click="expandedSyncId = expandedSyncId === sync.id ? null : sync.id"
                  />
                </td>
              </tr>
              <tr v-if="expandedSyncId === sync.id">
                <td colspan="5" class="!pt-0 !pb-3">
                  <pre class="admin-code-block whitespace-pre-wrap break-words text-xs">{{ sync.details || "No details available." }}</pre>
                </td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>

      <AdminEmptyState
        v-else
        icon="i-heroicons-clock"
        title="No syncs found"
        :description="syncFilter || syncSearch ? 'No syncs match the current filter.' : 'Sync jobs will appear here once they run.'"
      >
        <template v-if="syncFilter || syncSearch" #actions>
          <UButton
            color="neutral"
            variant="ghost"
            icon="i-heroicons-x-mark"
            @click="syncFilter = ''; syncSearch = ''"
          >
            Clear filters
          </UButton>
        </template>
      </AdminEmptyState>

      <template v-if="(status?.syncTotalPages || 1) > 1" #footer>
        <div class="flex w-full items-center justify-between gap-3 text-sm text-slate-500 dark:text-slate-400">
          <span>Page {{ syncPage }} of {{ status?.syncTotalPages || 1 }}</span>
          <div class="flex items-center gap-1.5">
            <UButton size="xs" variant="ghost" color="neutral" icon="i-heroicons-chevron-left" :disabled="syncPage <= 1" @click="syncPage--" />
            <UButton size="xs" variant="ghost" color="neutral" icon="i-heroicons-chevron-right" :disabled="syncPage >= (status?.syncTotalPages || 1)" @click="syncPage++" />
          </div>
        </div>
      </template>
    </AdminPanel>

    <UModal v-model:open="importModal">
      <template #content>
        <div class="p-6">
          <h2 class="text-lg font-semibold text-slate-950 dark:text-white">Import Backup</h2>

          <div class="mt-6 space-y-4">
            <div class="admin-field">
              <label class="admin-field__label">JSON file</label>
              <input
                ref="fileInput"
                type="file"
                accept=".json"
                class="admin-file-input"
                @change="handleFile"
              >
            </div>

            <div class="admin-field">
              <label class="admin-field__label">Strategy</label>
              <USelect v-model="importStrategy" :items="importStrategyOptions" value-key="value" />
            </div>

            <UAlert v-if="importStrategy === 'overwrite'" color="error" variant="subtle" title="Overwrite deletes existing data before import." />
            <pre v-if="importPreview" class="admin-code-block whitespace-pre-wrap break-words">{{ importPreview }}</pre>
            <UAlert v-if="importError" color="error" variant="subtle" :title="importError" />
          </div>

          <div class="mt-6 flex justify-end gap-3 border-t border-slate-200 pt-4 dark:border-white/8">
            <UButton variant="ghost" color="neutral" :disabled="importing" @click="closeImportModal">Cancel</UButton>
            <UButton icon="i-heroicons-arrow-up-on-square" :loading="importing" :disabled="!importData" @click="doImport">
              Import
            </UButton>
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: "admin" })

const isDark = useIsDark()
const toast = useToast()
const { apiFetch } = useApi()

interface SyncEntry {
  id: number
  trigger: string
  status: string
  details: string | null
  createdAt: string | number
}

interface StatusData {
  configured: boolean
  repo: string
  totalSyncs: number
  latestVersion: string | null
  localVersion: string | null
  lastCheck: string | null
  syncPage: number
  syncTotalPages: number
  recentSyncs: SyncEntry[]
}

const status = ref<StatusData | null>(null)
const statusLoading = ref(false)
const testResult = ref<any>(null)
const testing = ref(false)
const checking = ref(false)
const versionCheckDetails = ref<any>(null)
const pushing = ref(false)
const pullingProfiles = ref(false)
const syncPage = ref(1)
const syncFilter = ref<"" | "success" | "error" | "info">("")
const syncSearch = ref("")
const expandedSyncId = ref<number | null>(null)

const versionInfo = computed(() => {
  const github = versionCheckDetails.value?.latestVersion || status.value?.latestVersion || null
  const local = versionCheckDetails.value?.localVersion || status.value?.localVersion || null
  return {
    github,
    local,
    isUpToDate: !!(local && github && local === github),
  }
})

const metrics = computed(() => [
  {
    label: "Connection",
    value: status.value?.configured ? "Connected" : "Offline",
    icon: "i-simple-icons-github",
    tone: status.value?.configured ? "success" as const : "danger" as const,
    hint: status.value?.repo || "Repository not configured",
  },
  {
    label: "Syncs",
    value: status.value?.totalSyncs || 0,
    icon: "i-heroicons-arrow-path",
    tone: "brand" as const,
    hint: "Total recorded sync jobs",
  },
  {
    label: "Local Version",
    value: versionInfo.value.local ? `v${versionInfo.value.local}` : "-",
    icon: "i-heroicons-tag",
    tone: "violet" as const,
    hint: "Stored local release version",
  },
  {
    label: "GitHub Version",
    value: versionInfo.value.github ? `v${versionInfo.value.github}` : "-",
    icon: "i-heroicons-arrow-down-tray",
    tone: versionInfo.value.github && !versionInfo.value.isUpToDate ? "warning" as const : "success" as const,
    hint: versionInfo.value.github ? (versionInfo.value.isUpToDate ? "Up to date" : "Update available") : "Run a version check",
  },
])

const syncStats = computed(() => {
  const syncs = status.value?.recentSyncs || []
  return {
    total: syncs.length,
    success: syncs.filter(sync => sync.status === "success").length,
    error: syncs.filter(sync => sync.status === "error").length,
    info: syncs.filter(sync => sync.status !== "success" && sync.status !== "error").length,
  }
})

const syncFilters = computed(() => [
  { label: "All", value: "" as const, count: syncStats.value.total },
  { label: "Success", value: "success" as const, count: syncStats.value.success },
  { label: "Error", value: "error" as const, count: syncStats.value.error },
  { label: "Info", value: "info" as const, count: syncStats.value.info },
])

const filteredSyncs = computed(() => {
  let syncs = status.value?.recentSyncs || []

  if (syncFilter.value === "success") syncs = syncs.filter(sync => sync.status === "success")
  else if (syncFilter.value === "error") syncs = syncs.filter(sync => sync.status === "error")
  else if (syncFilter.value === "info") syncs = syncs.filter(sync => sync.status !== "success" && sync.status !== "error")

  if (syncSearch.value.trim()) {
    const query = syncSearch.value.toLowerCase().trim()
    syncs = syncs.filter(sync =>
      sync.trigger.toLowerCase().includes(query) ||
      (sync.details && sync.details.toLowerCase().includes(query)),
    )
  }

  return syncs
})

function formatDate(value: string | number | null) {
  if (!value) return "-"
  const date = typeof value === "number" ? new Date(value * 1000) : new Date(value)
  if (Number.isNaN(date.getTime())) return "-"
  return date.toLocaleDateString("en-US", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function syncBadgeColor(statusValue: string) {
  if (statusValue === "success") return "success"
  if (statusValue === "error") return "error"
  if (statusValue === "partial") return "warning"
  return "info"
}

const webhookUrl = computed(() => {
  if (import.meta.client) return `${window.location.origin}/api/v1/webhooks/github`
  return "/api/v1/webhooks/github"
})

const maskedWebhook = computed(() => "*".repeat(webhookUrl.value.length))
const webhookCopied = ref(false)
const webhookVisible = ref(false)

async function copyWebhookUrl() {
  try {
    await navigator.clipboard.writeText(webhookUrl.value)
  } catch {
    const element = document.createElement("textarea")
    element.value = webhookUrl.value
    document.body.appendChild(element)
    element.select()
    document.execCommand("copy")
    document.body.removeChild(element)
  }

  webhookCopied.value = true
  setTimeout(() => { webhookCopied.value = false }, 2000)
}

async function loadStatus() {
  statusLoading.value = true
  try {
    status.value = await apiFetch(`/api/v1/admin/github/status?syncPage=${syncPage.value}&syncLimit=10`) as StatusData
  } catch (error: any) {
    toast.add({ title: error?.data?.message || "Status error", color: "error" })
  } finally {
    statusLoading.value = false
  }
}

watch(syncPage, () => {
  loadStatus()
})

onMounted(loadStatus)

async function testConnection() {
  testing.value = true
  testResult.value = null
  try {
    const response = await $fetch<any>("/api/v1/admin/github/test", {
      method: "POST",
      credentials: "include",
    })

    if (response?.success && response?.data) {
      testResult.value = { success: true, data: response.data }
    } else {
      testResult.value = { success: false, error: response?.error || "Unknown error" }
    }
  } catch (error: any) {
    testResult.value = { success: false, error: error?.data?.message || error?.message || "Connection failed" }
  } finally {
    testing.value = false
  }
}

async function doVersionCheck() {
  checking.value = true
  try {
    versionCheckDetails.value = await apiFetch("/api/v1/admin/version-check", { method: "POST" })
    toast.add({ title: "Version checked", color: "success" })
    await loadStatus()
  } catch (error: any) {
    toast.add({ title: error?.data?.message || "Version check failed", color: "error" })
  } finally {
    checking.value = false
  }
}

async function doPullProfiles() {
  pullingProfiles.value = true
  try {
    const response = await apiFetch<any>("/api/v1/admin/github/pull", { method: "POST" })
    const summary = response?.data?.summary || response?.summary
    if (summary) {
      toast.add({
        title: `Pull: ${summary.created || 0} created, ${summary.updated || 0} updated, ${summary.unchanged || 0} unchanged`,
        color: (summary.created || summary.updated) ? "success" : "info",
      })
    } else {
      toast.add({ title: "Pull complete", color: "success" })
    }
    await loadStatus()
  } catch (error: any) {
    toast.add({ title: error?.data?.message || "Pull error", color: "error" })
  } finally {
    pullingProfiles.value = false
  }
}

async function doPush() {
  pushing.value = true
  try {
    await apiFetch("/api/v1/admin/github/push", { method: "POST", body: { reason: "manual-push" } })
    toast.add({ title: "GitHub sync triggered", color: "success" })
    await loadStatus()
  } catch (error: any) {
    toast.add({ title: error?.data?.message || "Push error", color: "error" })
  } finally {
    pushing.value = false
  }
}

async function doExport() {
  try {
    const response = await $fetch("/api/v1/admin/github/export", {
      credentials: "include",
    })
    const blob = new Blob([JSON.stringify(response, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.download = `magguui-export-${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(anchor)
    anchor.click()
    document.body.removeChild(anchor)
    URL.revokeObjectURL(url)
    toast.add({ title: "Export downloaded", color: "success" })
  } catch (error: any) {
    toast.add({ title: error?.data?.message || "Export error", color: "error" })
  }
}

const importModal = ref(false)
const importData = ref<any>(null)
const importStrategy = ref("merge")
const importPreview = ref("")
const importError = ref("")
const importing = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)

const importStrategyOptions = [
  { label: "Merge (skip existing)", value: "merge" },
  { label: "Overwrite (replace all)", value: "overwrite" },
]

function handleFile(event: Event) {
  importError.value = ""
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) {
    importData.value = null
    importPreview.value = ""
    return
  }

  if (file.size > 10 * 1024 * 1024) {
    importError.value = "File too large (max 10MB)"
    importData.value = null
    importPreview.value = ""
    return
  }

  const reader = new FileReader()
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result as string)
      importData.value = data
      const profiles = Array.isArray(data.profiles) ? data.profiles.length : 0
      const wowup = Array.isArray(data.wowupStrings) ? data.wowupStrings.length : 0
      const layouts = Array.isArray(data.characterLayouts) ? data.characterLayouts.length : 0
      const changelogs = Array.isArray(data.changelogs) ? data.changelogs.length : 0
      const content = Array.isArray(data.siteContent) ? data.siteContent.length : 0
      const parts = []
      if (profiles) parts.push(`${profiles} profiles`)
      if (wowup) parts.push(`${wowup} wowup`)
      if (layouts) parts.push(`${layouts} layouts`)
      if (changelogs) parts.push(`${changelogs} changelogs`)
      if (content) parts.push(`${content} content rows`)
      importPreview.value = parts.join(", ") || "Valid import file"
    } catch {
      importError.value = "Invalid JSON file"
      importData.value = null
      importPreview.value = ""
    }
  }

  reader.onerror = () => {
    importError.value = "Could not read file"
  }

  reader.readAsText(file)
}

function closeImportModal() {
  importModal.value = false
  importData.value = null
  importPreview.value = ""
  importError.value = ""
  importStrategy.value = "merge"
  if (fileInput.value) fileInput.value.value = ""
}

async function doImport() {
  if (!importData.value) return
  importing.value = true
  importError.value = ""

  try {
    const response = await apiFetch<any>("/api/v1/admin/github/import", {
      method: "POST",
      body: { data: importData.value, strategy: importStrategy.value },
    })

    const imported = response?.imported || {}
    const parts = []
    if (imported.profiles) parts.push(`${imported.profiles} profiles`)
    if (imported.wowup) parts.push(`${imported.wowup} wowup`)
    if (imported.layouts) parts.push(`${imported.layouts} layouts`)
    if (imported.changelogs) parts.push(`${imported.changelogs} changelogs`)
    if (imported.content) parts.push(`${imported.content} content`)

    toast.add({
      title: parts.length ? `Import: ${parts.join(", ")} (${imported.skipped || 0} skipped)` : "No new data imported",
      color: parts.length ? "success" : "warning",
    })

    closeImportModal()
    await loadStatus()
  } catch (error: any) {
    importError.value = error?.data?.message || "Import error"
  } finally {
    importing.value = false
  }
}
</script>

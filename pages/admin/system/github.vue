<!--
  Admin — GitHub Sync
  Connection status + test, push/pull, export/import, webhook setup, sync history
-->

<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold text-gradient">GitHub Sync</h1>
      <UButton icon="i-heroicons-arrow-path" variant="subtle" size="sm" @click="loadStatus()" :loading="statusLoading">
        Refresh
      </UButton>
    </div>

    <!-- Connection + Version Row -->
    <div class="grid lg:grid-cols-2 gap-4 mb-6">

      <!-- Connection Card -->
      <div class="glass rounded-xl p-5">
        <div class="flex items-center gap-3 mb-4">
          <div class="w-10 h-10 rounded-lg flex items-center justify-center" :class="status?.configured ? 'bg-green-500/10' : 'bg-red-500/10'">
            <UIcon name="i-simple-icons-github" class="w-5 h-5" :class="status?.configured ? 'text-green-400' : 'text-red-400'" />
          </div>
          <div class="flex-1 min-w-0">
            <p class="font-semibold" :class="isDark ? 'text-white' : 'text-gray-900'">GitHub</p>
            <p class="text-xs truncate" :class="isDark ? 'text-silver-500' : 'text-gray-500'">{{ status?.repo || '—' }}</p>
          </div>
          <div class="flex items-center gap-2">
            <div class="w-2.5 h-2.5 rounded-full" :class="status?.configured ? 'bg-green-400' : 'bg-red-400'" />
            <span class="text-xs font-medium" :class="status?.configured ? 'text-green-400' : 'text-red-400'">
              {{ status?.configured ? 'Connected' : 'Not configured' }}
            </span>
          </div>
        </div>

        <!-- Test Connection Button -->
        <div class="flex items-center gap-3">
          <UButton size="xs" variant="subtle" icon="i-heroicons-signal" :loading="testing" @click="testConnection" :disabled="!status?.configured">
            Test Connection
          </UButton>
          <span v-if="testResult" class="text-xs" :class="testResult.success ? 'text-green-400' : 'text-red-400'">
            {{ testResult.success ? '✓ ' + testResult.data?.repo : '✗ ' + testResult.error }}
          </span>
        </div>

        <!-- Test Details -->
        <div v-if="testResult?.success && testResult.data" class="mt-3 rounded-lg p-3 text-xs space-y-1"
          :class="isDark ? 'bg-brand-900/50' : 'bg-gray-50'">
          <div class="flex justify-between">
            <span :class="isDark ? 'text-silver-500' : 'text-gray-500'">Repo</span>
            <span :class="isDark ? 'text-silver-300' : 'text-gray-700'">{{ testResult.data.repo }} {{ testResult.data.isPrivate ? '🔒' : '🌐' }}</span>
          </div>
          <div v-if="testResult.data.permissions" class="flex justify-between">
            <span :class="isDark ? 'text-silver-500' : 'text-gray-500'">Permissions</span>
            <span :class="isDark ? 'text-silver-300' : 'text-gray-700'">
              {{ testResult.data.permissions.push ? 'Push ✓' : 'Push ✗' }}
              {{ testResult.data.permissions.admin ? '· Admin ✓' : '' }}
            </span>
          </div>
          <div v-if="testResult.data.rateLimit" class="flex justify-between">
            <span :class="isDark ? 'text-silver-500' : 'text-gray-500'">Rate Limit</span>
            <span :class="isDark ? 'text-silver-300' : 'text-gray-700'">{{ testResult.data.rateLimit.remaining }} / {{ testResult.data.rateLimit.limit }}</span>
          </div>
          <div class="flex justify-between">
            <span :class="isDark ? 'text-silver-500' : 'text-gray-500'">Webhook Secret</span>
            <span :class="testResult.data.webhookSecretConfigured ? 'text-green-400' : 'text-amber-400'">
              {{ testResult.data.webhookSecretConfigured ? '✓ Configured' : '⚠ Not set' }}
            </span>
          </div>
        </div>

        <div class="mt-3 text-xs" :class="isDark ? 'text-silver-600' : 'text-gray-400'">
          {{ status?.totalSyncs || 0 }} total syncs
          <span v-if="status?.lastCheck"> · Last check: {{ formatDate(status.lastCheck) }}</span>
        </div>
      </div>

      <!-- Version Card — shows stored version automatically -->
      <div class="glass rounded-xl p-5">
        <div class="flex items-center justify-between mb-4">
          <p class="font-semibold" :class="isDark ? 'text-white' : 'text-gray-900'">Version</p>
          <UButton size="xs" variant="subtle" @click="doVersionCheck" :loading="checking" icon="i-heroicons-arrow-down-tray" :disabled="!status?.configured">
            Check
          </UButton>
        </div>
        <!-- Always show version info from status if available -->
        <div v-if="versionInfo.github" class="space-y-3">
          <div class="flex items-center gap-3">
            <div class="w-3 h-3 rounded-full" :class="versionInfo.isUpToDate ? 'bg-green-400' : 'bg-amber-400'" />
            <span class="text-sm" :class="isDark ? 'text-silver-300' : 'text-gray-600'">
              {{ versionInfo.isUpToDate ? 'Up to date' : 'Update available' }}
            </span>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div class="rounded-lg p-3" :class="isDark ? 'bg-brand-900/50' : 'bg-gray-50'">
              <p class="text-xs" :class="isDark ? 'text-silver-500' : 'text-gray-500'">Local</p>
              <p class="text-lg font-bold" :class="isDark ? 'text-white' : 'text-gray-900'">{{ versionInfo.local ? 'v' + versionInfo.local : '—' }}</p>
            </div>
            <div class="rounded-lg p-3" :class="isDark ? 'bg-brand-900/50' : 'bg-gray-50'">
              <p class="text-xs" :class="isDark ? 'text-silver-500' : 'text-gray-500'">GitHub</p>
              <p class="text-lg font-bold" :class="versionInfo.isUpToDate ? 'text-green-400' : 'text-amber-400'">v{{ versionInfo.github }}</p>
            </div>
          </div>
          <p v-if="versionCheckDetails?.releaseName" class="text-xs" :class="isDark ? 'text-silver-500' : 'text-gray-400'">
            {{ versionCheckDetails.releaseName }} · {{ formatDate(versionCheckDetails.publishedAt) }}
          </p>
        </div>
        <p v-else class="text-sm text-center py-4" :class="isDark ? 'text-silver-600' : 'text-gray-400'">
          No version info yet — click "Check"
        </p>
      </div>
    </div>

    <!-- Actions Row — 4 items -->
    <div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <button @click="doPush" :disabled="pushing || !status?.configured"
        class="glass rounded-xl p-5 text-left transition-all hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed group">
        <div class="flex items-center gap-3 mb-2">
          <div class="w-8 h-8 rounded-lg flex items-center justify-center bg-blue-500/10 group-hover:bg-blue-500/15 transition-colors">
            <UIcon name="i-heroicons-arrow-up-tray" class="w-4 h-4 text-blue-400" />
          </div>
          <span class="font-semibold text-sm" :class="isDark ? 'text-white' : 'text-gray-900'">
            {{ pushing ? 'Pushing...' : 'Push to GitHub' }}
          </span>
        </div>
        <p class="text-xs" :class="isDark ? 'text-silver-500' : 'text-gray-500'">Triggers GitHub Action to pull latest data</p>
      </button>

      <button @click="doPullProfiles" :disabled="pullingProfiles || !status?.configured"
        class="glass rounded-xl p-5 text-left transition-all hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed group">
        <div class="flex items-center gap-3 mb-2">
          <div class="w-8 h-8 rounded-lg flex items-center justify-center bg-purple-500/10 group-hover:bg-purple-500/15 transition-colors">
            <UIcon name="i-heroicons-arrow-down-tray" class="w-4 h-4 text-purple-400" />
          </div>
          <span class="font-semibold text-sm" :class="isDark ? 'text-white' : 'text-gray-900'">
            {{ pullingProfiles ? 'Pulling...' : 'Pull from GitHub' }}
          </span>
        </div>
        <p class="text-xs" :class="isDark ? 'text-silver-500' : 'text-gray-500'">Import Lua profiles from repo into DB</p>
      </button>

      <button @click="doExport"
        class="glass rounded-xl p-5 text-left transition-all hover:scale-[1.02] group">
        <div class="flex items-center gap-3 mb-2">
          <div class="w-8 h-8 rounded-lg flex items-center justify-center bg-green-500/10 group-hover:bg-green-500/15 transition-colors">
            <UIcon name="i-heroicons-arrow-down-on-square" class="w-4 h-4 text-green-400" />
          </div>
          <span class="font-semibold text-sm" :class="isDark ? 'text-white' : 'text-gray-900'">Export (Backup)</span>
        </div>
        <p class="text-xs" :class="isDark ? 'text-silver-500' : 'text-gray-500'">Download all data as JSON</p>
      </button>

      <button @click="importModal = true"
        class="glass rounded-xl p-5 text-left transition-all hover:scale-[1.02] group">
        <div class="flex items-center gap-3 mb-2">
          <div class="w-8 h-8 rounded-lg flex items-center justify-center bg-amber-500/10 group-hover:bg-amber-500/15 transition-colors">
            <UIcon name="i-heroicons-arrow-up-on-square" class="w-4 h-4 text-amber-400" />
          </div>
          <span class="font-semibold text-sm" :class="isDark ? 'text-white' : 'text-gray-900'">Import</span>
        </div>
        <p class="text-xs" :class="isDark ? 'text-silver-500' : 'text-gray-500'">Import JSON backup</p>
      </button>
    </div>

    <!-- Webhook Setup -->
    <div class="glass rounded-xl p-5 mb-6">
      <div class="flex items-center justify-between mb-3">
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 rounded-lg flex items-center justify-center bg-brand-400/10">
            <UIcon name="i-heroicons-link" class="w-4 h-4 text-brand-400" />
          </div>
          <div>
            <p class="font-semibold text-sm" :class="isDark ? 'text-white' : 'text-gray-900'">Webhook</p>
            <p class="text-xs" :class="isDark ? 'text-silver-600' : 'text-gray-400'">
              Automatic notifications for releases & pushes
            </p>
          </div>
        </div>
        <UButton size="xs" variant="ghost" @click="copyWebhookUrl" :icon="webhookCopied ? 'i-heroicons-check' : 'i-heroicons-clipboard-document'">
          {{ webhookCopied ? 'Copied!' : 'URL' }}
        </UButton>
      </div>
      <div class="flex items-center gap-2">
        <div class="flex-1 rounded-lg p-3 font-mono text-xs break-all" :class="isDark ? 'bg-brand-900/60 text-silver-400 border border-brand-400/10' : 'bg-gray-50 text-gray-600 border border-gray-200'">
          {{ webhookVisible ? webhookUrl : '••••••••••••••••••••••••••' }}
        </div>
        <UButton size="xs" variant="ghost" :icon="webhookVisible ? 'i-heroicons-eye-slash' : 'i-heroicons-eye'" @click="webhookVisible = !webhookVisible" />
      </div>
      <div class="mt-2 text-xs" :class="isDark ? 'text-silver-600' : 'text-gray-400'">
        <p>→ GitHub Repo → Settings → Webhooks → Add webhook</p>
        <p class="mt-0.5">Events: Releases, Pushes, Workflow runs. Optional: Set NUXT_GITHUB_WEBHOOK_SECRET.</p>
      </div>
    </div>

    <!-- Sync History (paginated, filterable, searchable) -->
    <div class="glass rounded-xl overflow-hidden admin-fade-in admin-stagger-5">
      <!-- Header with title + mini stats -->
      <div class="px-5 py-4 border-b" :class="isDark ? 'border-brand-400/10' : 'border-gray-100'">
        <div class="flex items-center justify-between mb-3">
          <p class="font-semibold text-sm" :class="isDark ? 'text-white' : 'text-gray-900'">Sync History</p>
          <span class="text-xs" :class="isDark ? 'text-silver-600' : 'text-gray-400'">
            Page {{ syncPage }} / {{ status?.syncTotalPages || 1 }}
          </span>
        </div>

        <!-- Mini Stats Row -->
        <div class="flex items-center gap-4 mb-3">
          <div class="flex items-center gap-1.5">
            <span class="text-xs font-medium" :class="isDark ? 'text-silver-400' : 'text-gray-500'">Total:</span>
            <span class="text-xs font-bold" :class="isDark ? 'text-white' : 'text-gray-900'">{{ syncStats.total }}</span>
          </div>
          <div class="flex items-center gap-1.5">
            <div class="w-2 h-2 rounded-full bg-green-400" />
            <span class="text-xs font-medium" :class="isDark ? 'text-silver-400' : 'text-gray-500'">Success:</span>
            <span class="text-xs font-bold text-green-400">{{ syncStats.success }}</span>
          </div>
          <div class="flex items-center gap-1.5">
            <div class="w-2 h-2 rounded-full bg-red-400" />
            <span class="text-xs font-medium" :class="isDark ? 'text-silver-400' : 'text-gray-500'">Error:</span>
            <span class="text-xs font-bold text-red-400">{{ syncStats.error }}</span>
          </div>
          <div class="flex items-center gap-1.5">
            <div class="w-2 h-2 rounded-full bg-blue-400" />
            <span class="text-xs font-medium" :class="isDark ? 'text-silver-400' : 'text-gray-500'">Info:</span>
            <span class="text-xs font-bold text-blue-400">{{ syncStats.info }}</span>
          </div>
        </div>

        <!-- Filter Buttons + Search -->
        <div class="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div class="flex items-center gap-1.5">
            <UButton size="xs"
              :variant="syncFilter === '' ? 'solid' : 'soft'"
              :color="syncFilter === '' ? 'primary' : 'neutral'"
              @click="syncFilter = ''">
              All ({{ syncStats.total }})
            </UButton>
            <UButton size="xs"
              :variant="syncFilter === 'success' ? 'solid' : 'soft'"
              :color="syncFilter === 'success' ? 'success' : 'neutral'"
              @click="syncFilter = 'success'">
              Success ({{ syncStats.success }})
            </UButton>
            <UButton size="xs"
              :variant="syncFilter === 'error' ? 'solid' : 'soft'"
              :color="syncFilter === 'error' ? 'error' : 'neutral'"
              @click="syncFilter = 'error'">
              Error ({{ syncStats.error }})
            </UButton>
            <UButton size="xs"
              :variant="syncFilter === 'info' ? 'solid' : 'soft'"
              :color="syncFilter === 'info' ? 'info' : 'neutral'"
              @click="syncFilter = 'info'">
              Info ({{ syncStats.info }})
            </UButton>
          </div>
          <div class="flex-1 w-full sm:w-auto sm:max-w-xs">
            <UInput v-model="syncSearch" size="xs" icon="i-heroicons-magnifying-glass" placeholder="Search trigger or details...">
              <template #trailing>
                <UButton v-if="syncSearch" size="2xs" variant="ghost" icon="i-heroicons-x-mark" color="neutral" @click="syncSearch = ''" />
              </template>
            </UInput>
          </div>
        </div>
      </div>

      <!-- Sync Rows -->
      <div v-if="filteredSyncs.length" class="divide-y" :class="isDark ? 'divide-brand-400/5' : 'divide-gray-50'">
        <div v-for="sync in filteredSyncs" :key="sync.id" class="group cursor-pointer transition-colors"
          :class="[
            isDark ? 'hover:bg-brand-400/5' : 'hover:bg-gray-50/50',
            expandedSyncId === sync.id ? (isDark ? 'bg-brand-400/5' : 'bg-gray-50/50') : ''
          ]"
          @click="expandedSyncId = expandedSyncId === sync.id ? null : sync.id">
          <!-- Main Row -->
          <div class="flex items-center gap-3 px-5 py-3">
            <UIcon
              :name="expandedSyncId === sync.id ? 'i-heroicons-chevron-down' : 'i-heroicons-chevron-right'"
              class="w-3.5 h-3.5 flex-shrink-0 transition-transform"
              :class="isDark ? 'text-silver-600' : 'text-gray-400'" />
            <div class="w-2 h-2 rounded-full flex-shrink-0" :class="syncDotColor(sync.status)" />
            <span class="text-xs font-medium w-32 flex-shrink-0 truncate" :class="isDark ? 'text-silver-300' : 'text-gray-700'">{{ sync.trigger }}</span>
            <span class="text-xs flex-1 truncate" :class="isDark ? 'text-silver-500' : 'text-gray-500'">{{ sync.details || '—' }}</span>
            <UBadge :color="syncBadgeColor(sync.status)" variant="subtle" size="xs">{{ sync.status }}</UBadge>
            <span class="text-xs flex-shrink-0 w-28 text-right" :class="isDark ? 'text-silver-600' : 'text-gray-400'">{{ formatDate(sync.createdAt) }}</span>
          </div>

          <!-- Expanded Details -->
          <div v-if="expandedSyncId === sync.id" class="px-5 pb-3 pt-0">
            <div class="ml-[22px] rounded-lg p-3 text-xs font-mono whitespace-pre-wrap break-all"
              :class="isDark ? 'bg-brand-900/50 text-silver-400 border border-brand-400/10' : 'bg-gray-50 text-gray-600 border border-gray-200'">
              <div class="flex items-center gap-2 mb-2">
                <span class="font-semibold" :class="isDark ? 'text-silver-300' : 'text-gray-700'">Trigger:</span>
                <span>{{ sync.trigger }}</span>
              </div>
              <div class="flex items-center gap-2 mb-2">
                <span class="font-semibold" :class="isDark ? 'text-silver-300' : 'text-gray-700'">Status:</span>
                <UBadge :color="syncBadgeColor(sync.status)" variant="subtle" size="xs">{{ sync.status }}</UBadge>
              </div>
              <div class="flex items-center gap-2 mb-2">
                <span class="font-semibold" :class="isDark ? 'text-silver-300' : 'text-gray-700'">Date:</span>
                <span>{{ formatDate(sync.createdAt) }}</span>
              </div>
              <div>
                <span class="font-semibold" :class="isDark ? 'text-silver-300' : 'text-gray-700'">Details:</span>
                <div class="mt-1">{{ sync.details || 'No details available' }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div v-else class="px-5 py-8 text-center">
        <p class="text-sm" :class="isDark ? 'text-silver-600' : 'text-gray-400'">
          <template v-if="syncFilter || syncSearch">No syncs match the current filter</template>
          <template v-else>No syncs yet</template>
        </p>
        <UButton v-if="syncFilter || syncSearch" size="xs" variant="ghost" class="mt-2" @click="syncFilter = ''; syncSearch = ''">
          Clear filters
        </UButton>
      </div>

      <!-- Pagination -->
      <div v-if="(status?.syncTotalPages || 1) > 1" class="flex items-center justify-center gap-2 px-5 py-3 border-t"
        :class="isDark ? 'border-brand-400/10' : 'border-gray-100'">
        <UButton size="xs" variant="ghost" icon="i-heroicons-chevron-left" :disabled="syncPage <= 1" @click="syncPage--; loadStatus()" />
        <span class="text-xs px-2" :class="isDark ? 'text-silver-400' : 'text-gray-500'">{{ syncPage }} / {{ status?.syncTotalPages || 1 }}</span>
        <UButton size="xs" variant="ghost" icon="i-heroicons-chevron-right" :disabled="syncPage >= (status?.syncTotalPages || 1)" @click="syncPage++; loadStatus()" />
      </div>
    </div>

    <!-- Import Modal -->
    <UModal v-model:open="importModal">
      <template #content>
        <div class="p-6">
          <h2 class="text-lg font-semibold mb-4" :class="isDark ? 'text-white' : 'text-gray-900'">Import</h2>

          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium mb-1.5" :class="isDark ? 'text-silver-300' : 'text-gray-700'">JSON File</label>
              <input ref="fileInput" type="file" accept=".json" @change="handleFile"
                class="block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:cursor-pointer"
                :class="isDark ? 'text-silver-400 file:bg-brand-400/10 file:text-brand-300' : 'text-gray-500 file:bg-blue-50 file:text-blue-700'" />
            </div>

            <div>
              <label class="block text-sm font-medium mb-1.5" :class="isDark ? 'text-silver-300' : 'text-gray-700'">Strategy</label>
              <USelect v-model="importStrategy" :items="importStrategyOptions" value-key="value" />
            </div>

            <UAlert v-if="importStrategy === 'overwrite'" color="error" variant="subtle"
              :title="'Warning: All existing data will be deleted!'" />

            <div v-if="importPreview" class="rounded-lg p-3 text-xs font-mono" :class="isDark ? 'bg-brand-900/50 text-silver-400' : 'bg-gray-50 text-gray-600'">
              {{ importPreview }}
            </div>

            <UAlert v-if="importError" color="error" variant="subtle" :title="importError" />
          </div>

          <div class="flex justify-end gap-3 mt-6 pt-4" :class="isDark ? 'border-t border-brand-400/10' : 'border-t border-gray-100'">
            <UButton variant="ghost" color="neutral" @click="closeImportModal" :disabled="importing">Cancel</UButton>
            <UButton @click="doImport" :loading="importing" :disabled="!importData" icon="i-heroicons-arrow-up-on-square">Import</UButton>
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
const { token } = useAuth()
const isDark = useIsDark()

// ─── Types ──────────────────────────────
interface SyncEntry { id: number; trigger: string; status: string; details: string | null; createdAt: string | number }
interface StatusData {
  configured: boolean; repo: string; totalSyncs: number
  latestVersion: string | null; localVersion: string | null; lastCheck: string | null
  syncPage: number; syncTotalPages: number
  recentSyncs: SyncEntry[]
}

// ─── State ──────────────────────────────
const status = ref<StatusData | null>(null)
const statusLoading = ref(false)
const testResult = ref<any>(null)
const testing = ref(false)
const checking = ref(false)
const versionCheckDetails = ref<any>(null)
const pushing = ref(false)
const pullingProfiles = ref(false)
const syncPage = ref(1)

// ─── Sync History State ─────────────────
const syncFilter = ref<'' | 'success' | 'error' | 'info'>('')
const syncSearch = ref('')
const expandedSyncId = ref<number | null>(null)

// ─── Computed: Sync Stats ───────────────
const syncStats = computed(() => {
  const syncs = status.value?.recentSyncs || []
  return {
    total: syncs.length,
    success: syncs.filter(s => s.status === 'success').length,
    error: syncs.filter(s => s.status === 'error').length,
    info: syncs.filter(s => s.status !== 'success' && s.status !== 'error').length,
  }
})

// ─── Computed: Filtered Syncs ───────────
const filteredSyncs = computed(() => {
  let syncs = status.value?.recentSyncs || []

  // Apply status filter
  if (syncFilter.value === 'success') {
    syncs = syncs.filter(s => s.status === 'success')
  } else if (syncFilter.value === 'error') {
    syncs = syncs.filter(s => s.status === 'error')
  } else if (syncFilter.value === 'info') {
    syncs = syncs.filter(s => s.status !== 'success' && s.status !== 'error')
  }

  // Apply search filter
  if (syncSearch.value.trim()) {
    const q = syncSearch.value.toLowerCase().trim()
    syncs = syncs.filter(s =>
      s.trigger.toLowerCase().includes(q) ||
      (s.details && s.details.toLowerCase().includes(q))
    )
  }

  return syncs
})

// ─── Computed: version info from status (auto-display) ───
const versionInfo = computed(() => {
  const github = versionCheckDetails.value?.latestVersion || status.value?.latestVersion || null
  const local = versionCheckDetails.value?.localVersion || status.value?.localVersion || null
  return {
    github,
    local,
    isUpToDate: !!(local && github && local === github),
  }
})

// ─── Helpers ────────────────────────────
function formatDate(d: string | number | null) {
  if (!d) return '—'
  const date = typeof d === 'number' ? new Date(d * 1000) : new Date(d)
  if (isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('en-US', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function syncDotColor(s: string) {
  if (s === 'success') return 'bg-green-400'
  if (s === 'error') return 'bg-red-400'
  if (s === 'partial') return 'bg-amber-400'
  return 'bg-blue-400'
}
function syncBadgeColor(s: string) {
  if (s === 'success') return 'success'
  if (s === 'error') return 'error'
  if (s === 'partial') return 'warning'
  return 'info'
}

// ─── Webhook ────────────────────────────
const webhookUrl = computed(() => {
  if (import.meta.client) return `${window.location.origin}/api/v1/webhooks/github`
  return '/api/v1/webhooks/github'
})
const webhookCopied = ref(false)
const webhookVisible = ref(false)
async function copyWebhookUrl() {
  try {
    await navigator.clipboard.writeText(webhookUrl.value)
    webhookCopied.value = true
    setTimeout(() => webhookCopied.value = false, 2000)
  } catch {
    const el = document.createElement('textarea')
    el.value = webhookUrl.value
    document.body.appendChild(el)
    el.select()
    document.execCommand('copy')
    document.body.removeChild(el)
    webhookCopied.value = true
    setTimeout(() => webhookCopied.value = false, 2000)
  }
}

// ─── Load Status (with pagination) ──────
async function loadStatus() {
  statusLoading.value = true
  try {
    const res = await apiFetch(`/api/v1/admin/github/status?syncPage=${syncPage.value}&syncLimit=10`)
    status.value = res as any
  } catch (e: any) { toast.add({ title: e?.data?.message || 'Status Error', color: 'error' }) }
  finally { statusLoading.value = false }
}
onMounted(loadStatus)

// ─── Test Connection ────────────────────
async function testConnection() {
  testing.value = true; testResult.value = null
  try {
    const res = await $fetch<any>('/api/v1/admin/github/test', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token.value}` },
    })
    if (res?.success && res?.data) {
      testResult.value = { success: true, data: res.data }
    } else {
      testResult.value = { success: false, error: res?.error || 'Unknown error' }
    }
  } catch (e: any) {
    testResult.value = { success: false, error: e?.data?.message || e?.message || 'Connection failed' }
  } finally { testing.value = false }
}

// ─── Version Check (separate from profile pull) ───
async function doVersionCheck() {
  checking.value = true
  try {
    const res = await apiFetch<any>('/api/v1/admin/version-check', { method: 'POST' })
    if (res) {
      versionCheckDetails.value = res
    }
    toast.add({ title: 'Version checked', color: 'success' })
    await loadStatus()
  } catch (e: any) {
    toast.add({ title: e?.data?.message || 'Version check failed', color: 'error' })
  } finally { checking.value = false }
}

// ─── Pull Profiles from GitHub → DB ────
async function doPullProfiles() {
  pullingProfiles.value = true
  try {
    const res = await apiFetch<any>('/api/v1/admin/github/pull', { method: 'POST' })
    const summary = res?.data?.summary || res?.summary
    if (summary) {
      toast.add({
        title: `Pull: ${summary.created || 0} created, ${summary.updated || 0} updated, ${summary.unchanged || 0} unchanged`,
        color: (summary.created || summary.updated) ? 'success' : 'info',
      })
    } else {
      toast.add({ title: 'Pull complete', color: 'success' })
    }
    await loadStatus()
  } catch (e: any) {
    toast.add({ title: e?.data?.message || 'Pull Error', color: 'error' })
  } finally { pullingProfiles.value = false }
}

// ─── Push (Trigger GitHub Action) ───────
async function doPush() {
  pushing.value = true
  try {
    await apiFetch('/api/v1/admin/github/push', { method: 'POST', body: { reason: 'manual-push' } })
    toast.add({ title: 'GitHub Sync triggered!', color: 'success' })
    await loadStatus()
  } catch (e: any) {
    toast.add({ title: e?.data?.message || 'Push Error', color: 'error' })
  } finally { pushing.value = false }
}

// ─── Export ─────────────────────────────
async function doExport() {
  try {
    const res = await $fetch('/api/v1/admin/github/export', {
      headers: { Authorization: `Bearer ${token.value}` },
    })
    const blob = new Blob([JSON.stringify(res, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `magguui-export-${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    toast.add({ title: 'Export downloaded', color: 'success' })
  } catch (e: any) {
    toast.add({ title: e?.data?.message || 'Export Error', color: 'error' })
  }
}

// ─── Import ─────────────────────────────
const importModal = ref(false)
const importData = ref<any>(null)
const importStrategy = ref('merge')
const importPreview = ref('')
const importError = ref('')
const importing = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)

const importStrategyOptions = computed(() => [
  { label: 'Merge (skip existing)', value: 'merge' },
  { label: 'Overwrite (replace all)', value: 'overwrite' },
])

function handleFile(e: Event) {
  importError.value = ''
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) { importData.value = null; importPreview.value = ''; return }
  if (file.size > 10 * 1024 * 1024) { importError.value = 'File too large (max 10MB)'; importData.value = null; importPreview.value = ''; return }
  const reader = new FileReader()
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result as string)
      importData.value = data
      const p = Array.isArray(data.profiles) ? data.profiles.length : 0
      const w = Array.isArray(data.wowupStrings) ? data.wowupStrings.length : 0
      const l = Array.isArray(data.characterLayouts) ? data.characterLayouts.length : 0
      const c = Array.isArray(data.changelogs) ? data.changelogs.length : 0
      const sc = Array.isArray(data.siteContent) ? data.siteContent.length : 0
      const parts = []
      if (p) parts.push(`${p} Profiles`); if (w) parts.push(`${w} WowUp`); if (l) parts.push(`${l} Layouts`)
      if (c) parts.push(`${c} Changelogs`); if (sc) parts.push(`${sc} Content`)
      importPreview.value = parts.join(', ') + (data.exportedAt ? ` — Export: ${data.exportedAt.slice(0, 10)}` : '')
      importError.value = ''
    } catch { importError.value = 'Invalid JSON file'; importData.value = null; importPreview.value = '' }
  }
  reader.onerror = () => { importError.value = 'Could not read file' }
  reader.readAsText(file)
}

function closeImportModal() {
  importModal.value = false; importData.value = null; importPreview.value = ''
  importError.value = ''; importStrategy.value = 'merge'
  if (fileInput.value) fileInput.value.value = ''
}

async function doImport() {
  if (!importData.value) return
  importing.value = true; importError.value = ''
  try {
    const res = await apiFetch<any>('/api/v1/admin/github/import', {
      method: 'POST', body: { data: importData.value, strategy: importStrategy.value },
    })
    const s = res?.imported || {}
    const parts = []
    if (s.profiles) parts.push(`${s.profiles} Profiles`); if (s.wowup) parts.push(`${s.wowup} WowUp`)
    if (s.layouts) parts.push(`${s.layouts} Layouts`); if (s.changelogs) parts.push(`${s.changelogs} Changelogs`)
    if (s.content) parts.push(`${s.content} Content`)
    const msg = parts.length ? `Import: ${parts.join(', ')} (${s.skipped || 0} skipped)` : 'No new data imported'
    toast.add({ title: msg, color: parts.length ? 'success' : 'warning' })
    closeImportModal()
    await loadStatus()
  } catch (e: any) { importError.value = e?.data?.message || 'Import Error' }
  finally { importing.value = false }
}
</script>

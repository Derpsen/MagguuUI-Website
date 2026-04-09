<template>
  <div class="space-y-6">
    <AdminPageHeader
      icon="i-heroicons-users"
      eyebrow="System"
      title="Users"
      description="Accounts, sessions and security controls without the old dashboard clutter."
    >
      <template #actions>
        <UButton icon="i-heroicons-plus" @click="createModal = true">New User</UButton>
      </template>
    </AdminPageHeader>

    <div class="admin-segmented w-fit">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        class="admin-segmented__button"
        :class="activeTab === tab.id ? 'admin-segmented__button--active' : ''"
        @click="activeTab = tab.id"
      >
        {{ tab.label }}
      </button>
    </div>

    <!-- KPI row -->
    <div v-if="loading && !userList.length" class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <div v-for="item in 4" :key="item" class="admin-metric-card">
        <div class="h-24 rounded-2xl skeleton bg-slate-200/70 dark:bg-slate-800/70" />
      </div>
    </div>

    <template v-else>
      <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <AdminMetricCard
          v-for="card in statCards"
          :key="card.label"
          :label="card.label"
          :value="card.value"
          :icon="card.icon"
          :tone="card.tone"
          :hint="card.hint"
        />
      </div>

      <!-- ─── Accounts Tab ─── -->
      <template v-if="activeTab === 'accounts'">
        <AdminPanel title="Accounts" description="Keep the account list direct and action-focused." icon="i-heroicons-users">
          <div v-if="userList.length" class="admin-list">
            <div v-for="user in userList" :key="user.id" class="admin-row">
              <div class="flex min-w-0 flex-1 items-start gap-4">
                <div class="flex h-10 w-10 items-center justify-center rounded-2xl text-sm font-semibold" :class="avatarStyle(user)">
                  {{ user.username.charAt(0).toUpperCase() }}
                </div>

                <div class="admin-row__content">
                  <div class="flex flex-wrap items-center gap-2">
                    <p class="admin-row__title">{{ user.username }}</p>
                    <UBadge v-if="user.id === currentUser?.id" color="info" variant="subtle" size="xs">You</UBadge>
                    <UBadge :color="user.role === 'admin' ? 'info' : 'neutral'" variant="subtle" size="xs">{{ user.role }}</UBadge>
                    <UBadge v-if="user.isLocked" color="error" variant="subtle" size="xs">Locked</UBadge>
                    <UBadge v-if="passkeyCountFor(user) > 0" color="success" variant="subtle" size="xs">
                      {{ passkeyCountFor(user) }} passkey{{ passkeyCountFor(user) > 1 ? "s" : "" }}
                    </UBadge>
                  </div>

                  <p class="admin-row__meta">
                    Created {{ formatDate(user.createdAt) }}
                    <span v-if="user.lastLogin"> · Last login {{ timeAgo(user.lastLogin) }}</span>
                    <span v-else> · Never logged in</span>
                  </p>
                </div>
              </div>

              <div class="admin-row__actions">
                <UButton v-if="user.isLocked" size="xs" variant="ghost" color="success" icon="i-heroicons-lock-open" @click="doUnlock(user)">
                  Unlock
                </UButton>
                <UButton v-if="user.id === currentUser?.id" size="xs" variant="ghost" color="neutral" icon="i-heroicons-key" @click="switchToPassword">
                  Password
                </UButton>
                <UButton v-if="user.id !== currentUser?.id" size="xs" variant="ghost" color="error" icon="i-heroicons-trash" @click="confirmDel(user)">
                  Delete
                </UButton>
              </div>
            </div>
          </div>

          <AdminEmptyState
            v-else
            icon="i-heroicons-users"
            title="No users yet"
            description="Create the first admin account to unlock the rest of this page."
          />
        </AdminPanel>

        <div class="grid gap-6 xl:grid-cols-2">
          <!-- Passkeys -->
          <AdminPanel title="My Passkeys" description="Passwordless sign-in stays optional and minimal." icon="i-heroicons-finger-print">
            <template #actions>
              <UButton
                v-if="passkeySupported"
                size="sm"
                variant="ghost"
                color="neutral"
                icon="i-heroicons-plus"
                :loading="registeringPasskey"
                @click="registerPasskey"
              >
                Add
              </UButton>
            </template>

            <div v-if="!passkeySupported" class="admin-inline-note">
              <UIcon name="i-heroicons-information-circle" class="h-4 w-4 text-blue-500" />
              <span class="text-sm text-slate-600 dark:text-slate-400">This browser does not support passkeys.</span>
            </div>

            <div v-else-if="passkeysLoading && !passkeysList.length" class="py-12 text-center">
              <UIcon name="i-heroicons-arrow-path" class="mx-auto h-6 w-6 animate-spin text-blue-500" />
            </div>

            <div v-else-if="passkeysList.length" class="admin-list">
              <div v-for="passkey in passkeysList" :key="passkey.id" class="admin-row">
                <div class="flex min-w-0 flex-1 items-start gap-4">
                  <div class="admin-empty-state__icon h-10 w-10">
                    <UIcon name="i-heroicons-finger-print" class="h-4 w-4" />
                  </div>

                  <div class="admin-row__content">
                    <div v-if="editingPasskey === passkey.id" class="flex max-w-sm items-center gap-2">
                      <UInput v-model="editPasskeyName" size="sm" class="flex-1" @keyup.enter="savePasskeyName(passkey)" />
                      <UButton size="xs" icon="i-heroicons-check" @click="savePasskeyName(passkey)">Save</UButton>
                    </div>

                    <template v-else>
                      <p class="admin-row__title">{{ passkey.deviceName }}</p>
                      <p class="admin-row__meta">
                        Created {{ formatDate(passkey.createdAt) }}
                        <span v-if="passkey.lastUsed"> · Last used {{ timeAgo(passkey.lastUsed) }}</span>
                        <span v-else> · Never used</span>
                      </p>
                    </template>
                  </div>
                </div>

                <div class="admin-row__actions">
                  <UButton
                    v-if="editingPasskey !== passkey.id"
                    size="xs"
                    variant="ghost"
                    color="neutral"
                    icon="i-heroicons-pencil-square"
                    @click="startEditPasskey(passkey)"
                  />
                  <UButton
                    v-else
                    size="xs"
                    variant="ghost"
                    color="neutral"
                    icon="i-heroicons-x-mark"
                    @click="cancelPasskeyEdit"
                  />
                  <UButton size="xs" variant="ghost" color="error" icon="i-heroicons-trash" @click="deletePasskeyConfirm(passkey)" />
                </div>
              </div>
            </div>

            <AdminEmptyState
              v-else
              icon="i-heroicons-finger-print"
              title="No passkeys registered"
              description="Add one for faster sign-in on trusted devices."
            />
          </AdminPanel>

          <!-- Change Password -->
          <AdminPanel title="Change Password" description="Keep the current account protected with a stronger password." icon="i-heroicons-key">
            <div class="admin-form-grid">
              <label class="admin-field">
                <span class="admin-field__label">Current Password</span>
                <UInput v-model="pwForm.current" :type="showCurrentPw ? 'text' : 'password'" :disabled="pwSaving">
                  <template #trailing>
                    <button type="button" tabindex="-1" class="text-slate-400 transition hover:text-slate-600 dark:hover:text-slate-200" @click="showCurrentPw = !showCurrentPw">
                      <UIcon :name="showCurrentPw ? 'i-heroicons-eye-slash' : 'i-heroicons-eye'" class="h-4 w-4" />
                    </button>
                  </template>
                </UInput>
              </label>

              <label class="admin-field">
                <span class="admin-field__label">New Password</span>
                <UInput v-model="pwForm.newPw" :type="showNewPw ? 'text' : 'password'" :disabled="pwSaving">
                  <template #trailing>
                    <button type="button" tabindex="-1" class="text-slate-400 transition hover:text-slate-600 dark:hover:text-slate-200" @click="showNewPw = !showNewPw">
                      <UIcon :name="showNewPw ? 'i-heroicons-eye-slash' : 'i-heroicons-eye'" class="h-4 w-4" />
                    </button>
                  </template>
                </UInput>
              </label>
            </div>

            <div class="mt-5 space-y-3">
              <div class="grid grid-cols-4 gap-1.5">
                <div v-for="i in 4" :key="i" class="h-1.5 rounded-full" :class="i <= pwStrength.score ? pwStrength.color : 'bg-slate-200 dark:bg-slate-800'" />
              </div>
              <p class="text-sm text-slate-600 dark:text-slate-400">
                {{ pwForm.newPw ? pwStrength.label : "Minimum 8 chars with uppercase, lowercase and a number." }}
              </p>
            </div>

            <template #footer>
              <div class="flex w-full items-center justify-between gap-3">
                <span class="text-sm text-slate-500 dark:text-slate-400">Applies to the current admin account only.</span>
                <UButton :loading="pwSaving" :disabled="!pwForm.current || !pwForm.newPw || !pwStrength.valid" @click="changePassword">
                  Change Password
                </UButton>
              </div>
            </template>
          </AdminPanel>
        </div>
      </template>

      <!-- ─── Sessions Tab ─── -->
      <template v-if="activeTab === 'sessions'">
        <AdminPanel title="Active Sessions" description="End stale sessions without turning this into a security dashboard." icon="i-heroicons-computer-desktop">
          <template #actions>
            <UButton
              v-if="activeSessions.length > 1"
              size="sm"
              variant="ghost"
              color="error"
              icon="i-heroicons-arrow-right-on-rectangle"
              @click="endAllOtherSessions"
            >
              End Others
            </UButton>
          </template>

          <div v-if="sessionsLoading && !activeSessions.length" class="py-12 text-center">
            <UIcon name="i-heroicons-arrow-path" class="mx-auto h-6 w-6 animate-spin text-blue-500" />
          </div>

          <template v-else-if="activeSessions.length">
            <div class="admin-table-shell">
              <table class="admin-table">
                <thead>
                  <tr>
                    <th>Device</th>
                    <th>Browser / OS</th>
                    <th>IP Address</th>
                    <th>Last Active</th>
                    <th>Created</th>
                    <th class="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="session in activeSessions" :key="session.id">
                    <td>
                      <div class="flex items-center gap-2">
                        <UIcon :name="deviceIcon(session.deviceType)" class="h-4 w-4 shrink-0" :class="session.isCurrent ? 'text-emerald-500' : 'text-slate-400 dark:text-slate-500'" />
                        <span class="text-sm">{{ deviceLabel(session.deviceType) }}</span>
                        <UBadge v-if="session.isCurrent" color="success" variant="subtle" size="xs">Current</UBadge>
                      </div>
                    </td>
                    <td class="text-sm text-slate-600 dark:text-slate-400">{{ session.browser || "Unknown" }} / {{ session.os || "Unknown" }}</td>
                    <td class="font-mono text-xs text-slate-500 dark:text-slate-400">{{ session.ipAddress || "-" }}</td>
                    <td class="text-sm text-slate-600 dark:text-slate-400">{{ timeAgo(session.lastActive) }}</td>
                    <td class="text-sm text-slate-600 dark:text-slate-400">{{ formatDate(session.createdAt) }}</td>
                    <td class="text-right">
                      <UButton
                        v-if="!session.isCurrent"
                        size="xs"
                        variant="ghost"
                        color="error"
                        icon="i-heroicons-x-mark"
                        @click="endSession(session.id)"
                      >
                        End
                      </UButton>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </template>

          <AdminEmptyState
            v-else
            icon="i-heroicons-computer-desktop"
            title="No active sessions"
            description="Only active signed-in devices show up here."
          />
        </AdminPanel>
      </template>

      <!-- ─── Login Attempts Tab ─── -->
      <template v-if="activeTab === 'attempts'">
        <AdminPanel title="Login History" description="Search recent attempts and keep suspicious activity obvious." icon="i-heroicons-shield-check">
          <div v-if="attemptStats" class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div v-for="item in miniStats" :key="item.label" class="admin-subpanel">
              <p class="admin-row__eyebrow">{{ item.label }}</p>
              <p class="mt-2 text-2xl font-semibold tracking-tight text-slate-950 dark:text-white">{{ item.value }}</p>
            </div>
          </div>

          <div class="admin-filterbar mt-5">
            <UInput v-model="attemptSearch" placeholder="Search by user or IP..." icon="i-heroicons-magnifying-glass" class="w-full sm:max-w-xs" />
            <USelect v-model="attemptFilter" :items="attemptFilterOptions" value-key="value" class="w-full sm:w-40" />
          </div>

          <div v-if="attemptsLoading && !loginAttemptsList.length" class="py-12 text-center">
            <UIcon name="i-heroicons-arrow-path" class="mx-auto h-6 w-6 animate-spin text-blue-500" />
          </div>

          <template v-else-if="paginatedAttempts.length">
            <div class="admin-table-shell mt-5">
              <table class="admin-table">
                <thead>
                  <tr>
                    <th>Status</th>
                    <th>Username</th>
                    <th>IP Address</th>
                    <th>Browser</th>
                    <th>Flags</th>
                    <th>Time</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="attempt in paginatedAttempts" :key="attempt.id">
                    <td>
                      <UBadge :color="attempt.success ? 'success' : 'error'" variant="subtle" size="xs">
                        {{ attempt.success ? "Success" : "Failed" }}
                      </UBadge>
                    </td>
                    <td class="text-sm font-medium text-slate-950 dark:text-white">{{ attempt.username }}</td>
                    <td class="font-mono text-xs text-slate-500 dark:text-slate-400">{{ attempt.ip_address || "-" }}</td>
                    <td class="text-sm text-slate-600 dark:text-slate-400">{{ attempt.browser || "Unknown" }}</td>
                    <td>
                      <UBadge v-if="attempt.is_flagged" color="warning" variant="subtle" size="xs">{{ flagLabel(attempt.flag_reason) }}</UBadge>
                      <span v-else class="text-sm text-slate-400 dark:text-slate-500">-</span>
                    </td>
                    <td class="text-sm text-slate-600 dark:text-slate-400">{{ timeAgo(attempt.created_at) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </template>

          <AdminEmptyState
            v-else
            icon="i-heroicons-shield-check"
            :title="attemptFilter || attemptSearch ? 'No matching attempts' : 'No login attempts yet'"
            :description="attemptFilter || attemptSearch ? 'Try a broader filter.' : 'Recent authentication attempts will appear here.'"
          />

          <template v-if="attemptTotalPages > 1" #footer>
            <div class="flex w-full items-center justify-between gap-3 text-sm text-slate-500 dark:text-slate-400">
              <span>Page {{ attemptPage }} of {{ attemptTotalPages }}</span>
              <div class="flex items-center gap-1.5">
                <UButton size="xs" variant="ghost" color="neutral" icon="i-heroicons-chevron-left" :disabled="attemptPage <= 1" @click="attemptPage--" />
                <UButton size="xs" variant="ghost" color="neutral" icon="i-heroicons-chevron-right" :disabled="attemptPage >= attemptTotalPages" @click="attemptPage++" />
              </div>
            </div>
          </template>
        </AdminPanel>
      </template>
    </template>

    <!-- ─── Modals ─── -->
    <UModal v-model:open="createModal">
      <template #content>
        <div class="p-6">
          <h2 class="text-lg font-semibold text-slate-950 dark:text-white">Create User</h2>
          <div class="admin-form-grid mt-6">
            <label class="admin-field">
              <span class="admin-field__label">Username</span>
              <UInput v-model="createForm.username" :disabled="creating" placeholder="admin" icon="i-heroicons-user" />
            </label>
            <label class="admin-field">
              <span class="admin-field__label">Password</span>
              <UInput v-model="createForm.password" type="password" :disabled="creating" icon="i-heroicons-key" />
            </label>
            <label class="admin-field">
              <span class="admin-field__label">Role</span>
              <USelect v-model="createForm.role" :items="roleOptions" value-key="value" :disabled="creating" />
            </label>
          </div>
          <UAlert v-if="createError" class="mt-5" color="error" variant="subtle" :title="createError" icon="i-heroicons-exclamation-circle" />
          <div class="mt-6 flex justify-end gap-3">
            <UButton variant="ghost" color="neutral" :disabled="creating" @click="createModal = false">Cancel</UButton>
            <UButton :loading="creating" icon="i-heroicons-plus" @click="doCreate">Create</UButton>
          </div>
        </div>
      </template>
    </UModal>

    <UModal v-model:open="delModal">
      <template #content>
        <div class="p-6">
          <h2 class="text-lg font-semibold text-slate-950 dark:text-white">Delete User?</h2>
          <p class="mt-3 text-sm text-slate-600 dark:text-slate-400">{{ delUser?.username }} will be removed permanently.</p>
          <div class="mt-6 flex justify-end gap-3">
            <UButton variant="ghost" color="neutral" :disabled="deleting" @click="delModal = false">Cancel</UButton>
            <UButton color="error" :loading="deleting" icon="i-heroicons-trash" @click="doDelete">Delete</UButton>
          </div>
        </div>
      </template>
    </UModal>

    <UModal v-model:open="revokeAllModal">
      <template #content>
        <div class="p-6">
          <h2 class="text-lg font-semibold text-slate-950 dark:text-white">End all other sessions?</h2>
          <p class="mt-3 text-sm text-slate-600 dark:text-slate-400">All other devices will be signed out.</p>
          <div class="mt-6 flex justify-end gap-3">
            <UButton variant="ghost" color="neutral" @click="revokeAllModal = false">Cancel</UButton>
            <UButton color="error" :loading="revokingAll" icon="i-heroicons-arrow-right-on-rectangle" @click="doRevokeAll">End All</UButton>
          </div>
        </div>
      </template>
    </UModal>

    <UModal v-model:open="deletePasskeyModal">
      <template #content>
        <div class="p-6">
          <h2 class="text-lg font-semibold text-slate-950 dark:text-white">Delete Passkey?</h2>
          <p class="mt-3 text-sm text-slate-600 dark:text-slate-400">{{ deletePasskeyTarget?.deviceName }} will be removed permanently.</p>
          <div class="mt-6 flex justify-end gap-3">
            <UButton variant="ghost" color="neutral" @click="deletePasskeyModal = false">Cancel</UButton>
            <UButton color="error" :loading="deletingPasskey" icon="i-heroicons-trash" @click="doDeletePasskey">Delete</UButton>
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: "admin" })

const toast = useToast()
const { apiFetch } = useApi()
const { user: currentUser } = useAuth()

// ─── Types ───
interface User { id: number; username: string; role: string; lastLogin: string | null; createdAt: string | number; isLocked?: boolean; lockedUntil?: string | null; passkeyCount?: number }
interface Session { id: number; browser: string; os: string; deviceType: string; ipAddress: string; lastActive: string | number; expiresAt: string | number; createdAt: string | number; isCurrent: boolean }
interface LoginAttempt { id: number; username: string; ip_address: string; browser: string; os: string; success: boolean; fail_reason: string | null; is_flagged: boolean; flag_reason: string | null; created_at: string | number }
interface Passkey { id: number; credentialId: string; deviceName: string; createdAt: string | number; lastUsed: string | number | null }

type TabId = "accounts" | "sessions" | "attempts"

// ─── Tabs ───
const tabs: { id: TabId; label: string }[] = [
  { id: "accounts", label: "Accounts" },
  { id: "sessions", label: "Sessions" },
  { id: "attempts", label: "Login Attempts" },
]
const activeTab = ref<TabId>("accounts")

// ─── Data ───
const userList = ref<User[]>([])
const activeSessions = ref<Session[]>([])
const loginAttemptsList = ref<LoginAttempt[]>([])
const passkeysList = ref<Passkey[]>([])
const attemptStats = ref<{ totalAttempts: number; failedAttempts: number; flaggedAttempts: number; recentFailed: number } | null>(null)

// ─── Loading ───
const loading = ref(true)
const sessionsLoading = ref(true)
const attemptsLoading = ref(true)
const passkeysLoading = ref(true)
const passkeySupported = ref(false)
const registeringPasskey = ref(false)

// ─── Attempts filter / pagination ───
const attemptSearch = ref("")
const attemptFilter = ref("all")
const attemptPage = ref(1)
const PAGE_SIZE = 8

// ─── Password form ───
const showCurrentPw = ref(false)
const showNewPw = ref(false)
const pwSaving = ref(false)
const pwForm = reactive({ current: "", newPw: "" })

// ─── Modal state ───
const createModal = ref(false)
const creating = ref(false)
const createError = ref("")
const createForm = reactive({ username: "", password: "", role: "admin" })
const delModal = ref(false)
const delUser = ref<User | null>(null)
const deleting = ref(false)
const revokeAllModal = ref(false)
const revokingAll = ref(false)
const editingPasskey = ref<number | null>(null)
const editPasskeyName = ref("")
const deletePasskeyModal = ref(false)
const deletePasskeyTarget = ref<Passkey | null>(null)
const deletingPasskey = ref(false)

// ─── Static options ───
const attemptFilterOptions = [
  { label: "All attempts", value: "all" },
  { label: "Success", value: "success" },
  { label: "Failed", value: "failed" },
]

const roleOptions = [
  { label: "Admin - Full access", value: "admin" },
  { label: "Editor - Content only", value: "editor" },
]

// ─── Computed ───
const statCards = computed(() => [
  { label: "Users", value: userList.value.length, icon: "i-heroicons-users", tone: "brand" as const, hint: "Configured admin accounts" },
  { label: "Sessions", value: activeSessions.value.length, icon: "i-heroicons-computer-desktop", tone: "success" as const, hint: "Current signed-in devices" },
  { label: "Passkeys", value: passkeysList.value.length, icon: "i-heroicons-finger-print", tone: "violet" as const, hint: "Registered for this account" },
  { label: "Failed 7d", value: attemptStats.value?.recentFailed ?? 0, icon: "i-heroicons-shield-exclamation", tone: (attemptStats.value?.recentFailed ?? 0) > 0 ? "warning" as const : "neutral" as const, hint: "Failed login attempts" },
])

const miniStats = computed(() => {
  if (!attemptStats.value) return []
  return [
    { label: "Total", value: attemptStats.value.totalAttempts },
    { label: "Failed", value: attemptStats.value.failedAttempts },
    { label: "Flagged", value: attemptStats.value.flaggedAttempts },
    { label: "7d failed", value: attemptStats.value.recentFailed },
  ]
})

const filteredAttempts = computed(() => {
  let attempts = loginAttemptsList.value
  if (attemptFilter.value === "success") attempts = attempts.filter((item) => item.success)
  if (attemptFilter.value === "failed") attempts = attempts.filter((item) => !item.success)
  if (attemptSearch.value) {
    const query = attemptSearch.value.toLowerCase()
    attempts = attempts.filter((item) => item.username.toLowerCase().includes(query) || (item.ip_address || "").toLowerCase().includes(query))
  }
  return attempts
})

const attemptTotalPages = computed(() => Math.max(1, Math.ceil(filteredAttempts.value.length / PAGE_SIZE)))
const paginatedAttempts = computed(() => filteredAttempts.value.slice((attemptPage.value - 1) * PAGE_SIZE, attemptPage.value * PAGE_SIZE))

const pwStrength = computed(() => {
  const password = pwForm.newPw
  const score = [password.length >= 8, /[A-Z]/.test(password), /[a-z]/.test(password), /[0-9]/.test(password)].filter(Boolean).length
  return {
    score,
    valid: score >= 4,
    label: ["Add a stronger password.", "Too weak.", "Still weak.", "Almost there.", "Strong password."][score],
    color: ["bg-slate-200 dark:bg-slate-800", "bg-rose-500", "bg-amber-500", "bg-emerald-500", "bg-green-500"][score],
  }
})

// ─── Watchers ───
watch([attemptFilter, attemptSearch], () => { attemptPage.value = 1 })

// ─── Helpers ───
function formatDate(value: string | number | null) {
  if (!value) return "-"
  const date = typeof value === "number" ? new Date(value * 1000) : new Date(value)
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "numeric" })
}

function timeAgo(value: string | number | null) {
  if (!value) return "-"
  const date = typeof value === "number" ? new Date(value * 1000) : new Date(value)
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
  if (seconds < 60) return "just now"
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

function deviceIcon(type: string | null) {
  if (type === "mobile") return "i-heroicons-device-phone-mobile"
  if (type === "tablet") return "i-heroicons-device-tablet"
  return "i-heroicons-computer-desktop"
}

function deviceLabel(type: string | null) {
  if (type === "mobile") return "Mobile"
  if (type === "tablet") return "Tablet"
  return "Desktop"
}

function flagLabel(reason: string | null) {
  if (reason === "brute_force") return "Brute force"
  if (reason === "new_ip") return "New IP"
  if (reason === "new_device") return "New device"
  return "Flagged"
}

function avatarStyle(user: User) {
  if (user.id === currentUser.value?.id) return "bg-blue-500/15 text-blue-600 dark:text-blue-300"
  const variants = [
    "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300",
    "bg-violet-500/15 text-violet-600 dark:text-violet-300",
    "bg-amber-500/15 text-amber-600 dark:text-amber-300",
    "bg-rose-500/15 text-rose-600 dark:text-rose-300",
  ]
  return variants[user.username.split('').reduce((acc, letter) => acc + letter.charCodeAt(0), 0) % variants.length]
}

function passkeyCountFor(user: User) {
  if (typeof user.passkeyCount === "number" && user.passkeyCount > 0) return user.passkeyCount
  if (user.id === currentUser.value?.id) return passkeysList.value.length
  return 0
}

// ─── Actions ───
function switchToPassword() { activeTab.value = "accounts" }
function startEditPasskey(passkey: Passkey) { editingPasskey.value = passkey.id; editPasskeyName.value = passkey.deviceName }
function cancelPasskeyEdit() { editingPasskey.value = null; editPasskeyName.value = "" }
function deletePasskeyConfirm(passkey: Passkey) { deletePasskeyTarget.value = passkey; deletePasskeyModal.value = true }
function endAllOtherSessions() { revokeAllModal.value = true }
function confirmDel(user: User) { delUser.value = user; delModal.value = true }

// ─── Data loading ───
async function loadUsers() {
  loading.value = true
  try {
    const response = await apiFetch<User[]>("/api/v1/admin/users")
    userList.value = (response || []).map((user) => ({ ...user, passkeyCount: user.passkeyCount ?? 0 }))
  } catch {
    userList.value = []
  } finally {
    loading.value = false
  }
}

async function loadSessions() {
  sessionsLoading.value = true
  try {
    activeSessions.value = await apiFetch<Session[]>("/api/v1/admin/sessions")
  } catch {
    activeSessions.value = []
  } finally {
    sessionsLoading.value = false
  }
}

async function loadAttempts() {
  attemptsLoading.value = true
  try {
    const response = await $fetch<any>("/api/v1/admin/sessions/login-attempts?limit=100", {
      credentials: "include",
    })
    loginAttemptsList.value = Array.isArray(response?.data) ? response.data : []
    attemptStats.value = response?.meta?.stats ?? null
  } catch {
    loginAttemptsList.value = []
    attemptStats.value = null
  } finally {
    attemptsLoading.value = false
  }
}

async function loadPasskeys() {
  passkeysLoading.value = true
  try {
    passkeysList.value = await apiFetch<Passkey[]>("/api/v1/admin/passkeys")
  } catch {
    passkeysList.value = []
  } finally {
    passkeysLoading.value = false
  }
}

// ─── Mutations ───
async function savePasskeyName(passkey: Passkey) {
  if (!editPasskeyName.value.trim()) return
  try {
    await apiFetch(`/api/v1/admin/passkeys/${passkey.id}`, { method: "PUT", body: { deviceName: editPasskeyName.value.trim() } })
    cancelPasskeyEdit()
    await loadPasskeys()
  } catch (error: any) {
    toast.add({ title: error?.data?.message || "Failed to rename passkey", color: "error" })
  }
}

async function doDeletePasskey() {
  if (!deletePasskeyTarget.value) return
  deletingPasskey.value = true
  try {
    await apiFetch(`/api/v1/admin/passkeys/${deletePasskeyTarget.value.id}`, { method: "DELETE" })
    toast.add({ title: "Passkey deleted", color: "success", icon: "i-heroicons-check-circle" })
    deletePasskeyModal.value = false
    deletePasskeyTarget.value = null
    await loadPasskeys()
  } catch (error: any) {
    toast.add({ title: error?.data?.message || "Failed to delete passkey", color: "error" })
  } finally {
    deletingPasskey.value = false
  }
}

async function registerPasskey() {
  registeringPasskey.value = true
  try {
    const options = await apiFetch<any>("/api/v1/auth/webauthn/register-options", { method: "POST" })
    const { startRegistration } = await import("@simplewebauthn/browser")
    const credential = await startRegistration({ optionsJSON: options })
    const deviceName = window.prompt('Name this passkey (for example "MacBook Pro")') || "Passkey"
    await apiFetch("/api/v1/auth/webauthn/register-verify", { method: "POST", body: { credential, deviceName } })
    toast.add({ title: "Passkey registered", color: "success", icon: "i-heroicons-finger-print" })
    await loadPasskeys()
  } catch (error: any) {
    if (error?.name === "NotAllowedError") toast.add({ title: "Passkey registration cancelled", color: "neutral" })
    else toast.add({ title: error?.data?.message || error?.message || "Failed to register passkey", color: "error" })
  } finally {
    registeringPasskey.value = false
  }
}

async function endSession(id: number) {
  try {
    await apiFetch(`/api/v1/admin/sessions/${id}`, { method: "DELETE" })
    toast.add({ title: "Session ended", color: "success", icon: "i-heroicons-check-circle" })
    await loadSessions()
  } catch (error: any) {
    toast.add({ title: error?.data?.message || "Failed to end session", color: "error" })
  }
}

async function doRevokeAll() {
  revokingAll.value = true
  try {
    const response = await apiFetch<{ revokedCount: number }>("/api/v1/admin/sessions/revoke-others", { method: "POST" })
    toast.add({ title: `${response?.revokedCount || 0} session(s) ended`, color: "success", icon: "i-heroicons-check-circle" })
    revokeAllModal.value = false
    await loadSessions()
  } catch (error: any) {
    toast.add({ title: error?.data?.message || "Failed to end sessions", color: "error" })
  } finally {
    revokingAll.value = false
  }
}

async function doUnlock(user: User) {
  try {
    await apiFetch(`/api/v1/admin/users/${user.id}/unlock`, { method: "POST" })
    toast.add({ title: `${user.username} unlocked`, color: "success", icon: "i-heroicons-lock-open" })
    await loadUsers()
  } catch (error: any) {
    toast.add({ title: error?.data?.message || "Failed to unlock user", color: "error" })
  }
}

async function doCreate() {
  createError.value = ""
  if (!createForm.username || !createForm.password) {
    createError.value = "Username and password are required."
    return
  }
  creating.value = true
  try {
    await apiFetch("/api/v1/admin/users", { method: "POST", body: createForm })
    toast.add({ title: "User created", color: "success", icon: "i-heroicons-check-circle" })
    createModal.value = false
    Object.assign(createForm, { username: "", password: "", role: "admin" })
    await loadUsers()
  } catch (error: any) {
    createError.value = error?.data?.message || "Failed to create user"
  } finally {
    creating.value = false
  }
}

async function doDelete() {
  if (!delUser.value) return
  deleting.value = true
  try {
    await apiFetch(`/api/v1/admin/users/${delUser.value.id}`, { method: "DELETE" })
    toast.add({ title: "User deleted", color: "success", icon: "i-heroicons-check-circle" })
    delModal.value = false
    delUser.value = null
    await loadUsers()
  } catch (error: any) {
    toast.add({ title: error?.data?.message || "Failed to delete user", color: "error" })
  } finally {
    deleting.value = false
  }
}

async function changePassword() {
  if (!pwForm.current || !pwForm.newPw || !pwStrength.value.valid) return
  pwSaving.value = true
  try {
    await apiFetch("/api/v1/admin/password", { method: "PUT", body: { currentPassword: pwForm.current, newPassword: pwForm.newPw } })
    toast.add({ title: "Password changed", color: "success", icon: "i-heroicons-check-circle" })
    pwForm.current = ""
    pwForm.newPw = ""
  } catch (error: any) {
    toast.add({ title: error?.data?.message || "Current password is incorrect", color: "error" })
  } finally {
    pwSaving.value = false
  }
}

// ─── Init ───
onMounted(async () => {
  passkeySupported.value = typeof window !== "undefined" && !!window.PublicKeyCredential
  await Promise.allSettled([loadUsers(), loadSessions(), loadAttempts(), loadPasskeys()])
})
</script>

<!--
  Admin — User Management (v3: 2-column layout, compact, dashboard style)
-->

<template>
  <div class="space-y-6">
    <AdminPageHeader
      icon="i-heroicons-users"
      eyebrow="System"
      title="Users"
      description="Accounts, sessions, passkeys and password controls for the admin workspace."
    >
      <template #actions>
        <UButton icon="i-heroicons-plus" size="sm" @click="createModal = true">New User</UButton>
      </template>
    </AdminPageHeader>

    <div v-if="loading" class="glass rounded-xl p-12 text-center">
      <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 text-brand-400 animate-spin mx-auto" />
    </div>

    <div v-else class="space-y-6">

      <!-- Stats — Dashboard style -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 admin-fade-in admin-stagger-1">
        <div v-for="(card, idx) in statCards" :key="idx" class="glass rounded-xl p-5">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-lg flex items-center justify-center" :class="card.bg">
              <UIcon :name="card.icon" class="w-5 h-5" :class="card.color" />
            </div>
            <div>
              <p class="text-2xl font-bold" :class="card.valueClass || (isDark ? 'text-white' : 'text-gray-900')">{{ card.value }}</p>
              <p class="text-xs" :class="isDark ? 'text-silver-500' : 'text-gray-500'">{{ card.label }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Users List — full width -->
      <div v-if="userList.length" class="glass rounded-xl overflow-hidden admin-fade-in admin-stagger-2">
        <div class="px-5 py-3 border-b" :class="isDark ? 'border-brand-400/5' : 'border-gray-100'">
          <div class="flex items-center gap-2">
            <UIcon name="i-heroicons-users" class="w-4 h-4" :class="isDark ? 'text-silver-500' : 'text-gray-400'" />
            <span class="text-xs font-semibold uppercase tracking-wider" :class="isDark ? 'text-silver-500' : 'text-gray-500'">Admin Accounts</span>
          </div>
        </div>
        <div class="divide-y" :class="isDark ? 'divide-brand-400/5' : 'divide-gray-100'">
          <div v-for="u in userList" :key="u.id"
            class="flex items-center justify-between px-5 py-3.5 transition-colors"
            :class="isDark ? 'hover:bg-white/[0.02]' : 'hover:bg-gray-50/50'">
            <div class="flex items-center gap-3">
              <div class="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold" :class="avatarStyle(u)">
                {{ u.username.charAt(0).toUpperCase() }}
              </div>
              <div>
                <div class="flex items-center gap-2 flex-wrap">
                  <p class="text-sm font-semibold" :class="isDark ? 'text-white' : 'text-gray-900'">{{ u.username }}</p>
                  <UBadge v-if="u.id === currentUser?.id" color="info" variant="subtle" size="xs">You</UBadge>
                  <UBadge :color="u.role === 'admin' ? 'success' : 'neutral'" variant="subtle" size="xs">{{ u.role }}</UBadge>
                  <UBadge v-if="u.isLocked" color="error" variant="subtle" size="xs">Locked</UBadge>
                  <UBadge v-if="u.passkeyCount > 0" color="purple" variant="subtle" size="xs">{{ u.passkeyCount }} passkey{{ u.passkeyCount > 1 ? 's' : '' }}</UBadge>
                </div>
                <p class="text-xs mt-0.5" :class="isDark ? 'text-silver-600' : 'text-gray-400'">
                  {{ u.lastLogin ? timeAgo(u.lastLogin) : 'Never logged in' }} &middot; Created {{ formatDate(u.createdAt) }}
                </p>
              </div>
            </div>
            <div class="flex items-center gap-1">
              <UButton v-if="u.isLocked" icon="i-heroicons-lock-open" variant="ghost" color="success" size="xs" @click="doUnlock(u)" />
              <UButton v-if="u.id === currentUser?.id" icon="i-heroicons-key" variant="ghost" color="neutral" size="xs" @click="scrollToPassword" />
              <UButton v-if="u.id !== currentUser?.id" icon="i-heroicons-trash" variant="ghost" color="error" size="xs" @click="confirmDel(u)" />
            </div>
          </div>
        </div>
      </div>

      <!-- 2-Column: Passkeys + Sessions -->
      <div class="grid lg:grid-cols-2 gap-6 admin-fade-in admin-stagger-3">
        <!-- My Passkeys -->
        <div class="glass rounded-xl p-6">
          <div class="flex items-center justify-between mb-4">
            <div class="flex items-center gap-2.5">
              <div class="w-8 h-8 rounded-lg flex items-center justify-center" :class="isDark ? 'bg-purple-400/10' : 'bg-purple-50'">
                <UIcon name="i-heroicons-finger-print" class="w-4 h-4 text-purple-400" />
              </div>
              <h2 class="text-base font-semibold" :class="isDark ? 'text-white' : 'text-gray-900'">My Passkeys</h2>
            </div>
            <UButton v-if="passkeySupported" size="xs" icon="i-heroicons-plus" @click="registerPasskey" :loading="registeringPasskey">Add</UButton>
          </div>

          <div v-if="passkeysLoading" class="py-6 text-center">
            <UIcon name="i-heroicons-arrow-path" class="w-5 h-5 text-brand-400 animate-spin mx-auto" />
          </div>
          <div v-else-if="passkeysList.length" class="space-y-2">
            <div v-for="pk in passkeysList" :key="pk.id"
              class="flex items-center justify-between py-2.5 px-3 rounded-lg border"
              :class="isDark ? 'bg-brand-900/30 border-brand-400/5' : 'bg-gray-50 border-gray-100'">
              <div class="flex items-center gap-2.5 min-w-0">
                <UIcon name="i-heroicons-finger-print" class="w-4 h-4 text-purple-400 flex-shrink-0" />
                <div class="min-w-0">
                  <div class="flex items-center gap-1.5">
                    <p v-if="editingPasskey !== pk.id" class="text-xs font-medium truncate" :class="isDark ? 'text-white' : 'text-gray-900'">{{ pk.deviceName }}</p>
                    <UInput v-else v-model="editPasskeyName" size="xs" class="w-32" @keyup.enter="savePasskeyName(pk)" @keyup.esc="editingPasskey = null" autofocus />
                    <button v-if="editingPasskey !== pk.id" @click="startEditPasskey(pk)" class="p-0.5 rounded" :class="isDark ? 'text-silver-600 hover:text-silver-400' : 'text-gray-400 hover:text-gray-600'">
                      <UIcon name="i-heroicons-pencil-square" class="w-2.5 h-2.5" />
                    </button>
                  </div>
                  <p class="text-[10px]" :class="isDark ? 'text-silver-600' : 'text-gray-400'">{{ pk.lastUsed ? timeAgo(pk.lastUsed) : 'Never used' }}</p>
                </div>
              </div>
              <UButton icon="i-heroicons-trash" variant="ghost" color="error" size="xs" @click="deletePasskeyConfirm(pk)" />
            </div>
          </div>
          <div v-else class="py-6 text-center">
            <UIcon name="i-heroicons-finger-print" class="w-8 h-8 mx-auto mb-2" :class="isDark ? 'text-silver-700' : 'text-gray-300'" />
            <p class="text-xs" :class="isDark ? 'text-silver-500' : 'text-gray-400'">No passkeys registered</p>
          </div>
        </div>

        <!-- Active Sessions -->
        <div class="glass rounded-xl p-6">
          <div class="flex items-center justify-between mb-4">
            <div class="flex items-center gap-2.5">
              <div class="w-8 h-8 rounded-lg flex items-center justify-center" :class="isDark ? 'bg-green-400/10' : 'bg-green-50'">
                <UIcon name="i-heroicons-computer-desktop" class="w-4 h-4 text-green-400" />
              </div>
              <h2 class="text-base font-semibold" :class="isDark ? 'text-white' : 'text-gray-900'">Active Sessions</h2>
            </div>
            <UButton v-if="activeSessions.length > 1" size="xs" variant="subtle" color="error" icon="i-heroicons-arrow-right-on-rectangle" @click="endAllOtherSessions">End Others</UButton>
          </div>
          <div v-if="sessionsLoading" class="py-6 text-center">
            <UIcon name="i-heroicons-arrow-path" class="w-5 h-5 text-brand-400 animate-spin mx-auto" />
          </div>
          <div v-else-if="activeSessions.length" class="space-y-2">
            <div v-for="s in activeSessions" :key="s.id"
              class="flex items-center justify-between py-2.5 px-3 rounded-lg border"
              :class="s.isCurrent ? isDark ? 'bg-green-500/5 border-green-400/20' : 'bg-green-50 border-green-200' : isDark ? 'bg-brand-900/30 border-brand-400/5' : 'bg-gray-50 border-gray-100'">
              <div class="flex items-center gap-2.5">
                <div class="w-7 h-7 rounded-lg flex items-center justify-center relative" :class="s.isCurrent ? 'bg-green-400/15' : isDark ? 'bg-brand-400/10' : 'bg-gray-200'">
                  <UIcon :name="deviceIcon(s.deviceType)" class="w-3.5 h-3.5" :class="s.isCurrent ? 'text-green-400' : isDark ? 'text-silver-400' : 'text-gray-500'" />
                  <span v-if="s.isCurrent" class="absolute -top-0.5 -right-0.5 w-2 h-2 bg-green-400 rounded-full border" :class="isDark ? 'border-brand-900' : 'border-white'" />
                </div>
                <div>
                  <div class="flex items-center gap-1.5">
                    <p class="text-xs font-medium" :class="isDark ? 'text-white' : 'text-gray-900'">{{ s.browser || '?' }} / {{ s.os || '?' }}</p>
                    <UBadge v-if="s.isCurrent" color="success" variant="subtle" size="xs">Current</UBadge>
                  </div>
                  <p class="text-[10px] font-mono" :class="isDark ? 'text-silver-600' : 'text-gray-400'">{{ s.ipAddress || '—' }} &middot; {{ timeAgo(s.lastActive) }}</p>
                </div>
              </div>
              <UButton v-if="!s.isCurrent" icon="i-heroicons-x-mark" variant="ghost" color="error" size="xs" @click="endSession(s.id)" />
            </div>
          </div>
          <div v-else class="py-6 text-center">
            <p class="text-xs" :class="isDark ? 'text-silver-500' : 'text-gray-400'">No active sessions.</p>
          </div>
        </div>
      </div>

      <!-- 2-Column: Login Attempts + Password -->
      <div class="grid lg:grid-cols-2 gap-6 admin-fade-in admin-stagger-4">
        <!-- Login Attempts -->
        <div class="glass rounded-xl p-6">
          <div class="flex items-center gap-2.5 mb-4">
            <div class="w-8 h-8 rounded-lg flex items-center justify-center" :class="isDark ? 'bg-brand-400/10' : 'bg-blue-50'">
              <UIcon name="i-heroicons-shield-check" class="w-4 h-4 text-brand-400" />
            </div>
            <h2 class="text-base font-semibold" :class="isDark ? 'text-white' : 'text-gray-900'">Login History</h2>
          </div>
          <div v-if="attemptStats" class="grid grid-cols-4 gap-1.5 mb-3">
            <div v-for="s in miniStats" :key="s.label" class="rounded-lg p-2 text-center" :class="isDark ? 'bg-brand-900/30' : 'bg-gray-50'">
              <p class="text-sm font-bold" :class="s.color">{{ s.value }}</p>
              <p class="text-[8px] uppercase tracking-wider" :class="isDark ? 'text-silver-600' : 'text-gray-400'">{{ s.label }}</p>
            </div>
          </div>
          <div class="flex items-center gap-2 mb-3">
            <UInput v-model="attemptSearch" placeholder="Search..." icon="i-heroicons-magnifying-glass" size="xs" class="flex-1" />
            <USelect v-model="attemptFilter" :items="attemptFilterOptions" value-key="value" size="xs" class="w-24" />
          </div>
          <div v-if="attemptsLoading" class="py-4 text-center"><UIcon name="i-heroicons-arrow-path" class="w-5 h-5 text-brand-400 animate-spin mx-auto" /></div>
          <div v-else-if="paginatedAttempts.length" class="space-y-1">
            <div v-for="a in paginatedAttempts" :key="a.id" class="flex items-center justify-between py-2 px-2.5 rounded-lg"
              :class="a.is_flagged ? isDark ? 'bg-amber-500/5' : 'bg-amber-50' : isDark ? 'hover:bg-brand-900/30' : 'hover:bg-gray-50'">
              <div class="flex items-center gap-2">
                <UIcon :name="a.success ? 'i-heroicons-check-circle' : 'i-heroicons-x-circle'" :class="a.success ? 'text-green-400' : 'text-red-400'" class="w-3.5 h-3.5 flex-shrink-0" />
                <div class="min-w-0">
                  <div class="flex items-center gap-1.5">
                    <p class="text-xs font-medium truncate" :class="isDark ? 'text-white' : 'text-gray-900'">{{ a.username }}</p>
                    <UBadge v-if="a.is_flagged" color="warning" variant="subtle" size="xs">{{ flagLabel(a.flag_reason) }}</UBadge>
                  </div>
                  <p class="text-[10px] font-mono" :class="isDark ? 'text-silver-600' : 'text-gray-400'">{{ a.ip_address || '—' }}</p>
                </div>
              </div>
              <span class="text-[10px] flex-shrink-0" :class="isDark ? 'text-silver-600' : 'text-gray-400'">{{ timeAgo(a.created_at) }}</span>
            </div>
          </div>
          <div v-else class="py-4 text-center"><p class="text-xs" :class="isDark ? 'text-silver-500' : 'text-gray-400'">No login attempts yet.</p></div>
          <div v-if="totalPages > 1" class="flex items-center justify-center gap-2 mt-3 pt-2" :class="isDark ? 'border-t border-brand-400/5' : 'border-t border-gray-100'">
            <UButton size="xs" variant="ghost" icon="i-heroicons-chevron-left" :disabled="attemptPage <= 1" @click="attemptPage--" />
            <span class="text-[10px]" :class="isDark ? 'text-silver-500' : 'text-gray-500'">{{ attemptPage }}/{{ totalPages }}</span>
            <UButton size="xs" variant="ghost" icon="i-heroicons-chevron-right" :disabled="attemptPage >= totalPages" @click="attemptPage++" />
          </div>
        </div>

        <!-- Password Change -->
        <div ref="passwordSection" class="glass rounded-xl p-6">
          <div class="flex items-center gap-2.5 mb-4">
            <div class="w-8 h-8 rounded-lg flex items-center justify-center" :class="isDark ? 'bg-amber-400/10' : 'bg-amber-50'">
              <UIcon name="i-heroicons-key" class="w-4 h-4 text-amber-400" />
            </div>
            <h2 class="text-base font-semibold" :class="isDark ? 'text-white' : 'text-gray-900'">Change Password</h2>
          </div>
          <div class="space-y-3">
            <div>
              <label class="block text-xs font-medium mb-1" :class="isDark ? 'text-silver-400' : 'text-gray-600'">Current Password</label>
              <UInput v-model="pwForm.current" :type="showPw ? 'text' : 'password'" :disabled="pwSaving" size="sm">
                <template #trailing>
                  <button class="text-silver-500 hover:text-silver-300 transition-colors" @click="showPw = !showPw" type="button" tabindex="-1">
                    <UIcon :name="showPw ? 'i-heroicons-eye-slash' : 'i-heroicons-eye'" class="w-3.5 h-3.5" />
                  </button>
                </template>
              </UInput>
            </div>
            <div>
              <label class="block text-xs font-medium mb-1" :class="isDark ? 'text-silver-400' : 'text-gray-600'">New Password</label>
              <UInput v-model="pwForm.newPw" :type="showPw ? 'text' : 'password'" :disabled="pwSaving" size="sm">
                <template #trailing>
                  <button class="text-silver-500 hover:text-silver-300 transition-colors" @click="showPw = !showPw" type="button" tabindex="-1">
                    <UIcon :name="showPw ? 'i-heroicons-eye-slash' : 'i-heroicons-eye'" class="w-3.5 h-3.5" />
                  </button>
                </template>
              </UInput>
              <div v-if="pwForm.newPw" class="mt-2">
                <div class="flex gap-1 mb-1">
                  <div v-for="i in 4" :key="i" class="h-1 flex-1 rounded-full transition-colors" :class="i <= pwStrength.score ? pwStrength.color : isDark ? 'bg-brand-900/50' : 'bg-gray-100'" />
                </div>
                <p class="text-[10px]" :class="isDark ? 'text-silver-500' : 'text-gray-400'">{{ pwStrength.label }}</p>
              </div>
              <p v-else class="text-[10px] mt-1" :class="isDark ? 'text-silver-600' : 'text-gray-400'">Min. 8 chars, uppercase, lowercase &amp; number</p>
            </div>
          </div>
          <UButton class="mt-4" @click="changePassword" :loading="pwSaving" size="sm" :disabled="!pwForm.current || !pwForm.newPw || pwStrength.score < 2">
            Change Password
          </UButton>
        </div>
      </div>
    </div>

    <!-- Modals -->
    <UModal v-model:open="createModal">
      <template #content>
        <div class="p-6">
          <div class="flex items-center gap-3 mb-6">
            <div class="w-10 h-10 rounded-full flex items-center justify-center bg-brand-400/10"><UIcon name="i-heroicons-user-plus" class="w-5 h-5 text-brand-400" /></div>
            <h2 class="text-lg font-semibold" :class="isDark ? 'text-white' : 'text-gray-900'">Create User</h2>
          </div>
          <div class="space-y-4">
            <div><label class="block text-sm font-medium mb-1.5" :class="isDark ? 'text-silver-300' : 'text-gray-700'">Username</label><UInput v-model="createForm.username" :disabled="creating" placeholder="admin" icon="i-heroicons-user" /></div>
            <div><label class="block text-sm font-medium mb-1.5" :class="isDark ? 'text-silver-300' : 'text-gray-700'">Password</label><UInput v-model="createForm.password" type="password" :disabled="creating" icon="i-heroicons-key" /></div>
            <div><label class="block text-sm font-medium mb-1.5" :class="isDark ? 'text-silver-300' : 'text-gray-700'">Role</label><USelect v-model="createForm.role" :items="roleOptions" value-key="value" :disabled="creating" /></div>
            <UAlert v-if="createError" color="error" variant="subtle" :title="createError" icon="i-heroicons-exclamation-circle" />
          </div>
          <div class="flex justify-end gap-3 mt-6 pt-4" :class="isDark ? 'border-t border-brand-400/10' : 'border-t border-gray-100'">
            <UButton variant="ghost" color="neutral" @click="createModal = false" :disabled="creating">Cancel</UButton>
            <UButton @click="doCreate" :loading="creating" icon="i-heroicons-plus">Create</UButton>
          </div>
        </div>
      </template>
    </UModal>
    <UModal v-model:open="delModal">
      <template #content>
        <div class="p-6">
          <div class="flex items-start gap-4"><div class="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center flex-shrink-0"><UIcon name="i-heroicons-exclamation-triangle" class="w-5 h-5 text-red-400" /></div><div><h2 class="text-lg font-semibold mb-2" :class="isDark ? 'text-white' : 'text-gray-900'">Delete User?</h2><p class="text-sm" :class="isDark ? 'text-silver-400' : 'text-gray-500'">User <strong :class="isDark ? 'text-white' : 'text-gray-900'">{{ delUser?.username }}</strong> will be permanently deleted.</p></div></div>
          <div class="flex justify-end gap-3 mt-6 pt-4" :class="isDark ? 'border-t border-brand-400/10' : 'border-t border-gray-100'"><UButton variant="ghost" color="neutral" @click="delModal = false" :disabled="deleting">Cancel</UButton><UButton color="error" @click="doDelete" :loading="deleting" icon="i-heroicons-trash">Delete</UButton></div>
        </div>
      </template>
    </UModal>
    <UModal v-model:open="revokeAllModal">
      <template #content>
        <div class="p-6">
          <div class="flex items-start gap-4"><div class="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center flex-shrink-0"><UIcon name="i-heroicons-arrow-right-on-rectangle" class="w-5 h-5 text-amber-400" /></div><div><h2 class="text-lg font-semibold mb-2" :class="isDark ? 'text-white' : 'text-gray-900'">End all other sessions?</h2><p class="text-sm" :class="isDark ? 'text-silver-400' : 'text-gray-500'">All sessions except your current one will be terminated. Other devices will be logged out.</p></div></div>
          <div class="flex justify-end gap-3 mt-6 pt-4" :class="isDark ? 'border-t border-brand-400/10' : 'border-t border-gray-100'"><UButton variant="ghost" color="neutral" @click="revokeAllModal = false">Cancel</UButton><UButton color="error" @click="doRevokeAll" :loading="revokingAll" icon="i-heroicons-arrow-right-on-rectangle">End All</UButton></div>
        </div>
      </template>
    </UModal>
    <UModal v-model:open="deletePasskeyModal">
      <template #content>
        <div class="p-6">
          <div class="flex items-start gap-4"><div class="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center flex-shrink-0"><UIcon name="i-heroicons-finger-print" class="w-5 h-5 text-red-400" /></div><div><h2 class="text-lg font-semibold mb-2" :class="isDark ? 'text-white' : 'text-gray-900'">Delete Passkey?</h2><p class="text-sm" :class="isDark ? 'text-silver-400' : 'text-gray-500'">"<strong :class="isDark ? 'text-white' : 'text-gray-900'">{{ deletePasskeyTarget?.deviceName }}</strong>" will be permanently removed.</p></div></div>
          <div class="flex justify-end gap-3 mt-6 pt-4" :class="isDark ? 'border-t border-brand-400/10' : 'border-t border-gray-100'"><UButton variant="ghost" color="neutral" @click="deletePasskeyModal = false">Cancel</UButton><UButton color="error" @click="doDeletePasskey" :loading="deletingPasskey" icon="i-heroicons-trash">Delete</UButton></div>
        </div>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'admin' })

const toast = useToast()
const { apiFetch } = useApi()
const { user: currentUser } = useAuth()
const isDark = useIsDark()

interface User { id: number; username: string; role: string; lastLogin: string | null; createdAt: string; isLocked?: boolean; lockedUntil?: string | null; passkeyCount: number }
interface Session { id: number; browser: string; os: string; deviceType: string; ipAddress: string; lastActive: string | number; expiresAt: string | number; createdAt: string | number; isCurrent: boolean }
interface LoginAttempt { id: number; username: string; ip_address: string; browser: string; os: string; success: boolean; fail_reason: string | null; is_flagged: boolean; flag_reason: string | null; created_at: string | number }
interface Passkey { id: number; credentialId: string; deviceName: string; createdAt: string | number; lastUsed: string | number | null }

const userList = ref<User[]>([])
const activeSessions = ref<Session[]>([])
const loginAttemptsList = ref<LoginAttempt[]>([])
const attemptStats = ref<any>(null)
const passkeysList = ref<Passkey[]>([])
const loading = ref(true)
const sessionsLoading = ref(true)
const attemptsLoading = ref(true)
const passkeysLoading = ref(true)
const passwordSection = ref<HTMLElement | null>(null)
const showPw = ref(false)
const attemptSearch = ref('')
const attemptFilter = ref('all')
const attemptPage = ref(1)
const PAGE_SIZE = 8
const passkeySupported = ref(false)
const registeringPasskey = ref(false)

const attemptFilterOptions = [{ label: 'All', value: 'all' }, { label: 'Success', value: 'success' }, { label: 'Failed', value: 'failed' }]
const roleOptions = [{ label: 'Admin — Full access', value: 'admin' }, { label: 'Editor — Content only', value: 'editor' }]

if (import.meta.client) { passkeySupported.value = !!window.PublicKeyCredential }

const statCards = computed(() => {
  const failed = attemptStats.value?.recentFailed || 0
  return [
    { label: 'Users', value: userList.value.length, icon: 'i-heroicons-users', bg: 'bg-brand-400/10', color: 'text-brand-400' },
    { label: 'Sessions', value: activeSessions.value.length, icon: 'i-heroicons-computer-desktop', bg: 'bg-green-400/10', color: 'text-green-400' },
    { label: 'Passkeys', value: passkeysList.value.length, icon: 'i-heroicons-finger-print', bg: 'bg-purple-400/10', color: 'text-purple-400' },
    { label: 'Failed (7d)', value: failed, icon: 'i-heroicons-shield-exclamation', bg: failed > 0 ? 'bg-red-400/10' : 'bg-green-400/10', color: failed > 0 ? 'text-red-400' : 'text-green-400', valueClass: failed > 0 ? 'text-red-400' : 'text-green-400' },
  ]
})

const miniStats = computed(() => {
  if (!attemptStats.value) return []
  return [
    { label: 'Total', value: attemptStats.value.totalAttempts, color: isDark.value ? 'text-white' : 'text-gray-900' },
    { label: 'Failed', value: attemptStats.value.failedAttempts, color: 'text-red-400' },
    { label: 'Flagged', value: attemptStats.value.flaggedAttempts, color: 'text-amber-400' },
    { label: '7d fail', value: attemptStats.value.recentFailed, color: attemptStats.value.recentFailed > 0 ? 'text-red-400' : 'text-green-400' },
  ]
})

const filteredAttempts = computed(() => {
  let list = loginAttemptsList.value
  if (attemptFilter.value === 'success') list = list.filter(a => a.success)
  if (attemptFilter.value === 'failed') list = list.filter(a => !a.success)
  if (attemptSearch.value) { const q = attemptSearch.value.toLowerCase(); list = list.filter(a => a.username.toLowerCase().includes(q) || (a.ip_address || '').includes(q)) }
  return list
})
const totalPages = computed(() => Math.max(1, Math.ceil(filteredAttempts.value.length / PAGE_SIZE)))
const paginatedAttempts = computed(() => { const start = (attemptPage.value - 1) * PAGE_SIZE; return filteredAttempts.value.slice(start, start + PAGE_SIZE) })
watch([attemptFilter, attemptSearch], () => { attemptPage.value = 1 })

function deviceIcon(type: string | null) { return type === 'mobile' ? 'i-heroicons-device-phone-mobile' : type === 'tablet' ? 'i-heroicons-device-tablet' : 'i-heroicons-computer-desktop' }
function flagLabel(reason: string | null) { return reason === 'brute_force' ? 'Brute Force' : reason === 'new_ip' ? 'New IP' : reason === 'new_device' ? 'New Device' : 'Suspicious' }
function avatarStyle(u: User) { if (u.id === currentUser.value?.id) return 'bg-brand-400/20 text-brand-400'; const c = ['bg-green-400/20 text-green-400','bg-purple-400/20 text-purple-400','bg-amber-400/20 text-amber-400','bg-rose-400/20 text-rose-400']; return c[u.username.split('').reduce((a,b)=>a+b.charCodeAt(0),0)%c.length] }
function scrollToPassword() { passwordSection.value?.scrollIntoView({ behavior: 'smooth', block: 'center' }) }

const pwStrength = computed(() => { const pw = pwForm.newPw; if (!pw) return { score: 0, label: '', color: '' }; let s = 0; if (pw.length >= 8) s++; if (/[A-Z]/.test(pw)) s++; if (/[0-9]/.test(pw)) s++; if (/[^A-Za-z0-9]/.test(pw)) s++; return { score: s, label: ['','Weak','Fair','Good','Strong'][s], color: ['','bg-red-400','bg-amber-400','bg-green-400','bg-emerald-400'][s] } })

function formatDate(d: string | number | null) { if (!d) return '—'; const date = typeof d === 'number' ? new Date(d * 1000) : new Date(d); if (isNaN(date.getTime())) return '—'; return date.toLocaleDateString('en-US', { day: '2-digit', month: '2-digit', year: 'numeric' }) }
function timeAgo(d: string | number | null) { if (!d) return ''; const date = typeof d === 'number' ? new Date(d * 1000) : new Date(d); const s = Math.floor((Date.now() - date.getTime()) / 1000); if (s < 60) return 'just now'; const m = Math.floor(s / 60); if (m < 60) return `${m}m ago`; const h = Math.floor(m / 60); if (h < 24) return `${h}h ago`; return `${Math.floor(h / 24)}d ago` }

// Load
async function loadUsers() { loading.value = true; try { userList.value = ((await apiFetch<any[]>('/api/v1/admin/users')) || []).map(u => ({ ...u, passkeyCount: 0 })) } catch {} finally { loading.value = false } }
async function loadSessions() { sessionsLoading.value = true; try { activeSessions.value = await apiFetch('/api/v1/admin/sessions') } catch { activeSessions.value = [] } finally { sessionsLoading.value = false } }
async function loadAttempts() { attemptsLoading.value = true; try { const r = await apiFetch<any>('/api/v1/admin/sessions/login-attempts?limit=100'); loginAttemptsList.value = Array.isArray(r) ? r : (r || []) } catch { loginAttemptsList.value = [] } attemptsLoading.value = false; try { const r = await $fetch<any>('/api/v1/admin/sessions/login-attempts?limit=1', { headers: { Authorization: `Bearer ${useAuth().token.value}` } }); if (r?.meta?.stats) attemptStats.value = r.meta.stats } catch {} }
async function loadPasskeys() { passkeysLoading.value = true; try { passkeysList.value = await apiFetch('/api/v1/admin/passkeys') } catch { passkeysList.value = [] } finally { passkeysLoading.value = false } }
onMounted(() => { loadUsers(); loadSessions(); loadAttempts(); loadPasskeys() })

// Passkeys
const editingPasskey = ref<number | null>(null); const editPasskeyName = ref(''); const deletePasskeyModal = ref(false); const deletePasskeyTarget = ref<Passkey | null>(null); const deletingPasskey = ref(false)
function startEditPasskey(pk: Passkey) { editingPasskey.value = pk.id; editPasskeyName.value = pk.deviceName }
async function savePasskeyName(pk: Passkey) { if (!editPasskeyName.value.trim()) return; try { await apiFetch(`/api/v1/admin/passkeys/${pk.id}`, { method: 'PUT', body: { deviceName: editPasskeyName.value.trim() } }); editingPasskey.value = null; await loadPasskeys() } catch (e: any) { toast.add({ title: e?.data?.message || 'Error', color: 'error' }) } }
function deletePasskeyConfirm(pk: Passkey) { deletePasskeyTarget.value = pk; deletePasskeyModal.value = true }
async function doDeletePasskey() { if (!deletePasskeyTarget.value) return; deletingPasskey.value = true; try { await apiFetch(`/api/v1/admin/passkeys/${deletePasskeyTarget.value.id}`, { method: 'DELETE' }); toast.add({ title: 'Passkey deleted', color: 'success', icon: 'i-heroicons-check-circle' }); deletePasskeyModal.value = false; await loadPasskeys() } catch (e: any) { toast.add({ title: e?.data?.message || 'Error', color: 'error' }) } finally { deletingPasskey.value = false } }
async function registerPasskey() { registeringPasskey.value = true; try { const o = await apiFetch<any>('/api/v1/auth/webauthn/register-options', { method: 'POST' }); const { startRegistration } = await import('@simplewebauthn/browser'); const c = await startRegistration({ optionsJSON: o }); const n = prompt('Name this passkey (e.g. "MacBook Pro"):') || 'Passkey'; await apiFetch('/api/v1/auth/webauthn/register-verify', { method: 'POST', body: { credential: c, deviceName: n } }); toast.add({ title: 'Passkey registered!', color: 'success', icon: 'i-heroicons-finger-print' }); await loadPasskeys() } catch (e: any) { if (e?.name === 'NotAllowedError') toast.add({ title: 'Cancelled', color: 'neutral' }); else toast.add({ title: e?.data?.message || e?.message || 'Failed', color: 'error' }) } finally { registeringPasskey.value = false } }

// Sessions
async function endSession(id: number) { try { await apiFetch(`/api/v1/admin/sessions/${id}`, { method: 'DELETE' }); toast.add({ title: 'Session ended', color: 'success', icon: 'i-heroicons-check-circle' }); await loadSessions() } catch (e: any) { toast.add({ title: e?.data?.message || 'Error', color: 'error' }) } }
const revokeAllModal = ref(false); const revokingAll = ref(false)
function endAllOtherSessions() { revokeAllModal.value = true }
async function doRevokeAll() { revokingAll.value = true; try { const r = await apiFetch<any>('/api/v1/admin/sessions/revoke-others', { method: 'POST' }); toast.add({ title: `${r?.revokedCount || 0} session(s) ended`, color: 'success', icon: 'i-heroicons-check-circle' }); revokeAllModal.value = false; await loadSessions() } catch (e: any) { toast.add({ title: e?.data?.message || 'Error', color: 'error' }) } finally { revokingAll.value = false } }

// Unlock
async function doUnlock(u: User) { try { await apiFetch(`/api/v1/admin/users/${u.id}/unlock`, { method: 'POST' }); toast.add({ title: `${u.username} unlocked`, color: 'success', icon: 'i-heroicons-lock-open' }); await loadUsers() } catch (e: any) { toast.add({ title: e?.data?.message || 'Error', color: 'error' }) } }

// Create
const createModal = ref(false); const creating = ref(false); const createError = ref(''); const createForm = reactive({ username: '', password: '', role: 'admin' })
async function doCreate() { if (!createForm.username || !createForm.password) { createError.value = 'Please enter username and password'; return }; if (createForm.password.length < 8) { createError.value = 'Min. 8 chars, uppercase, lowercase & number'; return }; creating.value = true; createError.value = ''; try { await apiFetch('/api/v1/admin/users', { method: 'POST', body: createForm }); toast.add({ title: 'User created', color: 'success', icon: 'i-heroicons-check-circle' }); createModal.value = false; Object.assign(createForm, { username: '', password: '', role: 'admin' }); await loadUsers() } catch (e: any) { createError.value = e?.data?.message || 'Error' } finally { creating.value = false } }

// Delete
const delModal = ref(false); const delUser = ref<User | null>(null); const deleting = ref(false)
function confirmDel(u: User) { delUser.value = u; delModal.value = true }
async function doDelete() { if (!delUser.value) return; deleting.value = true; try { await apiFetch(`/api/v1/admin/users/${delUser.value.id}`, { method: 'DELETE' }); toast.add({ title: 'User deleted', color: 'success', icon: 'i-heroicons-check-circle' }); delModal.value = false; await loadUsers() } catch (e: any) { toast.add({ title: e?.data?.message || 'Error', color: 'error' }) } finally { deleting.value = false } }

// Password
const pwSaving = ref(false); const pwForm = reactive({ current: '', newPw: '' })
async function changePassword() { if (!pwForm.current || !pwForm.newPw) return; if (pwForm.newPw.length < 8) { toast.add({ title: 'Min. 8 chars, uppercase, lowercase & number', color: 'error' }); return }; pwSaving.value = true; try { await apiFetch('/api/v1/admin/password', { method: 'PUT', body: { currentPassword: pwForm.current, newPassword: pwForm.newPw } }); toast.add({ title: 'Password changed', color: 'success', icon: 'i-heroicons-check-circle' }); pwForm.current = ''; pwForm.newPw = '' } catch (e: any) { toast.add({ title: e?.data?.message || 'Current password is incorrect', color: 'error' }) } finally { pwSaving.value = false } }
</script>

<!--
  Admin — Settings (v3: 2-column layout, compact, matches dashboard style)
-->

<template>
  <div class="space-y-6">
    <AdminPageHeader
      icon="i-heroicons-cog-6-tooth"
      eyebrow="System"
      title="Settings"
      description="Site configuration, maintenance behaviour, tracking and operational defaults."
    >
      <template #actions>
        <UButton icon="i-heroicons-check" :loading="saving" @click="save">Save</UButton>
      </template>
    </AdminPageHeader>

    <AdminStickyBar :show="hasChanges" description="There are unsaved settings changes waiting to be applied.">
      <template #actions>
        <UButton icon="i-heroicons-check" :loading="saving" @click="save">Save</UButton>
      </template>
    </AdminStickyBar>

    <div v-if="loading" class="glass rounded-xl p-12 text-center">
      <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 text-brand-400 animate-spin mx-auto mb-3" />
    </div>

    <div v-else class="space-y-6">

      <!-- System Status Cards — Dashboard style -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 admin-fade-in admin-stagger-1">
        <div v-for="(card, idx) in statusCards" :key="idx" class="glass rounded-xl p-5">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-lg flex items-center justify-center" :class="card.bg">
              <UIcon :name="card.icon" class="w-5 h-5" :class="card.color" />
            </div>
            <div class="min-w-0">
              <p class="text-2xl font-bold truncate" :class="isDark ? 'text-white' : 'text-gray-900'">{{ card.value }}</p>
              <p class="text-xs" :class="isDark ? 'text-silver-500' : 'text-gray-500'">{{ card.label }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- 2-Column Grid: General + Links -->
      <div class="grid lg:grid-cols-2 gap-6 admin-fade-in admin-stagger-2">
        <!-- General -->
        <div class="glass rounded-xl p-6">
          <div class="flex items-center gap-2.5 mb-4">
            <div class="w-8 h-8 rounded-lg flex items-center justify-center" :class="isDark ? 'bg-brand-400/10' : 'bg-blue-50'">
              <UIcon name="i-heroicons-globe-alt" class="w-4 h-4 text-brand-400" />
            </div>
            <h2 class="text-base font-semibold" :class="isDark ? 'text-white' : 'text-gray-900'">General</h2>
          </div>
          <div class="space-y-3">
            <div>
              <label class="block text-xs font-medium mb-1" :class="isDark ? 'text-silver-400' : 'text-gray-600'">Site Name</label>
              <UInput v-model="form.site_name" placeholder="MagguuUI" :disabled="saving" size="sm" />
            </div>
            <div>
              <label class="block text-xs font-medium mb-1" :class="isDark ? 'text-silver-400' : 'text-gray-600'">Description</label>
              <UInput v-model="form.site_description" placeholder="World of Warcraft UI Configuration" :disabled="saving" size="sm" />
            </div>
          </div>
        </div>

        <!-- External Links -->
        <div class="glass rounded-xl p-6">
          <div class="flex items-center gap-2.5 mb-4">
            <div class="w-8 h-8 rounded-lg flex items-center justify-center" :class="isDark ? 'bg-green-400/10' : 'bg-green-50'">
              <UIcon name="i-heroicons-link" class="w-4 h-4 text-green-400" />
            </div>
            <h2 class="text-base font-semibold" :class="isDark ? 'text-white' : 'text-gray-900'">Links</h2>
          </div>
          <div class="space-y-2.5">
            <div v-for="link in linkFields" :key="link.key" class="flex items-center gap-2">
              <div class="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" :class="isDark ? 'bg-white/5' : 'bg-gray-50'">
                <UIcon :name="link.icon" class="w-3.5 h-3.5" :class="isDark ? 'text-silver-400' : 'text-gray-500'" />
              </div>
              <UInput v-model="(form as any)[link.key]" :placeholder="link.placeholder" :disabled="saving" class="flex-1" size="sm" />
              <a v-if="(form as any)[link.key]" :href="(form as any)[link.key]" target="_blank" rel="noopener noreferrer"
                class="p-1 rounded transition-colors" :class="isDark ? 'text-silver-500 hover:text-brand-400' : 'text-gray-400 hover:text-brand-500'">
                <UIcon name="i-heroicons-arrow-top-right-on-square" class="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      </div>

      <!-- 2-Column Grid: SEO + Security -->
      <div class="grid lg:grid-cols-2 gap-6 admin-fade-in admin-stagger-3">
        <!-- SEO & Meta -->
        <div class="glass rounded-xl p-6">
          <div class="flex items-center gap-2.5 mb-4">
            <div class="w-8 h-8 rounded-lg flex items-center justify-center" :class="isDark ? 'bg-purple-400/10' : 'bg-purple-50'">
              <UIcon name="i-heroicons-magnifying-glass" class="w-4 h-4 text-purple-400" />
            </div>
            <h2 class="text-base font-semibold" :class="isDark ? 'text-white' : 'text-gray-900'">SEO & Meta</h2>
          </div>
          <div class="space-y-3">
            <div>
              <label class="block text-xs font-medium mb-1" :class="isDark ? 'text-silver-400' : 'text-gray-600'">
                Meta Title
                <span class="ml-1 font-normal" :class="(form.meta_title?.length || 0) > 70 ? 'text-red-400' : isDark ? 'text-silver-600' : 'text-gray-400'">
                  {{ form.meta_title?.length || 0 }}/70
                </span>
              </label>
              <UInput v-model="form.meta_title" placeholder="MagguuUI — WoW UI Profiles" :disabled="saving" size="sm" />
            </div>
            <div>
              <label class="block text-xs font-medium mb-1" :class="isDark ? 'text-silver-400' : 'text-gray-600'">
                Meta Description
                <span class="ml-1 font-normal" :class="(form.meta_description?.length || 0) > 160 ? 'text-red-400' : isDark ? 'text-silver-600' : 'text-gray-400'">
                  {{ form.meta_description?.length || 0 }}/160
                </span>
              </label>
              <UTextarea v-model="form.meta_description" placeholder="High-quality import strings..." :disabled="saving" :rows="2" />
            </div>
            <div>
              <label class="block text-xs font-medium mb-1" :class="isDark ? 'text-silver-400' : 'text-gray-600'">OG Image URL</label>
              <UInput v-model="form.og_image_url" placeholder="https://ui.magguu.xyz/og-image.png" :disabled="saving" size="sm" />
            </div>
          </div>
        </div>

        <!-- Security -->
        <div class="glass rounded-xl p-6">
          <div class="flex items-center gap-2.5 mb-4">
            <div class="w-8 h-8 rounded-lg flex items-center justify-center" :class="isDark ? 'bg-red-400/10' : 'bg-red-50'">
              <UIcon name="i-heroicons-shield-check" class="w-4 h-4 text-red-400" />
            </div>
            <h2 class="text-base font-semibold" :class="isDark ? 'text-white' : 'text-gray-900'">Security</h2>
          </div>
          <div class="space-y-3">
            <div>
              <label class="block text-xs font-medium mb-1" :class="isDark ? 'text-silver-400' : 'text-gray-600'">Session Timeout</label>
              <USelect v-model="form.session_timeout_hours" :items="sessionTimeoutOptions" value-key="value" :disabled="saving" size="sm" />
            </div>
            <div>
              <label class="block text-xs font-medium mb-1" :class="isDark ? 'text-silver-400' : 'text-gray-600'">Max Login Attempts</label>
              <USelect v-model="form.max_login_attempts" :items="loginAttemptOptions" value-key="value" :disabled="saving" size="sm" />
            </div>
            <div>
              <label class="block text-xs font-medium mb-1" :class="isDark ? 'text-silver-400' : 'text-gray-600'">Lockout Duration</label>
              <USelect v-model="form.lockout_duration_minutes" :items="lockoutOptions" value-key="value" :disabled="saving" size="sm" />
            </div>
            <div class="rounded-lg p-2.5 flex items-start gap-2" :class="isDark ? 'bg-red-400/5 border border-red-400/10' : 'bg-red-50/50 border border-red-100'">
              <UIcon name="i-heroicons-information-circle" class="w-3.5 h-3.5 text-red-400 flex-shrink-0 mt-0.5" />
              <p class="text-[11px]" :class="isDark ? 'text-silver-400' : 'text-gray-500'">
                After {{ form.max_login_attempts }} failed attempts, account locks for {{ form.lockout_duration_minutes }} min.
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- 2-Column Grid: Tracking+Maintenance | Database+Danger -->
      <div class="grid lg:grid-cols-2 gap-6 admin-fade-in admin-stagger-4">
        <div class="space-y-6">
          <!-- Tracking -->
          <div class="glass rounded-xl p-6">
            <div class="flex items-center gap-2.5 mb-4">
              <div class="w-8 h-8 rounded-lg flex items-center justify-center" :class="isDark ? 'bg-teal-400/10' : 'bg-teal-50'">
                <UIcon name="i-heroicons-chart-bar" class="w-4 h-4 text-teal-400" />
              </div>
              <h2 class="text-base font-semibold" :class="isDark ? 'text-white' : 'text-gray-900'">Tracking</h2>
            </div>
            <div class="space-y-2">
              <div class="flex items-center justify-between py-2 px-3 rounded-lg" :class="isDark ? 'bg-brand-900/30' : 'bg-gray-50'">
                <div>
                  <p class="text-xs font-medium" :class="isDark ? 'text-white' : 'text-gray-900'">Page Views</p>
                  <p class="text-[10px]" :class="isDark ? 'text-silver-600' : 'text-gray-400'">Anonymous visit tracking</p>
                </div>
                <USwitch :model-value="form.tracking_pageviews_enabled === 'true'" @update:model-value="form.tracking_pageviews_enabled = $event ? 'true' : 'false'" :disabled="saving" size="sm" />
              </div>
              <div class="flex items-center justify-between py-2 px-3 rounded-lg" :class="isDark ? 'bg-brand-900/30' : 'bg-gray-50'">
                <div>
                  <p class="text-xs font-medium" :class="isDark ? 'text-white' : 'text-gray-900'">Copy Events</p>
                  <p class="text-[10px]" :class="isDark ? 'text-silver-600' : 'text-gray-400'">String copy tracking</p>
                </div>
                <USwitch :model-value="form.tracking_copyevents_enabled === 'true'" @update:model-value="form.tracking_copyevents_enabled = $event ? 'true' : 'false'" :disabled="saving" size="sm" />
              </div>
              <div>
                <label class="block text-xs font-medium mb-1" :class="isDark ? 'text-silver-400' : 'text-gray-600'">Data Retention</label>
                <USelect v-model="form.data_retention_days" :items="retentionOptions" value-key="value" :disabled="saving" size="sm" />
              </div>
            </div>
          </div>
          <!-- Maintenance -->
          <div class="glass rounded-xl p-6">
            <div class="flex items-center gap-2.5 mb-4">
              <div class="w-8 h-8 rounded-lg flex items-center justify-center" :class="form.maintenance_mode === 'true' ? 'bg-amber-500/15' : isDark ? 'bg-white/5' : 'bg-gray-50'">
                <UIcon name="i-heroicons-wrench-screwdriver" class="w-4 h-4" :class="form.maintenance_mode === 'true' ? 'text-amber-400' : isDark ? 'text-silver-400' : 'text-gray-500'" />
              </div>
              <h2 class="text-base font-semibold" :class="isDark ? 'text-white' : 'text-gray-900'">Site Status</h2>
            </div>
            <div class="space-y-3">
              <div class="flex items-center justify-between py-2 px-3 rounded-lg" :class="isDark ? 'bg-brand-900/30' : 'bg-gray-50'">
                <div>
                  <p class="text-xs font-medium" :class="isDark ? 'text-white' : 'text-gray-900'">Maintenance Mode</p>
                  <p class="text-[10px]" :class="isDark ? 'text-silver-600' : 'text-gray-400'">Shows banner on public site</p>
                </div>
                <USwitch :model-value="form.maintenance_mode === 'true'" @update:model-value="form.maintenance_mode = $event ? 'true' : 'false'" :disabled="saving" :color="form.maintenance_mode === 'true' ? 'warning' : 'info'" size="sm" />
              </div>
              <div>
                <label class="block text-xs font-medium mb-1" :class="isDark ? 'text-silver-400' : 'text-gray-600'">Banner Text</label>
                <UInput v-model="form.banner_text" placeholder="e.g. New update v2.1 is live!" :disabled="saving" size="sm" />
              </div>
              <div v-if="form.banner_text" class="py-1.5 px-3 rounded-lg text-xs flex items-center gap-2"
                :class="isDark ? 'bg-brand-400/5 border border-brand-400/10' : 'bg-blue-50 border border-blue-100'">
                <UIcon name="i-heroicons-megaphone" class="w-3.5 h-3.5 text-brand-400 flex-shrink-0" />
                <span :class="isDark ? 'text-silver-300' : 'text-gray-600'">{{ form.banner_text }}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="space-y-6">
          <!-- Database -->
          <div class="glass rounded-xl p-6">
            <div class="flex items-center gap-2.5 mb-4">
              <div class="w-8 h-8 rounded-lg flex items-center justify-center" :class="isDark ? 'bg-blue-400/10' : 'bg-blue-50'">
                <UIcon name="i-heroicons-circle-stack" class="w-4 h-4 text-blue-400" />
              </div>
              <h2 class="text-base font-semibold" :class="isDark ? 'text-white' : 'text-gray-900'">Database</h2>
            </div>
            <div v-if="sysInfo?.database?.tables" class="grid grid-cols-4 gap-1.5 mb-4">
              <div v-for="(count, table) in dbTableDisplay" :key="table"
                class="rounded-lg p-2 text-center" :class="isDark ? 'bg-brand-900/30' : 'bg-gray-50'">
                <p class="text-sm font-bold" :class="isDark ? 'text-white' : 'text-gray-900'">{{ count }}</p>
                <p class="text-[8px] uppercase tracking-wider truncate" :class="isDark ? 'text-silver-600' : 'text-gray-400'">{{ table }}</p>
              </div>
            </div>
            <div class="space-y-1 mb-4">
              <div v-for="detail in systemDetails" :key="detail.label" class="flex items-center justify-between py-1.5 px-2.5 rounded" :class="isDark ? 'bg-brand-900/20' : 'bg-gray-50/70'">
                <span class="text-[11px] font-medium" :class="isDark ? 'text-silver-400' : 'text-gray-600'">{{ detail.label }}</span>
                <span class="text-[11px] font-mono" :class="isDark ? 'text-silver-500' : 'text-gray-500'">{{ detail.value }}</span>
              </div>
            </div>
            <UButton variant="subtle" icon="i-heroicons-arrow-down-tray" @click="downloadBackup" :loading="downloadingBackup" size="xs">
              Download Backup
            </UButton>
          </div>
          <!-- Danger Zone -->
          <div class="glass rounded-xl p-6 border" :class="isDark ? 'border-red-500/10' : 'border-red-100'">
            <div class="flex items-center gap-2.5 mb-4">
              <div class="w-8 h-8 rounded-lg flex items-center justify-center bg-red-500/10">
                <UIcon name="i-heroicons-exclamation-triangle" class="w-4 h-4 text-red-400" />
              </div>
              <h2 class="text-base font-semibold" :class="isDark ? 'text-white' : 'text-gray-900'">Danger Zone</h2>
            </div>
            <div class="flex items-center justify-between py-2.5 px-3 rounded-lg" :class="isDark ? 'bg-red-500/5' : 'bg-red-50/50'">
              <div>
                <p class="text-xs font-medium" :class="isDark ? 'text-white' : 'text-gray-900'">Reset to Defaults</p>
                <p class="text-[10px]" :class="isDark ? 'text-silver-500' : 'text-gray-500'">Restore all settings</p>
              </div>
              <UButton color="error" variant="subtle" size="xs" @click="resetModal = true" :disabled="saving">Reset</UButton>
            </div>
          </div>
        </div>
      </div>

    </div>

    <!-- Reset Confirm Modal -->
    <UModal v-model:open="resetModal">
      <template #content>
        <div class="p-6">
          <div class="flex items-start gap-4">
            <div class="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center flex-shrink-0">
              <UIcon name="i-heroicons-exclamation-triangle" class="w-5 h-5 text-red-400" />
            </div>
            <div>
              <h2 class="text-lg font-semibold mb-2" :class="isDark ? 'text-white' : 'text-gray-900'">Reset All Settings?</h2>
              <p class="text-sm" :class="isDark ? 'text-silver-400' : 'text-gray-500'">
                This will restore all settings to defaults. You'll still need to save to apply.
              </p>
            </div>
          </div>
          <div class="flex justify-end gap-3 mt-6 pt-4" :class="isDark ? 'border-t border-brand-400/10' : 'border-t border-gray-100'">
            <UButton variant="ghost" color="neutral" @click="resetModal = false">Cancel</UButton>
            <UButton color="error" @click="doReset" icon="i-heroicons-arrow-path">Reset</UButton>
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
const isDark = useIsDark()

const loading = ref(true)
const saving = ref(false)
const resetModal = ref(false)
const downloadingBackup = ref(false)
const sysInfo = ref<any>(null)

const statusCards = computed(() => [
  { label: 'Version', value: sysInfo.value?.app?.version || '—', icon: 'i-heroicons-server-stack', bg: 'bg-brand-400/10', color: 'text-brand-400' },
  { label: 'Uptime', value: sysInfo.value?.app?.uptimeFormatted || '—', icon: 'i-heroicons-clock', bg: 'bg-green-400/10', color: 'text-green-400' },
  { label: 'Database', value: sysInfo.value?.database?.sizeFormatted || '—', icon: 'i-heroicons-circle-stack', bg: 'bg-purple-400/10', color: 'text-purple-400' },
  { label: 'Sessions', value: sysInfo.value?.activeSessions || 0, icon: 'i-heroicons-user-group', bg: 'bg-amber-400/10', color: 'text-amber-400' },
])

const systemDetails = computed(() => [
  { label: 'Node.js', value: sysInfo.value?.app?.nodeVersion || '—' },
  { label: 'Platform', value: sysInfo.value?.app?.platform || '—' },
  { label: 'DB Size', value: sysInfo.value?.database?.sizeFormatted || '—' },
])

const sessionTimeoutOptions = [
  { label: '12 hours', value: '12' }, { label: '24 hours', value: '24' },
  { label: '48 hours', value: '48' }, { label: '7 days', value: '168' },
]
const loginAttemptOptions = [
  { label: '5 attempts', value: '5' }, { label: '10 attempts', value: '10' },
  { label: '15 attempts', value: '15' }, { label: '20 attempts', value: '20' },
]
const lockoutOptions = [
  { label: '15 minutes', value: '15' }, { label: '30 minutes', value: '30' },
  { label: '1 hour', value: '60' }, { label: '2 hours', value: '120' },
]
const retentionOptions = [
  { label: '30 days', value: '30' }, { label: '60 days', value: '60' },
  { label: '90 days', value: '90' }, { label: '180 days', value: '180' },
]

const linkFields = [
  { key: 'github_url', icon: 'i-simple-icons-github', placeholder: 'https://github.com/Derpsen/MagguuUI' },
  { key: 'discord_url', icon: 'i-simple-icons-discord', placeholder: 'https://discord.gg/...' },
  { key: 'curseforge_url', icon: 'i-simple-icons-curseforge', placeholder: 'https://www.curseforge.com/wow/addons/...' },
]

const defaults: Record<string, string> = {
  site_name: 'MagguuUI', site_description: '', curseforge_url: '',
  github_url: 'https://github.com/Derpsen/MagguuUI', discord_url: '',
  maintenance_mode: 'false', banner_text: '', meta_title: '', meta_description: '', og_image_url: '',
  session_timeout_hours: '24', max_login_attempts: '10', lockout_duration_minutes: '30',
  tracking_pageviews_enabled: 'true', tracking_copyevents_enabled: 'true', data_retention_days: '90',
}

const form = reactive({ ...defaults })
const original = ref({ ...defaults })
const hasChanges = computed(() => Object.keys(form).some(k => (form as any)[k] !== (original.value as any)[k]))

const dbTableDisplay = computed(() => {
  if (!sysInfo.value?.database?.tables) return {}
  const t = sysInfo.value.database.tables
  return { Profiles: t.profiles, WowUp: t.wowupStrings, Layouts: t.characterLayouts, Changelogs: t.changelogs, Users: t.users, Sessions: t.sessions, Passkeys: t.passkeys, Views: t.pageViews }
})

async function load() {
  loading.value = true
  try {
    const [data] = await Promise.all([apiFetch<Record<string, string>>('/api/v1/admin/settings'), loadSystemInfo()])
    if (data) {
      for (const [k, v] of Object.entries(data)) { if (k in form) (form as any)[k] = v }
      original.value = { ...form }
    }
  } catch {}
  finally { loading.value = false }
}

async function loadSystemInfo() {
  try { sysInfo.value = await apiFetch('/api/v1/admin/system/info') } catch {}
}

onMounted(load)

async function save() {
  saving.value = true
  try {
    await apiFetch('/api/v1/admin/settings', { method: 'PUT', body: { ...form } })
    original.value = { ...form }
    toast.add({ title: 'Settings saved', color: 'success', icon: 'i-heroicons-check-circle' })
  } catch (e: any) {
    toast.add({ title: e?.data?.message || 'Error', color: 'error', icon: 'i-heroicons-x-circle' })
  } finally { saving.value = false }
}

function doReset() {
  Object.assign(form, { ...defaults })
  resetModal.value = false
  toast.add({ title: 'Settings reset — save to apply', color: 'warning', icon: 'i-heroicons-arrow-path' })
}

async function downloadBackup() {
  downloadingBackup.value = true
  try {
    const { token } = useAuth()
    const response = await fetch('/api/v1/admin/system/db-backup', { headers: { Authorization: `Bearer ${token.value}` } })
    if (!response.ok) throw new Error('Download failed')
    const blob = await response.blob()
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = response.headers.get('content-disposition')?.match(/filename="(.+)"/)?.[1] || 'magguuui-backup.db'
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
    a.remove()
    toast.add({ title: 'Backup downloaded', color: 'success', icon: 'i-heroicons-arrow-down-tray' })
  } catch {
    toast.add({ title: 'Backup failed', color: 'error', icon: 'i-heroicons-x-circle' })
  } finally { downloadingBackup.value = false }
}

onBeforeRouteLeave((_to, _from, next) => {
  if (hasChanges.value) { next(window.confirm('You have unsaved changes. Leave anyway?')) } else { next() }
})
</script>

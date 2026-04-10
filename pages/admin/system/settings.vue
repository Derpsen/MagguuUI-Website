<template>
  <div class="space-y-6">
    <AdminPageHeader
      icon="i-heroicons-cog-6-tooth"
      eyebrow="System"
      title="Settings"
      description="One place for site defaults, access rules and operational switches."
    >
      <template v-if="hasChanges" #actions>
        <UButton icon="i-heroicons-check" :loading="saving" @click="save">
          Save
        </UButton>
      </template>
    </AdminPageHeader>

    <AdminStickyBar :show="hasChanges" description="There are unsaved settings changes waiting to be applied.">
      <template #actions>
        <UButton icon="i-heroicons-check" :loading="saving" @click="save">
          Save
        </UButton>
      </template>
    </AdminStickyBar>

    <AdminPanel v-if="loading" title="Settings" description="Loading site configuration." icon="i-heroicons-cog-6-tooth">
      <div class="py-12 text-center">
        <UIcon name="i-heroicons-arrow-path" class="mx-auto h-8 w-8 animate-spin text-blue-500" />
      </div>
    </AdminPanel>

    <template v-else>
      <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <AdminMetricCard
          v-for="card in statusCards"
          :key="card.label"
          :label="card.label"
          :value="card.value"
          :icon="card.icon"
          :tone="card.tone"
          :hint="card.hint"
        />
      </div>

      <div>

      <!-- General Tab -->
      <template v-if="activeTab === 'general'">
        <AdminPanel title="Site Identity" description="Core public metadata and display options." icon="i-heroicons-globe-alt">
          <div class="space-y-5">
            <div class="admin-form-grid admin-form-grid--2">
              <div class="admin-field">
                <label class="admin-field__label">Site name</label>
                <UInput v-model="form.site_name" :disabled="saving" placeholder="MagguuUI" />
              </div>

              <div class="admin-field">
                <label class="admin-field__label">Description</label>
                <UInput v-model="form.site_description" :disabled="saving" placeholder="World of Warcraft UI Configuration" />
              </div>
            </div>

            <div class="admin-field">
              <label class="admin-field__label">Banner text</label>
              <UInput v-model="form.banner_text" :disabled="saving" placeholder="New update is live" />
            </div>

            <div v-if="form.banner_text" class="admin-inline-note">
              <UIcon name="i-heroicons-megaphone" class="h-4 w-4 text-blue-500" />
              <span class="text-sm text-slate-600 dark:text-slate-400">{{ form.banner_text }}</span>
            </div>

            <div class="admin-switch-row">
              <div class="admin-switch-row__content">
                <p class="admin-switch-row__title">Maintenance mode</p>
                <p class="admin-switch-row__description">Shows a maintenance banner on the public site.</p>
              </div>
              <USwitch
                :model-value="form.maintenance_mode === 'true'"
                :disabled="saving"
                @update:model-value="form.maintenance_mode = $event ? 'true' : 'false'"
              />
            </div>
          </div>
        </AdminPanel>

        <AdminPanel title="Legal & Contact" description="Imprint details and contact information." icon="i-heroicons-identification">
          <div class="space-y-4">
            <div class="admin-field">
              <label class="admin-field__label">Contact email</label>
              <UInput v-model="form.contact_email" :disabled="saving" placeholder="contact@magguui.com" />
            </div>

            <div class="admin-form-grid admin-form-grid--2">
              <div class="admin-field">
                <label class="admin-field__label">Imprint name</label>
                <UInput v-model="form.imprint_name" :disabled="saving" placeholder="Your legal name" />
              </div>

              <div class="admin-field">
                <label class="admin-field__label">Country</label>
                <UInput v-model="form.imprint_country" :disabled="saving" placeholder="Germany" />
              </div>
            </div>

            <div class="admin-field">
              <label class="admin-field__label">Street</label>
              <UInput v-model="form.imprint_street" :disabled="saving" placeholder="Street and house number" />
            </div>

            <div class="admin-field">
              <label class="admin-field__label">City / postal code</label>
              <UInput v-model="form.imprint_city" :disabled="saving" placeholder="12345 City" />
            </div>
          </div>
        </AdminPanel>
      </template>

      <!-- SEO & Links Tab -->
      <template v-else-if="activeTab === 'seo'">
        <AdminPanel title="SEO" description="Search engine and social sharing metadata." icon="i-heroicons-magnifying-glass">
          <div class="space-y-4">
            <div class="admin-field">
              <label class="admin-field__label">Meta title</label>
              <UInput v-model="form.meta_title" :disabled="saving" placeholder="MagguuUI - WoW UI Profiles" />
              <p class="admin-field__hint" :class="counterClass(form.meta_title?.length || 0, 70)">
                {{ form.meta_title?.length || 0 }}/70
              </p>
            </div>

            <div class="admin-field">
              <label class="admin-field__label">Meta description</label>
              <UTextarea v-model="form.meta_description" :disabled="saving" :rows="3" placeholder="High-quality import strings..." />
              <p class="admin-field__hint" :class="counterClass(form.meta_description?.length || 0, 160)">
                {{ form.meta_description?.length || 0 }}/160
              </p>
            </div>

            <div class="admin-field">
              <label class="admin-field__label">OG image URL</label>
              <UInput v-model="form.og_image_url" :disabled="saving" placeholder="https://ui.magguu.xyz/og-image.png" />
            </div>
          </div>
        </AdminPanel>

        <AdminPanel title="Links" description="Outbound links shown in the public footer and about page." icon="i-heroicons-link">
          <div class="space-y-3">
            <div v-for="link in linkFields" :key="link.key" class="admin-field">
              <label class="admin-field__label">{{ link.label }}</label>
              <div class="flex items-center gap-2">
                <UInput v-model="(form as any)[link.key]" :disabled="saving" :placeholder="link.placeholder" class="flex-1" />
                <UButton
                  v-if="(form as any)[link.key]"
                  :href="(form as any)[link.key]"
                  target="_blank"
                  icon="i-heroicons-arrow-top-right-on-square"
                  color="neutral"
                  variant="ghost"
                  size="sm"
                />
              </div>
            </div>
          </div>
        </AdminPanel>
      </template>

      <!-- Security Tab -->
      <template v-else-if="activeTab === 'security'">
        <AdminPanel title="Access" description="Session, login and lockout defaults." icon="i-heroicons-shield-check">
          <div class="space-y-4">
            <div class="admin-field">
              <label class="admin-field__label">Session timeout</label>
              <USelect v-model="form.session_timeout_hours" :items="sessionTimeoutOptions" value-key="value" :disabled="saving" />
            </div>

            <div class="admin-field">
              <label class="admin-field__label">Max login attempts</label>
              <USelect v-model="form.max_login_attempts" :items="loginAttemptOptions" value-key="value" :disabled="saving" />
            </div>

            <div class="admin-field">
              <label class="admin-field__label">Lockout duration</label>
              <USelect v-model="form.lockout_duration_minutes" :items="lockoutOptions" value-key="value" :disabled="saving" />
            </div>

            <div class="admin-inline-note">
              <UIcon name="i-heroicons-information-circle" class="h-4 w-4 text-amber-500" />
              <span class="text-sm text-slate-600 dark:text-slate-400">
                After {{ form.max_login_attempts }} failed attempts, the account locks for {{ form.lockout_duration_minutes }} minutes.
              </span>
            </div>
          </div>
        </AdminPanel>

        <AdminPanel title="Tracking" description="Tracking and analytics should stay explicit." icon="i-heroicons-bolt">
          <div class="space-y-3">
            <div class="admin-switch-row">
              <div class="admin-switch-row__content">
                <p class="admin-switch-row__title">Page view tracking</p>
                <p class="admin-switch-row__description">Anonymous traffic collection for analytics.</p>
              </div>
              <USwitch
                :model-value="form.tracking_pageviews_enabled === 'true'"
                :disabled="saving"
                @update:model-value="form.tracking_pageviews_enabled = $event ? 'true' : 'false'"
              />
            </div>

            <div class="admin-switch-row">
              <div class="admin-switch-row__content">
                <p class="admin-switch-row__title">Copy tracking</p>
                <p class="admin-switch-row__description">Tracks string copy events for demand signals.</p>
              </div>
              <USwitch
                :model-value="form.tracking_copyevents_enabled === 'true'"
                :disabled="saving"
                @update:model-value="form.tracking_copyevents_enabled = $event ? 'true' : 'false'"
              />
            </div>
          </div>
        </AdminPanel>
      </template>

      <!-- Ads Tab -->
      <template v-else-if="activeTab === 'ads'">
        <AdminPanel title="Google AdSense" description="Manage ad placements and revenue settings." icon="i-heroicons-megaphone">
          <div class="space-y-5">
            <div class="admin-switch-row">
              <div class="admin-switch-row__content">
                <p class="admin-switch-row__title">Enable ads</p>
                <p class="admin-switch-row__description">Show Google AdSense ads on public pages.</p>
              </div>
              <USwitch
                :model-value="form.adsense_enabled === 'true'"
                :disabled="saving"
                @update:model-value="form.adsense_enabled = $event ? 'true' : 'false'"
              />
            </div>

            <div class="admin-field">
              <label class="admin-field__label">Publisher ID</label>
              <UInput v-model="form.adsense_publisher_id" :disabled="saving" placeholder="ca-pub-XXXXXXXXXXXXXXXX" />
              <p class="admin-field__hint">Your Google AdSense publisher ID. Found in your AdSense dashboard.</p>
            </div>
          </div>
        </AdminPanel>

        <AdminPanel title="Ad Slots" description="Paste the slot IDs from your AdSense ad units." icon="i-heroicons-rectangle-group">
          <div class="space-y-5">
            <div class="admin-field">
              <label class="admin-field__label">Header slot</label>
              <UInput v-model="form.adsense_slot_header" :disabled="saving" placeholder="1234567890" />
              <p class="admin-field__hint">Shown above the main content on public pages.</p>
            </div>

            <div class="admin-field">
              <label class="admin-field__label">Content slot</label>
              <UInput v-model="form.adsense_slot_content" :disabled="saving" placeholder="1234567890" />
              <p class="admin-field__hint">Shown between content sections (e.g. below strings, in guides).</p>
            </div>

            <div class="admin-field">
              <label class="admin-field__label">Footer slot</label>
              <UInput v-model="form.adsense_slot_footer" :disabled="saving" placeholder="1234567890" />
              <p class="admin-field__hint">Shown above the footer on all public pages.</p>
            </div>
          </div>
        </AdminPanel>

        <div v-if="form.adsense_enabled === 'true' && !form.adsense_publisher_id" class="admin-inline-note">
          <UIcon name="i-heroicons-exclamation-triangle" class="h-4 w-4 text-amber-500" />
          <span class="text-sm text-slate-600 dark:text-slate-400">
            Ads are enabled but no publisher ID is set. Ads won't show until a valid publisher ID is configured.
          </span>
        </div>
      </template>

      <!-- Data & Backup Tab -->
      <template v-else>
        <AdminPanel title="Retention" description="How long operational data is kept." icon="i-heroicons-archive-box">
          <div class="admin-field">
            <label class="admin-field__label">Data retention</label>
            <USelect v-model="form.data_retention_days" :items="retentionOptions" value-key="value" :disabled="saving" />
          </div>
        </AdminPanel>

        <AdminPanel title="Database" description="Current runtime and backup controls." icon="i-heroicons-circle-stack">
          <div class="grid gap-3 sm:grid-cols-2">
            <div v-for="detail in systemDetails" :key="detail.label" class="admin-subpanel">
              <p class="admin-row__eyebrow">{{ detail.label }}</p>
              <p class="mt-2 text-sm font-semibold text-slate-950 dark:text-white">{{ detail.value }}</p>
            </div>
          </div>

          <div v-if="sysInfo?.database?.tables" class="mt-5 grid gap-3 sm:grid-cols-2">
            <div v-for="(count, table) in dbTableDisplay" :key="table" class="admin-subpanel">
              <p class="admin-row__eyebrow">{{ table }}</p>
              <p class="mt-2 text-xl font-semibold tracking-tight text-slate-950 dark:text-white">{{ count }}</p>
            </div>
          </div>

          <template #footer>
            <UButton variant="subtle" icon="i-heroicons-arrow-down-tray" :loading="downloadingBackup" @click="downloadBackup">
              Download Backup
            </UButton>
          </template>
        </AdminPanel>

        <AdminPanel title="Reset" description="Only use this if the configuration has drifted too far." icon="i-heroicons-exclamation-triangle">
          <div class="admin-inline-note">
            <UIcon name="i-heroicons-exclamation-triangle" class="h-4 w-4 text-red-500" />
            <span class="text-sm text-slate-600 dark:text-slate-400">
              Reset restores the defaults locally. You still need to save before anything changes on the server.
            </span>
          </div>

          <template #footer>
            <UButton color="error" variant="subtle" icon="i-heroicons-arrow-path" @click="resetModal = true">
              Reset to Defaults
            </UButton>
          </template>
        </AdminPanel>
      </template>
      </div>
    </template>

    <UModal v-model:open="resetModal">
      <template #content>
        <div class="p-6">
          <div class="flex items-start gap-4">
            <div class="admin-empty-state__icon admin-tone-danger h-10 w-10">
              <UIcon name="i-heroicons-exclamation-triangle" class="h-5 w-5" />
            </div>

            <div>
              <h2 class="text-lg font-semibold text-slate-950 dark:text-white">Reset all settings?</h2>
              <p class="mt-2 text-sm text-slate-500 dark:text-slate-400">
                This restores the defaults locally. Save afterwards if you want to apply them.
              </p>
            </div>
          </div>

          <div class="mt-6 flex justify-end gap-3 border-t border-slate-200 pt-4 dark:border-white/8">
            <UButton variant="ghost" color="neutral" @click="resetModal = false">Cancel</UButton>
            <UButton color="error" icon="i-heroicons-arrow-path" @click="doReset">Reset</UButton>
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import { SITE_SETTINGS_DEFAULTS } from '~/utils/siteSettingsDefaults'

definePageMeta({ layout: "admin" })

const toast = useToast()
const { apiFetch } = useApi()

const loading = ref(true)
const saving = ref(false)
const resetModal = ref(false)
const downloadingBackup = ref(false)
const sysInfo = ref<any>(null)

type TabId = 'general' | 'seo' | 'security' | 'ads' | 'data'

const route = useRoute()
const validTabs: TabId[] = ['general', 'seo', 'security', 'ads', 'data']
const activeTab = ref<TabId>(validTabs.includes(route.query.tab as TabId) ? route.query.tab as TabId : 'general')
const isDark = useIsDark()

watch(() => route.query.tab, (tab) => {
  if (validTabs.includes(tab as TabId)) activeTab.value = tab as TabId
})
const tabs: Array<{ id: TabId; label: string; icon: string }> = [
  { id: 'general', label: 'General', icon: 'i-heroicons-cog-6-tooth' },
  { id: 'seo', label: 'SEO & Links', icon: 'i-heroicons-globe-alt' },
  { id: 'security', label: 'Security', icon: 'i-heroicons-shield-check' },
  { id: 'ads', label: 'Ads', icon: 'i-heroicons-megaphone' },
  { id: 'data', label: 'Data & Backup', icon: 'i-heroicons-circle-stack' },
]

const statusCards = computed(() => [
  { label: "Version", value: sysInfo.value?.app?.version || "-", icon: "i-heroicons-server-stack", tone: "brand" as const, hint: "Current app version" },
  { label: "Uptime", value: sysInfo.value?.app?.uptimeFormatted || "-", icon: "i-heroicons-clock", tone: "success" as const, hint: "Server availability" },
  { label: "Database", value: sysInfo.value?.database?.sizeFormatted || "-", icon: "i-heroicons-circle-stack", tone: "violet" as const, hint: "Current DB size" },
  { label: "Sessions", value: sysInfo.value?.activeSessions || 0, icon: "i-heroicons-user-group", tone: "warning" as const, hint: "Active admin sessions" },
])

const systemDetails = computed(() => [
  { label: "Node.js", value: sysInfo.value?.app?.nodeVersion || "-" },
  { label: "Platform", value: sysInfo.value?.app?.platform || "-" },
  { label: "DB Size", value: sysInfo.value?.database?.sizeFormatted || "-" },
])

const sessionTimeoutOptions = [
  { label: "12 hours", value: "12" },
  { label: "24 hours", value: "24" },
  { label: "48 hours", value: "48" },
  { label: "7 days", value: "168" },
]

const loginAttemptOptions = [
  { label: "5 attempts", value: "5" },
  { label: "10 attempts", value: "10" },
  { label: "15 attempts", value: "15" },
  { label: "20 attempts", value: "20" },
]

const lockoutOptions = [
  { label: "15 minutes", value: "15" },
  { label: "30 minutes", value: "30" },
  { label: "1 hour", value: "60" },
  { label: "2 hours", value: "120" },
]

const retentionOptions = [
  { label: "30 days", value: "30" },
  { label: "60 days", value: "60" },
  { label: "90 days", value: "90" },
  { label: "180 days", value: "180" },
]

const linkFields = [
  { key: "github_url", label: "GitHub", placeholder: "https://github.com/Derpsen/MagguuUI" },
  { key: "discord_url", label: "Discord", placeholder: "https://discord.gg/..." },
  { key: "curseforge_url", label: "CurseForge", placeholder: "https://www.curseforge.com/wow/addons/..." },
]

const defaults: Record<string, string> = { ...SITE_SETTINGS_DEFAULTS }

const form = reactive({ ...defaults })
const original = ref({ ...defaults })
const hasChanges = computed(() => Object.keys(form).some(key => (form as any)[key] !== (original.value as any)[key]))

const dbTableDisplay = computed(() => {
  if (!sysInfo.value?.database?.tables) return {}
  const tables = sysInfo.value.database.tables
  return {
    Profiles: tables.profiles,
    WowUp: tables.wowupStrings,
    Layouts: tables.characterLayouts,
    Changelogs: tables.changelogs,
    Users: tables.users,
    Sessions: tables.sessions,
    Passkeys: tables.passkeys,
    Views: tables.pageViews,
  }
})

function counterClass(value: number, max: number) {
  return value > max ? "text-amber-500" : "text-slate-400 dark:text-slate-500"
}

async function loadSystemInfo() {
  try {
    sysInfo.value = await apiFetch("/api/v1/admin/system/info")
  } catch {
    sysInfo.value = null
  }
}

async function load() {
  loading.value = true

  try {
    const [data] = await Promise.all([
      apiFetch<Record<string, string>>("/api/v1/admin/settings"),
      loadSystemInfo(),
    ])

    if (data) {
      for (const [key, value] of Object.entries(data)) {
        if (key in form) (form as any)[key] = value
      }

      original.value = { ...form }
    }
  } catch {
    // Ignore and keep defaults.
  } finally {
    loading.value = false
  }
}

async function save() {
  saving.value = true

  try {
    await apiFetch("/api/v1/admin/settings", { method: "PUT", body: { ...form } })
    original.value = { ...form }
    toast.add({ title: "Settings saved", color: "success", icon: "i-heroicons-check-circle" })
  } catch (error: any) {
    toast.add({ title: error?.data?.message || "Error", color: "error", icon: "i-heroicons-x-circle" })
  } finally {
    saving.value = false
  }
}

function doReset() {
  Object.assign(form, { ...defaults })
  resetModal.value = false
  toast.add({ title: "Settings reset - save to apply", color: "warning", icon: "i-heroicons-arrow-path" })
}

async function downloadBackup() {
  downloadingBackup.value = true

  try {
    const response = await fetch("/api/v1/admin/system/db-backup", {
      credentials: "include",
    })

    if (!response.ok) throw new Error("Download failed")

    const blob = await response.blob()
    const url = window.URL.createObjectURL(blob)
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.download = response.headers.get("content-disposition")?.match(/filename="(.+)"/)?.[1] || "magguuui-backup.db"
    document.body.appendChild(anchor)
    anchor.click()
    window.URL.revokeObjectURL(url)
    anchor.remove()
    toast.add({ title: "Backup downloaded", color: "success", icon: "i-heroicons-arrow-down-tray" })
  } catch {
    toast.add({ title: "Backup failed", color: "error", icon: "i-heroicons-x-circle" })
  } finally {
    downloadingBackup.value = false
  }
}

onMounted(load)

onBeforeRouteLeave((_to, _from, next) => {
  if (hasChanges.value) {
    next(window.confirm("You have unsaved changes. Leave anyway?"))
    return
  }

  next()
})
</script>

<!--
  Strings Page — Browse/copy import strings + inline edit for admins
-->

<template>
  <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
    <div class="text-center mb-12 fade-in heading-glow">
      <h1 class="text-4xl sm:text-5xl font-bold mb-4 flex items-center justify-center gap-3">
        <svg aria-hidden="true" class="w-8 h-8 text-brand-400 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
          <path d="M13 2L4.09 12.11A1 1 0 005 14h6v6a1 1 0 001.91.59l8.91-10.11A1 1 0 0021 8.89h-6V3a1 1 0 00-1.91-.59L13 2z" />
        </svg>
        <span class="text-gradient">Import Strings</span>
      </h1>
      <p class="text-lg" :class="isDark ? 'text-silver-500' : 'text-gray-500'">{{ tabSubtitle }}</p>
    </div>

    <details class="glass-card rounded-2xl p-5 sm:p-6 mb-6 fade-in fade-in-delay-1 group">
      <summary class="flex items-center justify-between cursor-pointer text-sm font-semibold list-none">
        <span class="flex items-center gap-2" :class="isDark ? 'text-white' : 'text-gray-900'">
          <svg aria-hidden="true" class="w-4 h-4 text-brand-400 flex-shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
          </svg>
          New here? What is an import string?
        </span>
        <svg aria-hidden="true" class="w-4 h-4 transition-transform group-open:rotate-180" :class="isDark ? 'text-silver-400' : 'text-gray-400'" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </summary>
      <div class="mt-4 space-y-3 text-sm leading-relaxed" :class="isDark ? 'text-silver-400' : 'text-gray-600'">
        <p>
          An <strong :class="isDark ? 'text-white' : 'text-gray-900'">import string</strong> is a short text snippet that
          contains a complete addon configuration. You copy it from here, paste it into the addon's import window in
          WoW, and the addon recreates the exact setup it describes.
        </p>
        <p>
          <strong :class="isDark ? 'text-white' : 'text-gray-900'">You usually do not need this page.</strong>
          The <NuxtLink to="/guide" class="text-brand-400 hover:underline">MagguuUI in-game installer</NuxtLink>
          imports all of these for you with one click. This page exists as a backup if you ever want to import a single
          profile by hand, share one with a friend, or check what is currently shipped.
        </p>
        <p>
          <strong :class="isDark ? 'text-white' : 'text-gray-900'">How to use a string manually:</strong>
          pick the addon below, click <em>Copy String</em>, then in WoW open the addon's settings, find its
          <em>Import Profile</em> dialog (most addons have one), paste, and confirm.
        </p>
      </div>
    </details>

    <div class="glass-card rounded-2xl p-6 sm:p-8 fade-in fade-in-delay-1">
      <!-- Tabs -->
      <div class="flex flex-wrap justify-center gap-2 mb-6" role="tablist" aria-label="Import string categories">
        <button v-for="tab in tabs" :key="tab.value"
          role="tab"
          :id="`tab-${tab.value}`"
          :aria-selected="activeTab === tab.value"
          :aria-controls="`tabpanel-${tab.value}`"
          class="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all"
          :class="activeTab === tab.value ? 'tab-active' : 'tab-inactive'"
          @click="activeTab = tab.value">
          {{ tab.label }}
          <span v-if="tab.count > 0" class="badge-count" :class="activeTab === tab.value ? 'badge-count-active' : 'badge-count-inactive'">{{ tab.count }}</span>
        </button>
      </div>

      <!-- ═══ Cooldown Layouts ═══ -->
      <div v-if="activeTab === 'layouts'" role="tabpanel" id="tabpanel-layouts" aria-labelledby="tab-layouts" tabindex="0">
        <div v-if="layoutList.length" class="space-y-5">
          <div>
            <label class="block text-xs font-semibold uppercase tracking-wider mb-2.5" :class="isDark ? 'text-silver-500' : 'text-gray-500'">Class</label>
            <select v-model="selectedClass" class="select-styled w-full px-4 py-3.5 rounded-xl text-base cursor-pointer" :class="isDark ? 'text-white' : 'text-gray-900'">
              <option v-for="cls in layoutClasses" :key="cls" :value="cls">{{ cls }}</option>
            </select>
          </div>
          <Transition enter-active-class="transition duration-200 ease-out" enter-from-class="opacity-0 translate-y-1" enter-to-class="opacity-100 translate-y-0">
            <div v-if="selectedClass">
              <label class="block text-xs font-semibold uppercase tracking-wider mb-2.5" :class="isDark ? 'text-silver-500' : 'text-gray-500'">Specialization</label>
              <select v-model="selectedSpec" class="select-styled w-full px-4 py-3.5 rounded-xl text-base cursor-pointer" :class="isDark ? 'text-white' : 'text-gray-900'">
                <option v-for="spec in layoutSpecs" :key="spec" :value="spec">{{ spec }}</option>
              </select>
            </div>
          </Transition>
          <Transition enter-active-class="transition duration-300 ease-out" enter-from-class="opacity-0 translate-y-2" enter-to-class="opacity-100 translate-y-0">
            <div v-if="selectedLayout" class="space-y-4 pt-1">
              <div class="flex gap-2">
                <button class="flex-1 py-4 rounded-xl text-white font-semibold text-lg transition-all flex items-center justify-center gap-2"
                  :class="layoutCopied ? 'btn-gradient-green' : 'btn-gradient'" @click="copyLayout">
                  <svg aria-hidden="true" class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M13 2L4.09 12.11A1 1 0 005 14h6v6a1 1 0 001.91.59l8.91-10.11A1 1 0 0021 8.89h-6V3a1 1 0 00-1.91-.59L13 2z" /></svg>
                  {{ layoutCopied ? 'Copied!' : 'Copy String' }}
                </button>
                <button v-if="isLoggedIn" class="px-4 py-4 rounded-xl transition-all flex items-center justify-center"
                  :class="isDark ? 'bg-white/5 hover:bg-white/10 text-silver-400 hover:text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-900'"
                  aria-label="Edit layout"
                  @click="editLayout(selectedLayout)">
                  <svg aria-hidden="true" class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" /></svg>
                </button>
              </div>
              <div class="flex items-center justify-between text-xs" :class="isDark ? 'text-silver-600' : 'text-gray-400'">
                <div class="flex items-center gap-3">
                  <span v-if="selectedLayout.updatedAt">{{ timeAgo(selectedLayout.updatedAt) }}</span>
                  <kbd class="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-mono" :class="isDark ? 'bg-white/5 text-silver-600 border border-brand-400/10' : 'bg-gray-100 text-gray-400 border border-gray-200'">{{ isMac ? '⌘' : 'Ctrl' }}+C</kbd>
                </div>
                <span class="inline-flex items-center gap-1.5">
                  <span class="inline-block w-1.5 h-1.5 rounded-full" :class="stringSizeColor(selectedLayout.importString?.length || 0)" />
                  {{ stringSizeLabel(selectedLayout.importString?.length || 0) }}
                </span>
              </div>
              <div class="string-preview string-preview-fade rounded-xl p-4 max-h-24">
                <p class="text-xs font-mono break-all leading-relaxed" :class="isDark ? 'text-silver-600' : 'text-gray-400'">
                  {{ selectedLayout.importString?.substring(0, 200) }}{{ (selectedLayout.importString?.length || 0) > 200 ? '...' : '' }}
                </p>
              </div>
            </div>
          </Transition>
        </div>
        <div v-else class="text-center py-16">
          <svg aria-hidden="true" class="w-12 h-12 mx-auto mb-4" :class="isDark ? 'text-silver-700/50' : 'text-gray-300'" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
          </svg>
          <p :class="isDark ? 'text-silver-600' : 'text-gray-400'">No layouts available yet.</p>
        </div>
      </div>

      <!-- ═══ Addon Profiles ═══ -->
      <div v-if="activeTab === 'profiles'" role="tabpanel" id="tabpanel-profiles" aria-labelledby="tab-profiles" tabindex="0">
        <div v-if="profileList.length" class="space-y-5">
          <div>
            <label class="block text-xs font-semibold uppercase tracking-wider mb-2.5" :class="isDark ? 'text-silver-500' : 'text-gray-500'">Addon</label>
            <select v-model="selectedAddon" class="select-styled w-full px-4 py-3.5 rounded-xl text-base cursor-pointer" :class="isDark ? 'text-white' : 'text-gray-900'">
              <option v-for="addon in profileAddons" :key="addon" :value="addon">{{ addon }}</option>
            </select>
          </div>
          <Transition enter-active-class="transition duration-200 ease-out" enter-from-class="opacity-0 translate-y-1" enter-to-class="opacity-100 translate-y-0">
            <div v-if="selectedAddon">
              <label class="block text-xs font-semibold uppercase tracking-wider mb-2.5" :class="isDark ? 'text-silver-500' : 'text-gray-500'">Profile</label>
              <select v-model="selectedProfileId" class="select-styled w-full px-4 py-3.5 rounded-xl text-base cursor-pointer" :class="isDark ? 'text-white' : 'text-gray-900'">
                <option v-for="p in addonProfiles" :key="p.id" :value="p.id">{{ p.profile }}</option>
              </select>
            </div>
          </Transition>
          <Transition enter-active-class="transition duration-300 ease-out" enter-from-class="opacity-0 translate-y-2" enter-to-class="opacity-100 translate-y-0">
            <div v-if="selectedProfile" class="space-y-4 pt-1">
              <div class="flex gap-2">
                <button class="flex-1 py-4 rounded-xl text-white font-semibold text-lg transition-all flex items-center justify-center gap-2"
                  :class="profileCopied ? 'btn-gradient-green' : 'btn-gradient'" @click="copyProfile">
                  <svg aria-hidden="true" class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M13 2L4.09 12.11A1 1 0 005 14h6v6a1 1 0 001.91.59l8.91-10.11A1 1 0 0021 8.89h-6V3a1 1 0 00-1.91-.59L13 2z" /></svg>
                  {{ profileCopied ? 'Copied!' : 'Copy String' }}
                </button>
                <button v-if="isLoggedIn" class="px-4 py-4 rounded-xl transition-all flex items-center justify-center"
                  :class="isDark ? 'bg-white/5 hover:bg-white/10 text-silver-400 hover:text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-900'"
                  aria-label="Edit profile"
                  @click="editProfile(selectedProfile)">
                  <svg aria-hidden="true" class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" /></svg>
                </button>
              </div>
              <div class="flex items-center justify-between text-xs" :class="isDark ? 'text-silver-600' : 'text-gray-400'">
                <div class="flex items-center gap-3">
                  <span v-if="selectedProfile.updatedAt">{{ timeAgo(selectedProfile.updatedAt) }}</span>
                  <kbd class="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-mono" :class="isDark ? 'bg-white/5 text-silver-600 border border-brand-400/10' : 'bg-gray-100 text-gray-400 border border-gray-200'">{{ isMac ? '⌘' : 'Ctrl' }}+C</kbd>
                </div>
                <span class="inline-flex items-center gap-1.5">
                  <span class="inline-block w-1.5 h-1.5 rounded-full" :class="stringSizeColor(selectedProfile.string?.length || 0)" />
                  {{ stringSizeLabel(selectedProfile.string?.length || 0) }}
                </span>
              </div>
              <div class="string-preview string-preview-fade rounded-xl p-4 max-h-24">
                <p class="text-xs font-mono break-all leading-relaxed" :class="isDark ? 'text-silver-600' : 'text-gray-400'">
                  {{ selectedProfile.string?.substring(0, 200) }}{{ (selectedProfile.string?.length || 0) > 200 ? '...' : '' }}
                </p>
              </div>
            </div>
          </Transition>
        </div>
        <div v-else class="text-center py-16">
          <svg aria-hidden="true" class="w-12 h-12 mx-auto mb-4" :class="isDark ? 'text-silver-700/50' : 'text-gray-300'" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
          </svg>
          <p :class="isDark ? 'text-silver-600' : 'text-gray-400'">No addon profiles available yet.</p>
        </div>
      </div>

      <!-- ═══ WowUp ═══ -->
      <div v-if="activeTab === 'wowup'" role="tabpanel" id="tabpanel-wowup" aria-labelledby="tab-wowup" tabindex="0">
        <div v-if="wowupList.length" class="space-y-5">
          <div>
            <label class="block text-xs font-semibold uppercase tracking-wider mb-2.5" :class="isDark ? 'text-silver-500' : 'text-gray-500'">Package</label>
            <select v-model="selectedWowupName" class="select-styled w-full px-4 py-3.5 rounded-xl text-base cursor-pointer" :class="isDark ? 'text-white' : 'text-gray-900'">
              <option v-for="w in wowupList" :key="w.name" :value="w.name">{{ w.name }}</option>
            </select>
          </div>
          <Transition enter-active-class="transition duration-300 ease-out" enter-from-class="opacity-0 translate-y-2" enter-to-class="opacity-100 translate-y-0">
            <div v-if="selectedWowup" class="space-y-4 pt-1">
              <div class="flex gap-2">
                <button class="flex-1 py-4 rounded-xl text-white font-semibold text-lg transition-all flex items-center justify-center gap-2"
                  :class="wowupCopied ? 'btn-gradient-green' : 'btn-gradient'" @click="copyWowup">
                  <svg aria-hidden="true" class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M13 2L4.09 12.11A1 1 0 005 14h6v6a1 1 0 001.91.59l8.91-10.11A1 1 0 0021 8.89h-6V3a1 1 0 00-1.91-.59L13 2z" /></svg>
                  {{ wowupCopied ? 'Copied!' : 'Copy String' }}
                </button>
                <button v-if="isLoggedIn" class="px-4 py-4 rounded-xl transition-all flex items-center justify-center"
                  :class="isDark ? 'bg-white/5 hover:bg-white/10 text-silver-400 hover:text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-900'"
                  aria-label="Edit WowUp package"
                  @click="editWowup(selectedWowup)">
                  <svg aria-hidden="true" class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" /></svg>
                </button>
              </div>
              <div class="flex items-center justify-between text-xs" :class="isDark ? 'text-silver-600' : 'text-gray-400'">
                <kbd class="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-mono" :class="isDark ? 'bg-white/5 text-silver-600 border border-brand-400/10' : 'bg-gray-100 text-gray-400 border border-gray-200'">{{ isMac ? '⌘' : 'Ctrl' }}+C</kbd>
                <span class="inline-flex items-center gap-1.5">
                  <span class="inline-block w-1.5 h-1.5 rounded-full" :class="stringSizeColor(selectedWowup.string?.length || 0)" />
                  {{ stringSizeLabel(selectedWowup.string?.length || 0) }}
                </span>
              </div>
              <div class="string-preview string-preview-fade rounded-xl p-4 max-h-24">
                <p class="text-xs font-mono break-all leading-relaxed" :class="isDark ? 'text-silver-600' : 'text-gray-400'">
                  {{ selectedWowup.string?.substring(0, 200) }}{{ (selectedWowup.string?.length || 0) > 200 ? '...' : '' }}
                </p>
              </div>
            </div>
          </Transition>
        </div>
        <div v-else class="text-center py-16">
          <svg aria-hidden="true" class="w-12 h-12 mx-auto mb-4" :class="isDark ? 'text-silver-700/50' : 'text-gray-300'" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
          </svg>
          <p :class="isDark ? 'text-silver-600' : 'text-gray-400'">No WowUp strings available yet.</p>
        </div>
      </div>
    </div>

    <!-- ═══ Inline Edit Modal ═══ -->
    <UModal v-model:open="editModal" :ui="{ content: 'max-w-2xl' }" :title="'Edit'" aria-labelledby="edit-modal-title">
      <template #content>
        <div class="relative w-full rounded-2xl p-6 max-h-[90vh] overflow-y-auto"
          :class="isDark ? 'bg-brand-800 border border-brand-400/15' : 'bg-white shadow-2xl border border-gray-200'">
          <h2 id="edit-modal-title" class="text-lg font-semibold mb-6" :class="isDark ? 'text-white' : 'text-gray-900'">Edit</h2>
          <div class="space-y-4">
            <div v-if="editForm.type === 'profile'" class="grid grid-cols-2 gap-4">
              <div><label class="block text-sm font-medium mb-1.5" :class="isDark ? 'text-silver-300' : 'text-gray-700'">Addon</label>
                <input v-model="editForm.addon" class="w-full px-3 py-2 rounded-lg text-sm" :class="inputClass" /></div>
              <div><label class="block text-sm font-medium mb-1.5" :class="isDark ? 'text-silver-300' : 'text-gray-700'">Profile Name</label>
                <input v-model="editForm.profile" class="w-full px-3 py-2 rounded-lg text-sm" :class="inputClass" /></div>
            </div>
            <div v-if="editForm.type === 'wowup'">
              <label class="block text-sm font-medium mb-1.5" :class="isDark ? 'text-silver-300' : 'text-gray-700'">Name</label>
              <input v-model="editForm.name" class="w-full px-3 py-2 rounded-lg text-sm" :class="inputClass" />
            </div>
            <div v-if="editForm.type === 'layout'" class="grid grid-cols-2 gap-4">
              <div><label class="block text-sm font-medium mb-1.5" :class="isDark ? 'text-silver-300' : 'text-gray-700'">Class</label>
                <input v-model="editForm.className" class="w-full px-3 py-2 rounded-lg text-sm" :class="inputClass" /></div>
              <div><label class="block text-sm font-medium mb-1.5" :class="isDark ? 'text-silver-300' : 'text-gray-700'">Specialization</label>
                <input v-model="editForm.spec" class="w-full px-3 py-2 rounded-lg text-sm" :class="inputClass" /></div>
            </div>
            <div>
              <label class="block text-sm font-medium mb-1.5" :class="isDark ? 'text-silver-300' : 'text-gray-700'">Import String</label>
              <textarea v-model="editForm.string" rows="8" class="w-full px-3 py-2 rounded-lg text-xs font-mono" :class="inputClass" />
            </div>
          </div>
          <div class="flex justify-end gap-3 mt-6 pt-4" :class="isDark ? 'border-t border-brand-400/10' : 'border-t border-gray-100'">
            <button class="btn-ghost" @click="editModal = false">Cancel</button>
            <button class="btn-primary" :disabled="editSaving" @click="saveEdit">
              {{ editSaving ? 'Loading...' : 'Save' }}
            </button>
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
const isDark = useIsDark()
const { isLoggedIn } = useAuth()
const { apiFetch } = useApi()
await usePublicPageSeo({
  title: 'Import Strings',
  description: 'Browse import strings, packages, and layouts for MagguuUI.',
  path: '/strings',
})

const inputClass = computed(() => isDark.value
  ? 'bg-brand-900/50 border border-brand-400/15 text-white focus:border-brand-400/30 focus:outline-none'
  : 'bg-gray-50 border border-gray-200 text-gray-900 focus:border-blue-300 focus:outline-none')

const route = useRoute()
const router = useRouter()

// Init from URL params
const activeTab = ref((route.query.tab as string) || 'layouts')

const tabSubtitle = computed(() => {
  switch (activeTab.value) {
    case 'layouts': return 'Choose your class and specialization to copy the import string.'
    case 'profiles': return 'Choose your addon and profile to copy the import string.'
    case 'wowup': return 'Choose a package to copy the WowUp import string.'
    default: return 'Choose your category and class to copy the import string.'
  }
})
const selectedClass = ref((route.query.class as string) || ''); const selectedSpec = ref((route.query.spec as string) || ''); const layoutCopied = ref(false)
const selectedAddon = ref((route.query.addon as string) || ''); const selectedProfileId = ref(''); const profileCopied = ref(false)
const selectedWowupName = ref(''); const wowupCopied = ref(false)

interface PublicProfile { id: number, profile: string, string: string, description?: string | null, [k: string]: unknown }
interface PublicLayout { id: number, name?: string, className?: string | null, spec?: string | null, importString?: string, description?: string | null, [k: string]: unknown }
interface PublicWowup { id: number, string: string, description?: string | null, [k: string]: unknown }
type ProfileGroupedPublic = Record<string, PublicProfile[]>
type WowupKeyedPublic = Record<string, PublicWowup>

const { data: profileData, refresh: refreshProfiles } = await useFetch<{ data: ProfileGroupedPublic }>('/api/v1/profiles')
const { data: wowupData, refresh: refreshWowup } = await useFetch<{ data: WowupKeyedPublic }>('/api/v1/wowup')
const { data: layoutData, refresh: refreshLayouts } = await useFetch<{ data: PublicLayout[] }>('/api/v1/layouts')

type FlatProfile = PublicProfile & { addon: string }

const profileList = computed<FlatProfile[]>(() => {
  const grouped = profileData.value?.data
  if (!grouped || typeof grouped !== 'object') return []
  const flat: FlatProfile[] = []
  for (const [addon, profiles] of Object.entries(grouped)) {
    for (const p of profiles) flat.push({ ...p, addon })
  }
  return flat
})
type FlatWowup = PublicWowup & { name: string }
const wowupList = computed<FlatWowup[]>(() => {
  const keyed = wowupData.value?.data
  if (!keyed || typeof keyed !== 'object') return []
  return Object.entries(keyed).map(([name, data]) => ({ name, ...data }))
})
const layoutList = computed<PublicLayout[]>(() => {
  const data = layoutData.value?.data
  return Array.isArray(data) ? data : []
})

const tabs = computed(() => [
  { label: 'Cooldown Layouts', value: 'layouts', count: layoutList.value.length },
  { label: 'Addon Profiles', value: 'profiles', count: profileList.value.length },
  { label: 'WowUp Import String', value: 'wowup', count: wowupList.value.length },
])

const layoutClasses = computed(() => [...new Set(layoutList.value.map(l => l.className).filter((c): c is string => Boolean(c)))].sort())
const layoutSpecs = computed(() => {
  if (!selectedClass.value) return []
  return [...new Set(layoutList.value.filter(l => l.className === selectedClass.value).map(l => l.spec).filter((s): s is string => Boolean(s)))].sort()
})
const selectedLayout = computed(() => {
  if (!selectedClass.value || !selectedSpec.value) return null
  return layoutList.value.find(l => l.className === selectedClass.value && l.spec === selectedSpec.value) ?? null
})
watch(() => selectedClass.value, () => { selectedSpec.value = '' ; nextTick(() => { if (layoutSpecs.value.length) selectedSpec.value = layoutSpecs.value[0] || '' }) })

const profileAddons = computed(() => [...new Set(profileList.value.map(p => p.addon))].sort())
const addonProfiles = computed(() => {
  if (!selectedAddon.value) return []
  return profileList.value.filter(p => p.addon === selectedAddon.value)
})
const selectedProfile = computed(() => {
  if (!selectedProfileId.value) return null
  return profileList.value.find(p => p.id === Number(selectedProfileId.value)) ?? null
})
watch(() => selectedAddon.value, () => { selectedProfileId.value = addonProfiles.value[0]?.id?.toString() || '' })
const selectedWowup = computed(() => {
  if (!selectedWowupName.value) return null
  return wowupList.value.find(w => w.name === selectedWowupName.value) ?? null
})

// Auto-select first item in each category (respect URL params)
watch(layoutClasses, (classes) => { if (classes.length && !selectedClass.value) selectedClass.value = classes[0] }, { immediate: true })
watch(profileAddons, (addons) => { if (addons.length && !selectedAddon.value) selectedAddon.value = addons[0] }, { immediate: true })
watch(wowupList, (list) => { if (list.length && !selectedWowupName.value) selectedWowupName.value = list[0].name }, { immediate: true })

// If ?addon= was in URL, auto-switch to profiles tab
onMounted(() => {
  if (route.query.addon && profileAddons.value.includes(route.query.addon as string)) {
    activeTab.value = 'profiles'
    selectedAddon.value = route.query.addon as string
  }
})

// Sync state → URL
function syncUrl() {
  const query: Record<string, string> = {}
  if (activeTab.value !== 'layouts') query.tab = activeTab.value
  if (activeTab.value === 'layouts') {
    if (selectedClass.value) query.class = selectedClass.value
    if (selectedSpec.value) query.spec = selectedSpec.value
  } else if (activeTab.value === 'profiles') {
    if (selectedAddon.value) query.addon = selectedAddon.value
  }
  router.replace({ query })
}
watch([activeTab, selectedClass, selectedSpec, selectedAddon], syncUrl)

function formatDate(d: string | number | null) {
  if (!d) return ''
  const date = typeof d === 'number' ? new Date(d * 1000) : new Date(d)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function timeAgo(d: string | number | null) {
  if (!d) return ''
  const date = typeof d === 'number' ? new Date(d * 1000) : new Date(d)
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
  if (seconds < 60) return 'Updated just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `Updated ${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `Updated ${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `Updated ${days}d ago`
  if (days < 30) return `Updated ${Math.floor(days / 7)}w ago`
  return `Updated ${formatDate(d)}`
}

function stringSizeLabel(len: number): string {
  if (len === 0) return '0 chars'
  if (len < 500) return `${len} chars (small)`
  if (len < 5000) return `${len} chars (medium)`
  return `${len} chars (large)`
}

function stringSizeColor(len: number): string {
  if (len < 500) return 'bg-green-400'
  if (len < 5000) return 'bg-amber-400'
  return 'bg-red-400'
}

const toast = useToast()
const isMac = ref(false)
function handleCopyShortcut(e: KeyboardEvent) {
  if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
    const selection = window.getSelection()?.toString()
    if (selection && selection.length > 0) return
    if (editModal.value) return

    e.preventDefault()
    if (activeTab.value === 'layouts' && selectedLayout.value?.importString) copyLayout()
    else if (activeTab.value === 'profiles' && selectedProfile.value?.string) copyProfile()
    else if (activeTab.value === 'wowup' && selectedWowup.value?.string) copyWowup()
  }
}

onMounted(() => {
  isMac.value = navigator.platform.toUpperCase().includes('MAC')
})

onMounted(() => {
  window.addEventListener('keydown', handleCopyShortcut)
})

onUnmounted(() => {
  if (import.meta.client) {
    window.removeEventListener('keydown', handleCopyShortcut)
  }
})

async function doCopy(text: string) { try { await navigator.clipboard.writeText(text); return true } catch { const el = document.createElement('textarea'); el.value = text; document.body.appendChild(el); el.select(); document.execCommand('copy'); document.body.removeChild(el); return true } }

function trackCopy(type: string, id: number) {
  $fetch('/api/v1/copy-event', { method: 'POST', body: { stringType: type, stringId: id } }).catch(() => {})
}

async function copyLayout() {
  if (!selectedLayout.value?.importString) return
  await doCopy(selectedLayout.value.importString)
  layoutCopied.value = true
  toast.add({ title: 'Copied!', icon: 'i-heroicons-check-circle', color: 'success', duration: 2000 })
  trackCopy('layout', selectedLayout.value.id)
  setTimeout(() => { layoutCopied.value = false }, 2000)
}
async function copyProfile() {
  if (!selectedProfile.value?.string) return
  await doCopy(selectedProfile.value.string)
  profileCopied.value = true
  toast.add({ title: 'Copied!', icon: 'i-heroicons-check-circle', color: 'success', duration: 2000 })
  trackCopy('profile', selectedProfile.value.id)
  setTimeout(() => { profileCopied.value = false }, 2000)
}
async function copyWowup() {
  if (!selectedWowup.value?.string) return
  await doCopy(selectedWowup.value.string)
  wowupCopied.value = true
  toast.add({ title: 'Copied!', icon: 'i-heroicons-check-circle', color: 'success', duration: 2000 })
  trackCopy('wowup', selectedWowup.value.id)
  setTimeout(() => { wowupCopied.value = false }, 2000)
}

// ─── Inline Edit ─────────────────────
const editModal = ref(false)
const editSaving = ref(false)
const editForm = reactive({ type: '' as 'profile' | 'wowup' | 'layout', id: 0, addon: '', profile: '', name: '', className: '', spec: '', string: '' })

function editProfile(p: FlatProfile) { Object.assign(editForm, { type: 'profile', id: p.id, addon: p.addon, profile: p.profile, string: p.string }); editModal.value = true }
function editWowup(w: FlatWowup) { Object.assign(editForm, { type: 'wowup', id: w.id, name: w.name, string: w.string }); editModal.value = true }
function editLayout(l: PublicLayout) { Object.assign(editForm, { type: 'layout', id: l.id, className: l.className || '', spec: l.spec || '', string: l.importString || '' }); editModal.value = true }

async function saveEdit() {
  editSaving.value = true
  try {
    if (editForm.type === 'profile') {
      await apiFetch(`/api/v1/admin/profiles/${editForm.id}`, { method: 'PUT', body: { addon: editForm.addon, profile: editForm.profile, string: editForm.string } })
      await refreshProfiles()
    } else if (editForm.type === 'wowup') {
      await apiFetch(`/api/v1/admin/wowup/${editForm.id}`, { method: 'PUT', body: { name: editForm.name, string: editForm.string } })
      await refreshWowup()
    } else if (editForm.type === 'layout') {
      await apiFetch(`/api/v1/admin/layouts/${editForm.id}`, { method: 'PUT', body: { className: editForm.className, spec: editForm.spec, importString: editForm.string } })
      await refreshLayouts()
    }
    editModal.value = false
  } catch { toast.add({ title: 'Error saving', color: 'error' }) }
  finally { editSaving.value = false }
}
</script>

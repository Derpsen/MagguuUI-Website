<!--
  Strings Page — Browse/copy import strings + inline edit for admins
-->

<template>
  <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
    <PublicSetupNav />

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
        <span class="strings-accordion-title flex items-center gap-2" :class="isDark ? 'text-white' : 'text-gray-900'">
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
          Open <code>/mui</code> and run Apply Magguu profiles from
          <NuxtLink to="/guide" class="text-brand-400 hover:underline">the installation guide</NuxtLink>.
          This page is a backup if you want to import a single profile by hand, share one, or check what is shipped.
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
      <div class="strings-sticky-tabs sticky z-30 flex flex-wrap justify-center gap-2 mb-6 py-2 -mx-2 px-2 rounded-xl backdrop-blur-md" role="tablist" aria-label="Import string categories" style="top: 8.5rem;">
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
            <div class="flex flex-wrap gap-2" role="listbox" aria-label="WoW classes">
              <button
                v-for="cls in layoutClasses"
                :key="cls"
                type="button"
                role="option"
                :aria-selected="selectedClass === cls"
                class="wow-class-chip"
                :class="selectedClass === cls ? 'is-active' : ''"
                @click="selectedClass = cls"
              >
                <img
                  v-if="wowClassIcon(cls)"
                  :src="wowClassIcon(cls)!"
                  :alt="''"
                  class="wow-class-chip__icon"
                  width="24"
                  height="24"
                  loading="lazy"
                />
                <span
                  v-else
                  class="wow-class-chip__icon inline-flex items-center justify-center text-[10px] font-bold"
                  :style="{ background: wowClassColor(cls) + '33', color: wowClassColor(cls) }"
                >{{ cls.slice(0, 2) }}</span>
                <span>{{ cls }}</span>
              </button>
            </div>
          </div>
          <Transition enter-active-class="transition duration-200 ease-out" enter-from-class="opacity-0 translate-y-1" enter-to-class="opacity-100 translate-y-0">
            <div v-if="selectedClass && layoutSpecs.length > 1">
              <label class="block text-xs font-semibold uppercase tracking-wider mb-2.5" :class="isDark ? 'text-silver-500' : 'text-gray-500'">Specialization</label>
              <div class="flex flex-wrap gap-2">
                <button
                  v-for="spec in layoutSpecs"
                  :key="spec"
                  type="button"
                  class="wow-class-chip"
                  :class="selectedSpec === spec ? 'is-active' : ''"
                  @click="selectedSpec = spec"
                >
                  <img
                    v-if="wowClassIcon(selectedClass)"
                    :src="wowClassIcon(selectedClass)!"
                    :alt="''"
                    class="wow-class-chip__icon"
                    width="24"
                    height="24"
                    loading="lazy"
                  />
                  <span>{{ selectedClass }} — {{ spec }}</span>
                </button>
              </div>
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
                <span>{{ stringSizeLabel(layoutSize(selectedLayout)) }}</span>
              </div>
              <div class="string-preview string-preview-fade rounded-xl p-4 max-h-24">
                <p class="text-xs font-mono break-all leading-relaxed" :class="isDark ? 'text-silver-600' : 'text-gray-400'">
                  {{ layoutPreview(selectedLayout) }}{{ layoutShowsEllipsis(selectedLayout) ? '...' : '' }}
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
              <option v-for="addon in profileAddons" :key="addon" :value="addon">{{ profileAddonLabel(addon) }}</option>
            </select>
          </div>
          <Transition enter-active-class="transition duration-200 ease-out" enter-from-class="opacity-0 translate-y-1" enter-to-class="opacity-100 translate-y-0">
            <div v-if="selectedAddon && addonProfiles.length > 1">
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
                <span>{{ stringSizeLabel(profileSize(selectedProfile)) }}</span>
              </div>
              <div class="string-preview string-preview-fade rounded-xl p-4 max-h-24">
                <p class="text-xs font-mono break-all leading-relaxed" :class="isDark ? 'text-silver-600' : 'text-gray-400'">
                  {{ profilePreview(selectedProfile) }}{{ profileShowsEllipsis(selectedProfile) ? '...' : '' }}
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
        <div class="mb-5 rounded-xl border px-4 py-3 text-sm leading-relaxed"
          :class="isDark ? 'border-brand-400/15 bg-brand-400/5 text-silver-400' : 'border-brand-100 bg-brand-50 text-gray-600'">
          Same packs Magguu Setup copies. Paste in WowUp — MagguuUI does not install addons. Optional chat addon is <strong :class="isDark ? 'text-white' : 'text-gray-900'">Whisper Messenger</strong> (not WIM).
        </div>
        <div v-if="wowupList.length" class="space-y-5">
          <SupportedAddonsDropdown
            :groups="wowupPackGroups"
            :selected-key="selectedWowupName"
            placeholder="Choose WowUp pack"
            @select="onWowupPackSelect"
          />
          <Transition enter-active-class="transition duration-300 ease-out" enter-from-class="opacity-0 translate-y-2" enter-to-class="opacity-100 translate-y-0">
            <div v-if="selectedWowup" class="space-y-4 pt-1">
              <div>
                <p class="section-eyebrow mb-2.5">{{ wowupLabel(selectedWowup.name) }}</p>
                <SupportedAddonsDropdown
                  :groups="selectedWowupAddonGroups"
                  placeholder="Addons in this pack"
                />
              </div>
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
                <span>{{ stringSizeLabel(selectedWowup.string?.length || 0) }}</span>
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
import { wowClassIcon, wowClassColor } from '~/utils/wowClassIcons'
import {
  displayAddonName,
  emojiForAddonName,
  groupAddonChips,
  parseWowupAddonNames,
  wowupLabel,
  type AddonGroupKey,
} from '~/utils/addonChipMeta'
import { compareProfileAddons, compareProfileNames, profileAddonLabel } from '~/utils/profileLabels'
import { initialStringsTab, queryFromStringsState, queryText } from '~/utils/stringsDeepLink'

const isDark = useIsDark()
const { isLoggedIn } = useAuth()
const { apiFetch } = useApi()
usePublicPageSeo({
  title: 'Import Strings',
  description: 'Browse Magguu profiles and Cooldown Viewer layouts. WowUp chat is Whisper Messenger (not WIM). WIM stays a companion import.',
  path: '/strings',
})

const inputClass = computed(() => isDark.value
  ? 'bg-brand-900/50 border border-brand-400/15 text-white focus:border-brand-400/30 focus:outline-none'
  : 'bg-gray-50 border border-gray-200 text-gray-900 focus:border-brand-300 focus:outline-none')

const route = useRoute()
const router = useRouter()

const activeTab = ref(initialStringsTab(route.query))

const tabSubtitle = computed(() => {
  switch (activeTab.value) {
    case 'layouts': return 'Pick your class, then copy the Cooldown Viewer layout (Magguu - Class Spec).'
    case 'profiles': return 'Copy one Magguu profile. Apply Magguu profiles in /mui loads these when the addon is installed.'
    case 'wowup': return 'Same packs Magguu Setup copies — starter plus optional extras. EllesmereUI is still required.'
    default: return 'Choose your category and class to copy the import string.'
  }
})
const selectedClass = ref(queryText(route.query.class)); const selectedSpec = ref(queryText(route.query.spec)); const layoutCopied = ref(false)
const selectedAddon = ref(queryText(route.query.addon)); const selectedProfileId = ref(queryText(route.query.profile)); const profileCopied = ref(false)
const selectedWowupName = ref(queryText(route.query.pack)); const wowupCopied = ref(false)

interface PublicProfile {
  id: number
  profile: string
  description?: string | null
  stringLength?: number | null
  preview?: string | null
  [k: string]: unknown
}
interface PublicLayout {
  id: number
  name?: string
  className?: string | null
  spec?: string | null
  description?: string | null
  importLength?: number | null
  preview?: string | null
  [k: string]: unknown
}
interface PublicWowup { id: number, string: string, description?: string | null, [k: string]: unknown }
type ProfileGroupedPublic = Record<string, PublicProfile[]>
type WowupKeyedPublic = Record<string, PublicWowup>

const { data: profileData, refresh: refreshProfiles } = useFetch<{ data: ProfileGroupedPublic }>('/api/v1/profiles?view=meta')
const { data: wowupData, refresh: refreshWowup } = useFetch<{ data: WowupKeyedPublic }>('/api/v1/wowup')
const { data: layoutData, refresh: refreshLayouts } = useFetch<{ data: PublicLayout[] }>('/api/v1/layouts?view=meta')

const profileStrings = ref<Record<number, string>>({})
const layoutStrings = ref<Record<number, string>>({})

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
  { label: 'WowUp Packages', value: 'wowup', count: wowupList.value.length },
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
watch(() => selectedClass.value, (next, prev) => {
  if (prev === undefined || next === prev) return
  nextTick(() => {
    const specs = layoutSpecs.value
    if (selectedSpec.value && specs.includes(selectedSpec.value)) return
    selectedSpec.value = specs[0] || ''
  })
})

const profileAddons = computed(() => [...new Set(profileList.value.map(p => p.addon))].sort(compareProfileAddons))
const addonProfiles = computed(() => {
  if (!selectedAddon.value) return []
  return profileList.value
    .filter(p => p.addon === selectedAddon.value)
    .sort((a, b) => compareProfileNames(a.profile, b.profile))
})
const selectedProfile = computed(() => {
  if (!selectedProfileId.value) return null
  return profileList.value.find(p => p.id === Number(selectedProfileId.value)) ?? null
})
watch(() => selectedAddon.value, (addon, prev) => {
  if (prev === undefined || addon === prev) return
  const keep = addonProfiles.value.some(p => String(p.id) === selectedProfileId.value)
  if (!keep) selectedProfileId.value = addonProfiles.value[0]?.id?.toString() || ''
})
const selectedWowup = computed(() => {
  if (!selectedWowupName.value) return null
  return wowupList.value.find(w => w.name === selectedWowupName.value) ?? null
})

const selectedWowupAddons = computed(() => {
  const raw = selectedWowup.value?.string
  if (!raw) return [] as string[]
  return parseWowupAddonNames(raw)
})

const wowupPackGroups = computed(() => {
  const items = wowupList.value.map((w) => {
    const kind: AddonGroupKey = w.name === 'Required' ? 'required' : 'wowup'
    const subtitle = w.name === 'Required' ? 'Required' : 'WowUp'
    return {
      key: w.name,
      name: wowupLabel(w.name),
      emoji: w.name === 'Required' ? '⚡' : '➕',
      kind,
      badge: kind,
      subtitle,
    }
  })
  return groupAddonChips(items)
})

const selectedWowupAddonGroups = computed(() => {
  const packName = selectedWowup.value?.name
  const kind: AddonGroupKey = packName === 'Required' ? 'required' : 'wowup'
  const subtitle = packName === 'Required' ? 'Required' : 'WowUp'
  const items = selectedWowupAddons.value.map((raw) => {
    const name = displayAddonName(raw)
    const lower = name.toLowerCase()
    const isWim = lower === 'wim' || lower.includes('wim skin')
    const itemKind: AddonGroupKey = isWim ? 'optional' : kind
    return {
      key: raw,
      name,
      emoji: emojiForAddonName(raw),
      kind: itemKind,
      badge: (itemKind === 'optional' ? 'optional' : kind) as 'required' | 'optional' | 'wowup',
      subtitle: itemKind === 'optional' ? 'Optional' : subtitle,
    }
  })
  return groupAddonChips(items)
})

function onWowupPackSelect(item: { key: string }) {
  selectedWowupName.value = item.key
}


// Auto-select first item in each category (respect URL params)
watch(layoutClasses, (classes) => { if (classes.length && !selectedClass.value) selectedClass.value = classes[0] }, { immediate: true })
watch(profileAddons, (addons) => { if (addons.length && !selectedAddon.value) selectedAddon.value = addons[0] }, { immediate: true })
watch(profileList, (list) => {
  const wantedId = queryText(route.query.profile)
  if (!wantedId) return
  const match = list.find(p => String(p.id) === wantedId)
  if (!match) return
  selectedProfileId.value = wantedId
  if (selectedAddon.value !== match.addon) selectedAddon.value = match.addon
}, { immediate: true })
watch(wowupList, (list) => {
  if (!list.length) return
  const wanted = queryText(route.query.pack)
  if (selectedWowupName.value && list.some(w => w.name === selectedWowupName.value)) return
  selectedWowupName.value = list.some(w => w.name === wanted) ? wanted : list[0].name
}, { immediate: true })

function syncUrl() {
  const tab = activeTab.value === 'profiles' || activeTab.value === 'wowup' ? activeTab.value : 'layouts'
  const query = queryFromStringsState({
    tab,
    className: selectedClass.value,
    spec: selectedSpec.value,
    addon: selectedAddon.value,
    profileId: selectedProfileId.value,
    pack: selectedWowupName.value,
  })
  const current: Record<string, string> = {}
  for (const [key, value] of Object.entries(route.query)) {
    const text = queryText(value)
    if (text) current[key] = text
  }
  const keys = new Set([...Object.keys(current), ...Object.keys(query)])
  const same = [...keys].every(key => current[key] === query[key])
  if (!same) router.replace({ query })
}
watch([activeTab, selectedClass, selectedSpec, selectedAddon, selectedProfileId, selectedWowupName], syncUrl)

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
  return `${len.toLocaleString('en-US')} characters`
}

const toast = useToast()
const isMac = ref(false)
function handleCopyShortcut(e: KeyboardEvent) {
  if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
    const selection = window.getSelection()?.toString()
    if (selection && selection.length > 0) return
    if (editModal.value) return

    e.preventDefault()
    if (activeTab.value === 'layouts' && selectedLayout.value) copyLayout()
    else if (activeTab.value === 'profiles' && selectedProfile.value) copyProfile()
    else if (activeTab.value === 'wowup' && selectedWowup.value?.string) copyWowup()
  }
}

onMounted(() => {
  isMac.value = navigator.platform.toUpperCase().includes('MAC')
  window.addEventListener('keydown', handleCopyShortcut)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleCopyShortcut)
})

async function doCopy(text: string) { try { await navigator.clipboard.writeText(text); return true } catch { const el = document.createElement('textarea'); el.value = text; document.body.appendChild(el); el.select(); document.execCommand('copy'); document.body.removeChild(el); return true } }

function trackCopy(type: string, id: number) {
  $fetch('/api/v1/copy-event', { method: 'POST', body: { stringType: type, stringId: id } }).catch(() => {})
}

function profilePreview(row: PublicProfile | null): string {
  if (!row) return ''
  return (profileStrings.value[row.id] || row.preview || '').substring(0, 200)
}
function profileShowsEllipsis(row: PublicProfile | null): boolean {
  if (!row) return false
  const full = profileStrings.value[row.id]
  if (full) return full.length > 200
  return (row.stringLength || 0) > 200
}
function profileSize(row: PublicProfile | null): number {
  if (!row) return 0
  const full = profileStrings.value[row.id]
  if (full) return full.length
  return row.stringLength || 0
}
function layoutPreview(row: PublicLayout | null): string {
  if (!row) return ''
  return (layoutStrings.value[row.id] || row.preview || '').substring(0, 200)
}
function layoutShowsEllipsis(row: PublicLayout | null): boolean {
  if (!row) return false
  const full = layoutStrings.value[row.id]
  if (full) return full.length > 200
  return (row.importLength || 0) > 200
}
function layoutSize(row: PublicLayout | null): number {
  if (!row) return 0
  const full = layoutStrings.value[row.id]
  if (full) return full.length
  return row.importLength || 0
}

async function loadProfileString(id: number): Promise<string | null> {
  const cached = profileStrings.value[id]
  if (cached) return cached
  try {
    const res = await $fetch<{ data?: { string?: string } }>(`/api/v1/profiles/${id}`)
    const text = res.data?.string
    if (!text) return null
    profileStrings.value = { ...profileStrings.value, [id]: text }
    return text
  } catch {
    return null
  }
}
async function loadLayoutString(id: number): Promise<string | null> {
  const cached = layoutStrings.value[id]
  if (cached) return cached
  try {
    const res = await $fetch<{ data?: { importString?: string } }>(`/api/v1/layouts/${id}`)
    const text = res.data?.importString
    if (!text) return null
    layoutStrings.value = { ...layoutStrings.value, [id]: text }
    return text
  } catch {
    return null
  }
}

watch(selectedProfile, (row) => {
  if (!import.meta.client || !row || profileStrings.value[row.id]) return
  void loadProfileString(row.id)
})
watch(selectedLayout, (row) => {
  if (!import.meta.client || !row || layoutStrings.value[row.id]) return
  void loadLayoutString(row.id)
})

async function copyLayout() {
  const row = selectedLayout.value
  if (!row) return
  const text = await loadLayoutString(row.id)
  if (!text) {
    toast.add({ title: 'Could not copy', color: 'error' })
    return
  }
  await doCopy(text)
  layoutCopied.value = true
  toast.add({ title: 'Copied!', icon: 'i-heroicons-check-circle', color: 'success', duration: 2000 })
  trackCopy('layout', row.id)
  setTimeout(() => { layoutCopied.value = false }, 2000)
}
async function copyProfile() {
  const row = selectedProfile.value
  if (!row) return
  const text = await loadProfileString(row.id)
  if (!text) {
    toast.add({ title: 'Could not copy', color: 'error' })
    return
  }
  await doCopy(text)
  profileCopied.value = true
  toast.add({ title: 'Copied!', icon: 'i-heroicons-check-circle', color: 'success', duration: 2000 })
  trackCopy('profile', row.id)
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

async function editProfile(p: FlatProfile) {
  const text = await loadProfileString(p.id)
  if (!text) {
    toast.add({ title: 'Could not load string', color: 'error' })
    return
  }
  Object.assign(editForm, { type: 'profile', id: p.id, addon: p.addon, profile: p.profile, string: text })
  editModal.value = true
}
function editWowup(w: FlatWowup) { Object.assign(editForm, { type: 'wowup', id: w.id, name: w.name, string: w.string }); editModal.value = true }
async function editLayout(l: PublicLayout) {
  const text = await loadLayoutString(l.id)
  if (!text) {
    toast.add({ title: 'Could not load string', color: 'error' })
    return
  }
  Object.assign(editForm, { type: 'layout', id: l.id, className: l.className || '', spec: l.spec || '', string: text })
  editModal.value = true
}

async function saveEdit() {
  editSaving.value = true
  try {
    if (editForm.type === 'profile') {
      await apiFetch(`/api/v1/admin/profiles/${editForm.id}`, { method: 'PUT', body: { addon: editForm.addon, profile: editForm.profile, string: editForm.string } })
      profileStrings.value = { ...profileStrings.value, [editForm.id]: editForm.string }
      await refreshProfiles()
    } else if (editForm.type === 'wowup') {
      await apiFetch(`/api/v1/admin/wowup/${editForm.id}`, { method: 'PUT', body: { name: editForm.name, string: editForm.string } })
      await refreshWowup()
    } else if (editForm.type === 'layout') {
      await apiFetch(`/api/v1/admin/layouts/${editForm.id}`, { method: 'PUT', body: { className: editForm.className, spec: editForm.spec, importString: editForm.string } })
      layoutStrings.value = { ...layoutStrings.value, [editForm.id]: editForm.string }
      await refreshLayouts()
    }
    editModal.value = false
  } catch { toast.add({ title: 'Error saving', color: 'error' }) }
  finally { editSaving.value = false }
}
</script>

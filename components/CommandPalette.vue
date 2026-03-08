<!--
  Admin Command Palette — Cmd+K / Ctrl+K quick navigation
-->

<template>
  <UModal v-model:open="isOpen">
    <template #content>
    <div class="p-2 sm:max-w-lg mx-auto" role="dialog" aria-label="Command Palette">
      <div class="flex items-center gap-3 px-3 py-2" :class="isDark ? 'border-b border-brand-400/10' : 'border-b border-gray-100'">
        <UIcon name="i-heroicons-magnifying-glass" class="w-5 h-5 flex-shrink-0" :class="isDark ? 'text-silver-500' : 'text-gray-400'" />
        <input
          ref="inputRef"
          v-model="query"
          type="text"
          class="w-full bg-transparent text-sm outline-none"
          :class="isDark ? 'text-white placeholder-silver-600' : 'text-gray-900 placeholder-gray-400'"
          placeholder="Search pages, actions..."
          @keydown.down.prevent="moveDown"
          @keydown.up.prevent="moveUp"
          @keydown.enter.prevent="selectItem"
          @keydown.escape="isOpen = false"
        />
        <kbd class="hidden sm:flex items-center px-1.5 py-0.5 text-[10px] font-medium rounded"
          :class="isDark ? 'bg-brand-900/50 text-silver-500 border border-brand-400/10' : 'bg-gray-100 text-gray-400 border border-gray-200'">
          ESC
        </kbd>
      </div>

      <div class="max-h-80 overflow-y-auto py-1" role="listbox" aria-label="Search results">
        <div v-if="filtered.length === 0" class="px-4 py-8 text-center" role="status">
          <p class="text-sm" :class="isDark ? 'text-silver-600' : 'text-gray-400'">No results found</p>
        </div>

        <template v-for="(group, idx) in groupedResults" :key="group.label">
          <p class="px-3 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-wider"
            :class="isDark ? 'text-silver-600' : 'text-gray-400'">
            {{ group.label }}
          </p>
          <button v-for="item in group.items" :key="item.to"
            role="option"
            :aria-selected="activeIndex === item._idx"
            class="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors"
            :class="activeIndex === item._idx
              ? isDark ? 'bg-brand-400/10 text-white' : 'bg-blue-50 text-gray-900'
              : isDark ? 'text-silver-300 hover:bg-white/[0.03]' : 'text-gray-600 hover:bg-gray-50'"
            @click="goTo(item.to)"
            @mouseenter="activeIndex = item._idx">
            <UIcon :name="item.icon" class="w-4 h-4 flex-shrink-0" :class="activeIndex === item._idx ? 'text-brand-400' : isDark ? 'text-silver-500' : 'text-gray-400'" />
            <span class="text-sm flex-1">{{ item.label }}</span>
            <UIcon v-if="item.shortcut" name="i-heroicons-arrow-turn-down-left" class="w-3 h-3" :class="isDark ? 'text-silver-700' : 'text-gray-300'" />
          </button>
        </template>
      </div>

      <div class="flex items-center gap-4 px-3 py-2 text-[10px]"
        :class="isDark ? 'border-t border-brand-400/10 text-silver-600' : 'border-t border-gray-100 text-gray-400'">
        <span class="flex items-center gap-1"><kbd class="px-1 py-0.5 rounded bg-current/10">↑↓</kbd> Navigate</span>
        <span class="flex items-center gap-1"><kbd class="px-1 py-0.5 rounded bg-current/10">↵</kbd> Open</span>
        <span class="flex items-center gap-1"><kbd class="px-1 py-0.5 rounded bg-current/10">esc</kbd> Close</span>
      </div>
    </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
const router = useRouter()
const isDark = useIsDark()

const isOpen = ref(false)
const query = ref('')
const activeIndex = ref(0)
const inputRef = ref<HTMLInputElement | null>(null)

// All navigable items
const allItems = [
  // Pages
  { label: 'Dashboard', icon: 'i-heroicons-home', to: '/admin', group: 'Pages' },
  { label: 'Addon Profiles', icon: 'i-heroicons-cube', to: '/admin/strings/profiles', group: 'Pages' },
  { label: 'WowUp Strings', icon: 'i-heroicons-arrow-down-tray', to: '/admin/strings/wowup', group: 'Pages' },
  { label: 'Character Layouts', icon: 'i-heroicons-user-circle', to: '/admin/strings/layouts', group: 'Pages' },
  { label: 'Homepage Editor', icon: 'i-heroicons-home-modern', to: '/admin/content/home', group: 'Content' },
  { label: 'Guide Editor', icon: 'i-heroicons-book-open', to: '/admin/content/guide', group: 'Content' },
  { label: 'Changelog', icon: 'i-heroicons-document-text', to: '/admin/content/changelog', group: 'Content' },
  { label: 'Settings', icon: 'i-heroicons-cog-6-tooth', to: '/admin/system/settings', group: 'System' },
  { label: 'Statistics', icon: 'i-heroicons-chart-bar', to: '/admin/system/stats', group: 'System' },
  { label: 'Users', icon: 'i-heroicons-users', to: '/admin/system/users', group: 'System' },
  { label: 'API Keys', icon: 'i-heroicons-key', to: '/admin/system/api-keys', group: 'System' },
  { label: 'GitHub Sync', icon: 'i-simple-icons-github', to: '/admin/system/github', group: 'System' },
  { label: 'Activity Log', icon: 'i-heroicons-clock', to: '/admin/system/activity', group: 'System' },
  { label: 'Custom Fields', icon: 'i-heroicons-adjustments-horizontal', to: '/admin/system/fields', group: 'System' },
  // Quick actions
  { label: 'New Addon Profile', icon: 'i-heroicons-plus', to: '/admin/strings/profiles?action=new', group: 'Actions' },
  { label: 'New Changelog Entry', icon: 'i-heroicons-plus', to: '/admin/content/changelog?action=new', group: 'Actions' },
  // External
  { label: 'View Website', icon: 'i-heroicons-arrow-top-right-on-square', to: '/', group: 'Other' },
]

const filtered = computed(() => {
  const q = query.value.toLowerCase().trim()
  if (!q) return allItems
  return allItems.filter(i => i.label.toLowerCase().includes(q) || i.group.toLowerCase().includes(q))
})

// Add flat index for keyboard navigation
const indexedItems = computed(() => {
  let idx = 0
  return filtered.value.map(item => ({ ...item, _idx: idx++ }))
})

const groupedResults = computed(() => {
  const groups: Record<string, typeof indexedItems.value> = {}
  for (const item of indexedItems.value) {
    if (!groups[item.group]) groups[item.group] = []
    groups[item.group].push(item)
  }
  return Object.entries(groups).map(([label, items]) => ({ label, items }))
})

// Keyboard navigation
function moveDown() {
  if (activeIndex.value < indexedItems.value.length - 1) activeIndex.value++
}
function moveUp() {
  if (activeIndex.value > 0) activeIndex.value--
}
function selectItem() {
  const item = indexedItems.value.find(i => i._idx === activeIndex.value)
  if (item) goTo(item.to)
}

function goTo(to: string) {
  isOpen.value = false
  query.value = ''
  router.push(to)
}

// Reset on open
watch(isOpen, (val) => {
  if (val) {
    query.value = ''
    activeIndex.value = 0
    nextTick(() => inputRef.value?.focus())
  }
})

// Reset active index on filter change
watch(query, () => { activeIndex.value = 0 })

// Global keyboard shortcut
onMounted(() => {
  document.addEventListener('keydown', onKeydown)
})
onUnmounted(() => {
  document.removeEventListener('keydown', onKeydown)
})

function onKeydown(e: KeyboardEvent) {
  if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
    e.preventDefault()
    isOpen.value = !isOpen.value
  }
}

// Expose for parent to open
defineExpose({ open: () => { isOpen.value = true } })
</script>

<template>
  <UModal v-model:open="isOpen" title="Command palette" description="Jump to an admin page or run a quick action." :ui="{ header: 'sr-only' }">
    <template #content>
      <div class="admin-command" data-testid="admin-command">
        <h2 class="sr-only">Command palette</h2>
        <div class="admin-command__input-row">
          <UIcon name="i-heroicons-magnifying-glass" class="h-5 w-5 shrink-0 text-slate-400 dark:text-slate-500" aria-hidden="true" />
          <input
            ref="inputRef"
            v-model="query"
            type="text"
            role="combobox"
            class="admin-command__input"
            placeholder="Search pages and actions"
            aria-label="Search admin pages and actions"
            aria-autocomplete="list"
            aria-expanded="true"
            :aria-controls="listId"
            :aria-activedescendant="activeId"
            autocomplete="off"
            autocapitalize="off"
            spellcheck="false"
            @keydown.down.prevent="move('down')"
            @keydown.up.prevent="move('up')"
            @keydown.home.prevent="move('home')"
            @keydown.end.prevent="move('end')"
            @keydown.enter.prevent="onEnter"
            @keydown.escape.prevent="isOpen = false"
          >
          <kbd class="admin-command__shortcut" aria-hidden="true">Esc</kbd>
        </div>

        <div :id="listId" class="max-h-96 overflow-y-auto p-2" role="listbox" aria-label="Pages and actions">
          <div v-if="results.length === 0" class="admin-empty-state py-10" role="presentation">
            <div class="space-y-1 text-center">
              <p class="admin-empty-state__title">No results</p>
              <p class="admin-empty-state__description">Try another keyword or section.</p>
            </div>
          </div>

          <div v-for="group in groups" :key="group.label" role="group" :aria-labelledby="`${listId}-g-${slug(group.label)}`">
            <div :id="`${listId}-g-${slug(group.label)}`" class="admin-command__group" role="presentation">{{ group.label }}</div>

            <div
              v-for="item in group.items"
              :id="optionId(item.index)"
              :key="item.id"
              class="admin-command__item"
              :class="activeIndex === item.index ? 'admin-command__item--active' : ''"
              role="option"
              :aria-selected="activeIndex === item.index"
              @click="run(item)"
              @mousemove="activeIndex = item.index"
            >
              <UIcon :name="item.icon" class="admin-command__item-icon h-4 w-4" aria-hidden="true" />

              <div class="min-w-0 flex-1 text-left">
                <p class="truncate text-sm font-medium text-slate-950 dark:text-white">{{ item.label }}</p>
                <p class="truncate text-xs text-slate-500 dark:text-slate-400">{{ item.description }}</p>
              </div>
            </div>
          </div>
        </div>

        <div class="sr-only" role="status" aria-live="polite">{{ results.length }} {{ results.length === 1 ? 'result' : 'results' }}</div>

        <div class="admin-command__footer" aria-hidden="true">
          <span><kbd>↑↓</kbd> Navigate</span>
          <span><kbd>↵</kbd> Open</span>
          <span><kbd>Esc</kbd> Close</span>
        </div>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import { builtInActions, filterCommands, groupCommands, moveActive } from '~/utils/adminCommands'
import type { PaletteItem } from '~/utils/adminCommands'

/**
 * Admin-only command palette (mounted by layouts/admin.vue, which only renders
 * for a restored session). The public site's Ctrl+K search lives in PublicSearch.vue
 * in the default layout; the two are never mounted together.
 */
const router = useRouter()
const colorMode = useColorMode()
const isDark = useIsDark()
const { logout } = useAuth()
const { commandItems } = useAdminNavigation()

const listId = 'admin-command-list'
const isOpen = ref(false)
const query = ref('')
const activeIndex = ref(0)
const inputRef = ref<HTMLInputElement | null>(null)

const items = computed<PaletteItem[]>(() => [
  ...commandItems.value.filter(item => item.group !== 'Actions'),
  ...commandItems.value.filter(item => item.group === 'Actions'),
  ...builtInActions(isDark.value),
])
const results = computed(() => filterCommands(items.value, query.value))
const groups = computed(() => groupCommands(results.value))
const activeId = computed(() => (results.value.length ? optionId(activeIndex.value) : undefined))

const slug = (text: string) => text.toLowerCase().replace(/[^a-z0-9]+/g, '-')
const optionId = (index: number) => `${listId}-opt-${index}`

function move(key: 'down' | 'up' | 'home' | 'end') {
  activeIndex.value = Math.max(0, moveActive(activeIndex.value, results.value.length, key))
  nextTick(() => document.getElementById(optionId(activeIndex.value))?.scrollIntoView({ block: 'nearest' }))
}

function onEnter(event: KeyboardEvent) {
  if (event.isComposing) return
  const item = results.value[activeIndex.value]
  if (item) run(item)
}

function run(item: PaletteItem) {
  isOpen.value = false
  if (item.action === 'toggle-theme') {
    colorMode.preference = isDark.value ? 'light' : 'dark'
  } else if (item.action === 'logout') {
    logout()
  } else if (item.to) {
    router.push(item.to)
  }
}

watch(isOpen, (value) => {
  if (value) {
    query.value = ''
    activeIndex.value = 0
    nextTick(() => inputRef.value?.focus())
  }
})

watch(query, () => {
  activeIndex.value = 0
})

function onKeydown(event: KeyboardEvent) {
  if ((event.metaKey || event.ctrlKey) && !event.altKey && !event.shiftKey && event.key.toLowerCase() === 'k') {
    event.preventDefault()
    isOpen.value = !isOpen.value
  }
}

onMounted(() => {
  document.addEventListener('keydown', onKeydown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', onKeydown)
})

defineExpose({
  open: () => {
    isOpen.value = true
  },
})
</script>

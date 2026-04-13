<template>
  <UModal v-model:open="isOpen">
    <template #content>
      <div class="admin-command">
        <div class="admin-command__input-row">
          <UIcon name="i-heroicons-magnifying-glass" class="h-5 w-5 shrink-0 text-slate-400 dark:text-slate-500" />
          <input
            ref="inputRef"
            v-model="query"
            type="text"
            class="admin-command__input"
            placeholder="Search pages, actions and tools"
            aria-label="Search admin pages and actions"
            @keydown.down.prevent="moveDown"
            @keydown.up.prevent="moveUp"
            @keydown.enter.prevent="selectItem"
            @keydown.escape="isOpen = false"
          >
          <kbd class="admin-command__shortcut">Esc</kbd>
        </div>

        <div class="max-h-96 overflow-y-auto p-2" role="listbox" aria-label="Search results">
          <div v-if="indexedItems.length === 0" class="admin-empty-state py-10">
            <div class="space-y-1 text-center">
              <h3 class="admin-empty-state__title">No results</h3>
              <p class="admin-empty-state__description">Try another keyword or section.</p>
            </div>
          </div>

          <template v-for="group in groupedResults" :key="group.label">
            <div class="admin-command__group">{{ group.label }}</div>

            <button
              v-for="item in group.items"
              :key="item.to"
              class="admin-command__item"
              :class="activeIndex === item._idx ? 'admin-command__item--active' : ''"
              role="option"
              :aria-selected="activeIndex === item._idx"
              @click="goTo(item.to)"
              @mouseenter="activeIndex = item._idx"
            >
              <div class="admin-command__item-icon">
                <UIcon :name="item.icon" class="h-4 w-4" />
              </div>

              <div class="min-w-0 flex-1 text-left">
                <p class="truncate text-sm font-medium text-slate-950 dark:text-white">{{ item.label }}</p>
                <p class="truncate text-xs text-slate-500 dark:text-slate-400">{{ item.description }}</p>
              </div>

              <UIcon
                v-if="activeIndex === item._idx"
                name="i-heroicons-arrow-up-right"
                class="h-4 w-4 text-slate-400 dark:text-slate-500"
              />
            </button>
          </template>
        </div>

        <div class="admin-command__footer">
          <span><kbd>↑↓</kbd> Navigate</span>
          <span><kbd>↵</kbd> Open</span>
          <span><kbd>Esc</kbd> Close</span>
        </div>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
const router = useRouter()
const { commandItems } = useAdminNavigation()

const isOpen = ref(false)
const query = ref('')
const activeIndex = ref(0)
const inputRef = ref<HTMLInputElement | null>(null)

const filtered = computed(() => {
  const q = query.value.toLowerCase().trim()
  if (!q) return commandItems.value

  return commandItems.value.filter(item =>
    item.label.toLowerCase().includes(q)
    || item.group.toLowerCase().includes(q)
    || item.description.toLowerCase().includes(q),
  )
})

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

function moveDown() {
  if (activeIndex.value < indexedItems.value.length - 1) activeIndex.value++
}

function moveUp() {
  if (activeIndex.value > 0) activeIndex.value--
}

function selectItem() {
  const item = indexedItems.value.find(entry => entry._idx === activeIndex.value)
  if (item) goTo(item.to)
}

function goTo(to: string) {
  isOpen.value = false
  query.value = ''
  router.push(to)
}

watch(isOpen, value => {
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
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
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

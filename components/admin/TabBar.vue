<script setup lang="ts">
const { tabs, closeTab, closeAllTabs, closeOtherTabs, togglePin, isActive } = useAdminTabs()
const isDark = useIsDark()

const contextTab = ref<string | null>(null)
const contextPos = ref({ x: 0, y: 0 })

function onContextMenu(event: MouseEvent, path: string) {
  event.preventDefault()
  contextTab.value = path
  contextPos.value = { x: event.clientX, y: event.clientY }
}

function closeContextMenu() {
  contextTab.value = null
}

onMounted(() => {
  document.addEventListener('click', closeContextMenu)
})

onUnmounted(() => {
  document.removeEventListener('click', closeContextMenu)
})
</script>

<template>
  <div
    class="flex h-[38px] items-center gap-0 border-b overflow-x-auto overflow-y-hidden scrollbar-hide"
    :class="isDark ? 'bg-[hsl(222.34,10.43%,12.27%)] border-[hsl(240,3.7%,22%)]' : 'bg-white border-[hsl(240,5.9%,90%)]'"
  >
    <NuxtLink
      v-for="tab in tabs"
      :key="tab.path"
      :to="tab.path"
      class="group relative flex h-full shrink-0 items-center gap-1.5 border-r px-3 text-[13px] transition-colors select-none"
      :class="[
        isActive(tab.path)
          ? isDark
            ? 'bg-[hsl(220,13.06%,9%)] text-white border-[hsl(240,3.7%,22%)]'
            : 'bg-[hsl(216,20%,95.5%)] text-slate-900 border-[hsl(240,5.9%,90%)]'
          : isDark
            ? 'text-white/50 hover:text-white/80 border-[hsl(240,3.7%,22%)] hover:bg-white/[0.03]'
            : 'text-slate-500 hover:text-slate-700 border-[hsl(240,5.9%,90%)] hover:bg-slate-50',
      ]"
      @contextmenu="onContextMenu($event, tab.path)"
    >
      <!-- Active indicator line -->
      <span
        v-if="isActive(tab.path)"
        class="absolute inset-x-0 bottom-0 h-0.5 bg-[hsl(212,100%,45%)]"
      />

      <UIcon v-if="tab.icon" :name="tab.icon" class="h-3.5 w-3.5 shrink-0 opacity-70" />

      <span class="max-w-[120px] truncate">{{ tab.label }}</span>

      <!-- Pin indicator -->
      <span v-if="tab.pinned" class="ml-0.5 text-[10px] opacity-40">
        <UIcon name="i-heroicons-map-pin" class="h-2.5 w-2.5" />
      </span>

      <!-- Close button (not for pinned tabs) -->
      <button
        v-if="!tab.pinned"
        class="ml-0.5 rounded p-0.5 opacity-0 transition-all group-hover:opacity-100"
        :class="isDark ? 'hover:bg-white/10 text-white/40 hover:text-white' : 'hover:bg-slate-200 text-slate-400 hover:text-slate-700'"
        @click.prevent.stop="closeTab(tab.path)"
      >
        <UIcon name="i-heroicons-x-mark" class="h-3 w-3" />
      </button>
    </NuxtLink>

    <!-- Close all button -->
    <button
      v-if="tabs.some(t => !t.pinned)"
      class="ml-auto shrink-0 flex items-center gap-1 px-2.5 h-full text-[12px] transition-colors border-l"
      :class="isDark ? 'text-white/35 hover:text-white/70 border-[hsl(240,3.7%,22%)]' : 'text-slate-400 hover:text-slate-600 border-[hsl(240,5.9%,90%)]'"
      title="Close all tabs"
      @click="closeAllTabs()"
    >
      <UIcon name="i-heroicons-x-mark" class="h-3.5 w-3.5" />
    </button>

    <!-- Context menu -->
    <Teleport to="body">
      <div
        v-if="contextTab"
        class="fixed z-[200] rounded-lg border py-1 shadow-xl text-sm min-w-[160px]"
        :class="isDark ? 'bg-[hsl(222.34,10.43%,14%)] border-white/10 text-white' : 'bg-white border-slate-200 text-slate-700'"
        :style="{ left: `${contextPos.x}px`, top: `${contextPos.y}px` }"
      >
        <button
          class="flex w-full items-center gap-2 px-3 py-1.5 text-left transition-colors"
          :class="isDark ? 'hover:bg-white/[0.06]' : 'hover:bg-slate-50'"
          @click="togglePin(contextTab!)"
        >
          <UIcon name="i-heroicons-map-pin" class="h-3.5 w-3.5" />
          {{ tabs.find(t => t.path === contextTab)?.pinned ? 'Unpin' : 'Pin tab' }}
        </button>
        <button
          class="flex w-full items-center gap-2 px-3 py-1.5 text-left transition-colors"
          :class="isDark ? 'hover:bg-white/[0.06]' : 'hover:bg-slate-50'"
          @click="closeTab(contextTab!)"
        >
          <UIcon name="i-heroicons-x-mark" class="h-3.5 w-3.5" />
          Close tab
        </button>
        <button
          class="flex w-full items-center gap-2 px-3 py-1.5 text-left transition-colors"
          :class="isDark ? 'hover:bg-white/[0.06]' : 'hover:bg-slate-50'"
          @click="closeOtherTabs(contextTab!)"
        >
          <UIcon name="i-heroicons-arrows-pointing-in" class="h-3.5 w-3.5" />
          Close others
        </button>
        <button
          class="flex w-full items-center gap-2 px-3 py-1.5 text-left transition-colors"
          :class="isDark ? 'hover:bg-white/[0.06]' : 'hover:bg-slate-50'"
          @click="closeAllTabs()"
        >
          <UIcon name="i-heroicons-x-circle" class="h-3.5 w-3.5" />
          Close all
        </button>
      </div>
    </Teleport>
  </div>
</template>

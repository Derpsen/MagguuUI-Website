<script setup lang="ts">
const { tabs, closeTab, closeAllTabs, closeOtherTabs, togglePin, isActive } = useAdminTabs()
const isDark = useIsDark()
const route = useRoute()

const scroller = ref<HTMLElement | null>(null)
const canScrollLeft = ref(false)
const canScrollRight = ref(false)

const contextTab = ref<string | null>(null)
const contextPos = ref({ x: 0, y: 0 })

function updateOverflow() {
  const el = scroller.value
  if (!el) {
    canScrollLeft.value = false
    canScrollRight.value = false
    return
  }
  const max = el.scrollWidth - el.clientWidth
  canScrollLeft.value = el.scrollLeft > 1
  canScrollRight.value = max > 1 && el.scrollLeft < max - 1
}

function scrollTabs(dir: -1 | 1) {
  const el = scroller.value
  if (!el) return
  const delta = Math.max(160, Math.floor(el.clientWidth * 0.7))
  el.scrollBy({ left: dir * delta, behavior: 'smooth' })
}

function scrollActiveIntoView() {
  const el = scroller.value
  if (!el) return
  const active = el.querySelector('[data-active="true"]') as HTMLElement | null
  active?.scrollIntoView({ inline: 'nearest', block: 'nearest', behavior: 'smooth' })
}

function refreshOverflow() {
  nextTick(() => {
    updateOverflow()
    requestAnimationFrame(() => {
      updateOverflow()
      scrollActiveIntoView()
    })
  })
}

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
  window.addEventListener('resize', updateOverflow)
  updateOverflow()
  const el = scroller.value
  if (el && typeof ResizeObserver !== 'undefined') {
    const ro = new ResizeObserver(() => updateOverflow())
    ro.observe(el)
    onUnmounted(() => ro.disconnect())
  }
  refreshOverflow()
})

onUnmounted(() => {
  document.removeEventListener('click', closeContextMenu)
  window.removeEventListener('resize', updateOverflow)
})

watch(() => tabs.value.map(t => t.path).join('\0'), () => {
  refreshOverflow()
})

watch(() => route.path, () => {
  refreshOverflow()
})
</script>

<template>
  <div
    data-testid="admin-tab-bar"
    class="flex h-[38px] min-w-0 items-center border-b"
    :class="isDark ? 'bg-[#0b1118] border-white/10' : 'bg-white border-[#dbe3ec]'"
  >
    <div class="relative min-w-0 flex-1">
      <div
        v-if="canScrollLeft"
        data-testid="admin-tab-fade-left"
        class="pointer-events-none absolute inset-y-0 left-0 z-[5] w-8 bg-gradient-to-r to-transparent"
        :class="isDark ? 'from-[#0b1118]' : 'from-white'"
      />
      <button
        v-if="canScrollLeft"
        type="button"
        data-testid="admin-tab-scroll-left"
        class="absolute left-0 top-0 z-10 flex h-full w-7 items-center justify-center"
        :class="isDark ? 'text-silver-300 hover:text-white' : 'text-slate-600 hover:text-slate-900'"
        aria-label="Scroll tabs left"
        @click="scrollTabs(-1)"
      >
        <UIcon name="i-heroicons-chevron-left" class="h-4 w-4" />
      </button>

      <!-- Scrollable tabs; min-w-0 so overflow works inside admin shell. Fade + arrows make overflow obvious (scrollbar stays hidden). -->
      <div
        ref="scroller"
        data-testid="admin-tab-scroller"
        class="flex h-[38px] items-center overflow-x-auto overflow-y-hidden scrollbar-hide"
        :class="[canScrollLeft ? 'pl-7' : '', canScrollRight ? 'pr-7' : '']"
        @scroll="updateOverflow"
      >
        <div class="flex h-[38px] w-max items-center gap-0" role="tablist" aria-label="Open admin pages">
          <NuxtLink
            v-for="tab in tabs"
            :key="tab.path"
            :to="tab.path"
            role="tab"
            data-testid="admin-tab"
            :data-tab-path="tab.path"
            :data-active="isActive(tab.path) ? 'true' : 'false'"
            :aria-selected="isActive(tab.path)"
            class="group relative flex h-full shrink-0 items-center gap-1.5 border-r px-3 text-[13px] transition-colors select-none"
            :class="[
              isActive(tab.path)
                ? isDark
                  ? 'text-white border-white/10'
                  : 'text-slate-900 border-[#dbe3ec]'
                : isDark
                  ? 'text-silver-300 hover:text-white border-white/10'
                  : 'text-slate-600 hover:text-slate-900 border-[#dbe3ec]',
            ]"
            @contextmenu="onContextMenu($event, tab.path)"
          >
            <span
              v-if="isActive(tab.path)"
              class="absolute inset-x-0 bottom-0 h-0.5 bg-primary"
            />

            <UIcon v-if="tab.icon" :name="tab.icon" class="h-3.5 w-3.5 shrink-0 opacity-70" />

            <span class="max-w-[120px] truncate">{{ tab.label }}</span>

            <span v-if="tab.pinned" class="ml-0.5 text-[10px] opacity-40">
              <UIcon name="i-heroicons-map-pin" class="h-2.5 w-2.5" />
            </span>

            <button
              v-if="!tab.pinned"
              type="button"
              class="ml-0.5 rounded p-0.5 opacity-0 transition-all group-hover:opacity-100 focus-visible:opacity-100"
              :class="isDark ? 'hover:bg-white/10 text-silver-300 hover:text-white' : 'hover:bg-slate-200 text-slate-600 hover:text-slate-900'"
              :aria-label="`Close tab ${tab.label}`"
              @click.prevent.stop="closeTab(tab.path)"
            >
              <UIcon name="i-heroicons-x-mark" class="h-3 w-3" />
            </button>
          </NuxtLink>
        </div>
      </div>

      <div
        v-if="canScrollRight"
        data-testid="admin-tab-fade-right"
        class="pointer-events-none absolute inset-y-0 right-0 z-[5] w-8 bg-gradient-to-l to-transparent"
        :class="isDark ? 'from-[#0b1118]' : 'from-white'"
      />
      <button
        v-if="canScrollRight"
        type="button"
        data-testid="admin-tab-scroll-right"
        class="absolute right-0 top-0 z-10 flex h-full w-7 items-center justify-center"
        :class="isDark ? 'text-silver-300 hover:text-white' : 'text-slate-600 hover:text-slate-900'"
        aria-label="Scroll tabs right"
        @click="scrollTabs(1)"
      >
        <UIcon name="i-heroicons-chevron-right" class="h-4 w-4" />
      </button>
    </div>

    <button
      v-if="tabs.some(t => !t.pinned)"
      type="button"
      class="shrink-0 flex items-center gap-1 px-2.5 h-full text-[12px] transition-colors border-l"
      :class="isDark ? 'text-silver-300 hover:text-white border-white/10' : 'text-slate-600 hover:text-slate-900 border-[#dbe3ec]'"
      title="Close all tabs"
      aria-label="Close all tabs"
      @click="closeAllTabs()"
    >
      <UIcon name="i-heroicons-x-mark" class="h-3.5 w-3.5" />
    </button>

    <Teleport to="body">
      <div
        v-if="contextTab"
        class="fixed z-[200] rounded-lg border py-1 shadow-xl text-sm min-w-[160px]"
        :class="isDark ? 'bg-[hsl(222.34,10.43%,14%)] border-white/10 text-white' : 'bg-white border-slate-200 text-slate-700'"
        :style="{ left: contextPos.x + 'px', top: contextPos.y + 'px' }"
      >
        <button
          type="button"
          class="flex w-full items-center gap-2 px-3 py-1.5 text-left transition-colors"
          :class="isDark ? 'hover:bg-white/[0.06]' : 'hover:bg-slate-50'"
          @click="togglePin(contextTab!)"
        >
          <UIcon name="i-heroicons-map-pin" class="h-3.5 w-3.5" />
          {{ tabs.find(t => t.path === contextTab)?.pinned ? 'Unpin' : 'Pin tab' }}
        </button>
        <button
          type="button"
          class="flex w-full items-center gap-2 px-3 py-1.5 text-left transition-colors"
          :class="isDark ? 'hover:bg-white/[0.06]' : 'hover:bg-slate-50'"
          @click="closeTab(contextTab!)"
        >
          <UIcon name="i-heroicons-x-mark" class="h-3.5 w-3.5" />
          Close tab
        </button>
        <button
          type="button"
          class="flex w-full items-center gap-2 px-3 py-1.5 text-left transition-colors"
          :class="isDark ? 'hover:bg-white/[0.06]' : 'hover:bg-slate-50'"
          @click="closeOtherTabs(contextTab!)"
        >
          <UIcon name="i-heroicons-arrows-pointing-in" class="h-3.5 w-3.5" />
          Close others
        </button>
        <button
          type="button"
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

<!--
  Supported Addons / WowUp pack dropdown — Icon + Name + Required/Optional/WowUp subtitle.
  Light/Dark via html.light CSS (preserves #120/#121 shell parity).
-->
<template>
  <div ref="root" class="addon-dd relative w-full max-w-xl mx-auto">
    <button
      type="button"
      class="addon-dd__trigger w-full inline-flex items-center justify-between gap-3 px-4 py-3 rounded-xl text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400/70"
      :aria-expanded="open"
      :aria-controls="listId"
      @click="open = !open"
    >
      <span class="inline-flex items-center gap-2 min-w-0">
        <span class="addon-chip-icon shrink-0" aria-hidden="true">{{ triggerEmoji }}</span>
        <span class="truncate">{{ triggerLabel }}</span>
      </span>
      <svg aria-hidden="true" class="w-4 h-4 shrink-0 transition-transform" :class="open ? 'rotate-180' : ''" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
      </svg>
    </button>

    <div
      v-show="open"
      :id="listId"
      role="listbox"
      class="addon-dd__panel absolute z-30 mt-2 w-full max-h-80 overflow-y-auto rounded-xl border shadow-xl"
    >
      <template v-for="group in groups" :key="group.key">
        <p class="addon-dd__group-label px-3 pt-3 pb-1.5 text-[11px] font-semibold uppercase tracking-[0.18em]">
          {{ group.label }}
        </p>
        <NuxtLink
          v-for="item in group.items.filter(i => !!i.href)"
          :key="item.key"
          :to="item.href!"
          role="option"
          class="addon-dd__item w-full flex items-center gap-3 px-3 py-2.5 text-left text-sm font-semibold transition-colors"
          :class="item.key === selectedKey ? 'addon-dd__item--active' : ''"
          @click="onSelect(item)"
        >
          <span class="addon-chip-icon shrink-0" aria-hidden="true">{{ item.emoji }}</span>
          <span class="flex-1 min-w-0">
            <span class="block truncate">{{ item.name }}</span>
            <span class="addon-dd__subtitle block text-[11px] font-medium tracking-wide mt-0.5">{{ item.subtitle || group.label }}</span>
          </span>
          <span v-if="item.badge === 'required'" class="addon-chip-badge addon-chip-badge--required">Required</span>
          <span v-else-if="item.badge === 'wowup'" class="addon-chip-badge addon-chip-badge--wowup">WowUp</span>
          <span v-else-if="item.badge === 'optional' || item.badge === 'import'" class="addon-chip-badge addon-chip-badge--import">Optional</span>
        </NuxtLink>
        <button
          v-for="item in group.items.filter(i => !i.href)"
          :key="`btn-${item.key}`"
          type="button"
          role="option"
          class="addon-dd__item w-full flex items-center gap-3 px-3 py-2.5 text-left text-sm font-semibold transition-colors"
          :class="item.key === selectedKey ? 'addon-dd__item--active' : ''"
          @click="onSelect(item)"
        >
          <span class="addon-chip-icon shrink-0" aria-hidden="true">{{ item.emoji }}</span>
          <span class="flex-1 min-w-0">
            <span class="block truncate">{{ item.name }}</span>
            <span class="addon-dd__subtitle block text-[11px] font-medium tracking-wide mt-0.5">{{ item.subtitle || group.label }}</span>
          </span>
          <span v-if="item.badge === 'required'" class="addon-chip-badge addon-chip-badge--required">Required</span>
          <span v-else-if="item.badge === 'wowup'" class="addon-chip-badge addon-chip-badge--wowup">WowUp</span>
          <span v-else-if="item.badge === 'optional' || item.badge === 'import'" class="addon-chip-badge addon-chip-badge--import">Optional</span>
        </button>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { AddonGroupKey } from '~/utils/addonChipMeta'

export interface DropdownItem {
  key: string
  name: string
  emoji: string
  href?: string
  subtitle?: string
  badge?: 'required' | 'optional' | 'wowup' | 'import'
  kind: AddonGroupKey
}

const props = withDefaults(defineProps<{
  groups: Array<{ key: AddonGroupKey, label: string, items: DropdownItem[] }>
  selectedKey?: string | null
  placeholder?: string
}>(), {
  selectedKey: null,
  placeholder: 'Browse supported addons',
})

const emit = defineEmits<{ select: [item: DropdownItem] }>()

const open = ref(false)
const root = ref<HTMLElement | null>(null)
const listId = `addon-dd-${Math.random().toString(36).slice(2, 9)}`

const flat = computed(() => props.groups.flatMap(g => g.items))
const selected = computed(() => flat.value.find(i => i.key === props.selectedKey) || null)
const triggerEmoji = computed(() => selected.value?.emoji || '🧩')
const triggerLabel = computed(() => {
  if (selected.value) {
    const sub = selected.value.subtitle || selected.value.badge || ''
    return sub ? `${selected.value.name} · ${sub}` : selected.value.name
  }
  return props.placeholder
})

function onSelect(item: DropdownItem) {
  emit('select', item)
  open.value = false
}

function onDocClick(e: MouseEvent) {
  if (!root.value) return
  if (!root.value.contains(e.target as Node)) open.value = false
}
function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') open.value = false
}

onMounted(() => {
  document.addEventListener('click', onDocClick)
  document.addEventListener('keydown', onKey)
})
onUnmounted(() => {
  document.removeEventListener('click', onDocClick)
  document.removeEventListener('keydown', onKey)
})
</script>

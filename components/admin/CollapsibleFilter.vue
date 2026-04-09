<template>
  <div :class="['rounded-xl border transition-colors', containerClasses]">
    <!-- Filter content — hidden when collapsed -->
    <div
      ref="contentRef"
      class="grid grid-cols-2 lg:grid-cols-3 gap-4 overflow-hidden transition-all duration-300 ease-in-out"
      :style="{ maxHeight: collapsed ? '0px' : contentHeight, opacity: collapsed ? 0 : 1 }"
    >
      <div class="grid grid-cols-2 lg:grid-cols-3 gap-4 p-4 col-span-full">
        <slot />
      </div>
    </div>

    <!-- Action bar — always visible -->
    <div :class="['flex items-center justify-end gap-2 px-4 py-3 border-t transition-colors', borderClasses]">
      <UButton variant="ghost" color="neutral" size="sm" @click="$emit('reset')">
        Reset
      </UButton>
      <UButton size="sm" @click="$emit('search')">
        Search
      </UButton>
      <button
        class="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors ml-2"
        @click="$emit('update:collapsed', !collapsed)"
      >
        <UIcon
          name="i-heroicons-chevron-up"
          class="h-4 w-4 transition-transform duration-300"
          :class="collapsed ? 'rotate-180' : ''"
        />
        {{ collapsed ? 'Expand' : 'Collapse' }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  collapsed?: boolean
}>()

defineEmits<{
  'update:collapsed': [value: boolean]
  'search': []
  'reset': []
}>()

const isDark = useIsDark()

const contentRef = ref<HTMLElement | null>(null)
const contentHeight = ref('0px')

const updateHeight = () => {
  if (contentRef.value) {
    contentHeight.value = contentRef.value.scrollHeight + 'px'
  }
}

onMounted(updateHeight)
onUpdated(updateHeight)

const containerClasses = computed(() =>
  isDark.value
    ? 'bg-[hsl(222.34,10.43%,12.27%)] border-[hsl(240,3.7%,22%)]'
    : 'bg-white border-slate-200'
)

const borderClasses = computed(() =>
  isDark.value
    ? 'border-[hsl(240,3.7%,22%)]'
    : 'border-slate-200'
)
</script>

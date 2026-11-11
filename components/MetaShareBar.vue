<template>
  <div class="flex items-center gap-2 min-w-[7rem]">
    <div class="flex-1 h-1.5 rounded-full overflow-hidden" :class="isDark ? 'bg-white/10' : 'bg-gray-200'" role="presentation">
      <div class="h-full rounded-full bg-brand-500" :style="{ width: Math.max(0, Math.min(100, percent)) + '%' }" />
    </div>
    <span class="tabular-nums text-xs shrink-0 w-9 text-right">{{ label }}</span>
  </div>
</template>

<script setup lang="ts">
defineProps<{ percent: number, label: string }>()
const isDark = useIsDark()
</script>

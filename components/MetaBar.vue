<template>
  <div
    class="h-2 w-full overflow-hidden rounded-sm"
    :class="tone.track.value"
    role="img"
    :aria-label="label"
  >
    <div
      class="h-full"
      :class="[color ? '' : tone.fill.value, outline ? 'ring-1 ring-inset ring-mg-fg-subtle/60' : '']"
      :style="{ width: `${clamped}%`, backgroundColor: color || undefined }"
    />
  </div>
</template>

<script setup lang="ts">
/** Horizontal share bar. `label` carries the number so the bar is never colour-only. */
const props = defineProps<{ percent: number, label: string, color?: string, outline?: boolean }>()
const tone = useMetaTone()
const clamped = computed(() => Math.max(0, Math.min(100, props.percent)))
</script>

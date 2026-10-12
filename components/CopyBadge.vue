<template>
  <button
    type="button"
    class="copy-badge inline-flex items-center gap-1 rounded px-0.5 font-mono text-[0.85rem] transition-colors hover:underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2"
    :class="isDark
      ? 'text-white focus-visible:outline-brand-300'
      : 'text-gray-950 focus-visible:outline-brand-700'"
    :aria-label="`Copy ${command}`"
    :data-copied="copied ? 'true' : undefined"
    @click="copy"
  >
    <span>{{ command }}</span>
    <UIcon
      :name="copied ? 'i-heroicons-check' : 'i-heroicons-clipboard-document'"
      class="size-3 shrink-0"
      :class="copied ? (isDark ? 'text-emerald-300' : 'text-emerald-700') : (isDark ? 'text-silver-400' : 'text-gray-600')"
      aria-hidden="true"
    />
    <span class="sr-only" aria-live="polite">{{ copied ? 'Copied' : '' }}</span>
  </button>
</template>

<script setup lang="ts">
const props = defineProps<{ command: string }>()
const isDark = useIsDark()
const toast = useToast()
const copied = ref(false)
let timer: ReturnType<typeof setTimeout> | undefined

async function copy() {
  try {
    await navigator.clipboard.writeText(props.command)
    copied.value = true
    toast.add({ title: `Copied ${props.command}`, icon: 'i-heroicons-check-circle', color: 'success', duration: 1800 })
    clearTimeout(timer)
    timer = setTimeout(() => { copied.value = false }, 1800)
  } catch {
    toast.add({ title: 'Copy failed', description: `Type ${props.command} in game chat.`, color: 'error', duration: 2500 })
  }
}
onBeforeUnmount(() => clearTimeout(timer))
</script>

<style scoped>
.copy-badge[data-copied] { animation: copy-pop 220ms ease-out; }
@keyframes copy-pop { 50% { transform: scale(1.06); } }
@media (prefers-reduced-motion: reduce) {
  .copy-badge[data-copied] { animation: none; }
}
</style>

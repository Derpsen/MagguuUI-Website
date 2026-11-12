<template>
  <!-- No transition-colors: inside content-visibility:auto cards an off-screen colour transition
       (SSR dark -> client light) stays frozen at white until painted (axe contrast failure, 2026-11-02). -->
  <button
    type="button"
    class="copy-badge inline-flex items-center gap-1 rounded px-0.5 font-mono text-[0.85rem] hover:underline underline-offset-4"
    :aria-label="`Copy ${command}`"
    :data-copied="copied ? 'true' : undefined"
    @click="copy"
  >
    <span>{{ command }}</span>
    <UIcon
      :name="copied ? 'i-heroicons-check' : 'i-heroicons-clipboard-document'"
      class="copy-badge__icon size-3 shrink-0"
      aria-hidden="true"
    />
    <span class="sr-only" aria-live="polite">{{ copied ? 'Copied' : '' }}</span>
  </button>
</template>

<script setup lang="ts">
const props = defineProps<{ command: string }>()
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
.copy-badge { color: var(--mg-fg); }
.copy-badge__icon { color: var(--mg-fg-muted); }
.copy-badge[data-copied] .copy-badge__icon { color: var(--mg-accent-text); }
.copy-badge[data-copied] { animation: copy-pop 220ms ease-out; }
@keyframes copy-pop { 50% { transform: scale(1.06); } }
@media (prefers-reduced-motion: reduce) {
  .copy-badge[data-copied] { animation: none; }
}
</style>

<script setup lang="ts">
const props = defineProps<{
  src: string
  alt: string
  caption: string
  width: number
  height: number
}>()

const isDark = useIsDark()
const open = ref(false)

function close() {
  open.value = false
}

function onKey(event: KeyboardEvent) {
  if (event.key === 'Escape') close()
}

watch(open, (value) => {
  if (!import.meta.client) return
  document.body.style.overflow = value ? 'hidden' : ''
})

onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKey)
  if (import.meta.client) document.body.style.overflow = ''
})
</script>

<template>
  <figure>
    <button
      type="button"
      class="block w-full cursor-zoom-in"
      :aria-label="`Open ${caption}`"
      @click="open = true"
    >
      <img
        :src="props.src"
        :alt="props.alt"
        :width="props.width"
        :height="props.height"
        class="w-full border"
        :class="isDark ? 'border-white/10' : 'border-gray-200'"
        loading="lazy"
        decoding="async"
      />
    </button>
    <figcaption class="mt-2 font-mono text-[11px] uppercase tracking-[0.14em]" :class="isDark ? 'text-brand-300' : 'text-brand-700'">
      {{ caption }}
    </figcaption>
    <Teleport to="body">
      <div
        v-if="open"
        class="fixed inset-0 z-[80] flex items-center justify-center bg-black/88 p-3 sm:p-8"
        role="dialog"
        aria-modal="true"
        :aria-label="caption"
        @click.self="close"
      >
        <button
          type="button"
          class="absolute top-3 right-3 px-3 py-1.5 text-xs font-medium border border-white/20 text-white"
          @click="close"
        >
          Close
        </button>
        <img
          :src="props.src"
          :alt="props.alt"
          :width="props.width"
          :height="props.height"
          class="max-h-[92vh] max-w-full object-contain"
        />
      </div>
    </Teleport>
  </figure>
</template>

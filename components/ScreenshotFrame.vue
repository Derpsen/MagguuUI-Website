<script setup lang="ts">
import { screenshotSrcset, screenshotVariant } from '~/utils/screenshots'

const props = defineProps<{
  src: string
  alt: string
  caption: string
  width: number
  height: number
  /** `sizes` for the inline srcset; the lightbox always uses the 2000w file. */
  sizes?: string
}>()

const sizes = computed(() => props.sizes || '(min-width: 1280px) 1200px, 100vw')

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
      <picture>
        <source type="image/avif" :srcset="screenshotSrcset(props.src, 'avif')" :sizes="sizes">
        <source type="image/webp" :srcset="screenshotSrcset(props.src, 'webp')" :sizes="sizes">
        <img
          :src="screenshotVariant(props.src, 1280, 'jpg')"
          :srcset="screenshotSrcset(props.src, 'jpg')"
          :sizes="sizes"
          :alt="props.alt"
          :width="props.width"
          :height="props.height"
          class="w-full border"
          :class="isDark ? 'border-white/10' : 'border-gray-200'"
          loading="lazy"
          decoding="async"
        />
      </picture>
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
        <button
          type="button"
          class="cursor-zoom-out"
          aria-label="Close"
          @click="close"
        >
          <picture>
            <source type="image/avif" :srcset="screenshotVariant(props.src, 2000, 'avif')">
            <source type="image/webp" :srcset="screenshotVariant(props.src, 2000, 'webp')">
            <img
              :src="screenshotVariant(props.src, 2000, 'jpg')"
              :alt="props.alt"
              :width="props.width"
              :height="props.height"
              class="max-h-[92vh] max-w-full object-contain"
            />
          </picture>
        </button>
      </div>
    </Teleport>
  </figure>
</template>

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
  /** Above the fold (home hero): load at once and with high priority. */
  eager?: boolean
  /** One plain sentence under the label, also shown in the lightbox. */
  description?: string
}>()

const sizes = computed(() => props.sizes || '(min-width: 1280px) 1200px, 100vw')

const isDark = useIsDark()
const open = ref(false)
const trigger = ref<HTMLButtonElement | null>(null)
const dialog = ref<HTMLElement | null>(null)
const closeButton = ref<HTMLButtonElement | null>(null)

function close() {
  open.value = false
}

/** Escape closes; Tab stays inside the dialog (its only controls are the two close buttons). */
function onKey(event: KeyboardEvent) {
  if (!open.value) return
  if (event.key === 'Escape') {
    close()
    return
  }
  if (event.key !== 'Tab' || !dialog.value) return
  const focusables = [...dialog.value.querySelectorAll<HTMLElement>('button')]
  if (!focusables.length) return
  const first = focusables[0]!
  const last = focusables[focusables.length - 1]!
  const active = document.activeElement
  if (event.shiftKey && (active === first || !dialog.value.contains(active))) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && (active === last || !dialog.value.contains(active))) {
    event.preventDefault()
    first.focus()
  }
}

watch(open, async (value) => {
  if (!import.meta.client) return
  document.body.style.overflow = value ? 'hidden' : ''
  await nextTick()
  if (value) closeButton.value?.focus()
  else trigger.value?.focus()
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
      ref="trigger"
      type="button"
      class="shot-trigger block w-full cursor-zoom-in"
      :aria-label="`Open ${caption} full size`"
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
          class="w-full border rounded-md"
          :class="isDark ? 'border-white/10' : 'border-gray-200'"
          :loading="props.eager ? 'eager' : 'lazy'"
          :fetchpriority="props.eager ? 'high' : undefined"
          decoding="async"
        />
      </picture>
    </button>
    <figcaption class="mt-2 text-sm">
      <span class="font-mono text-[11px] uppercase tracking-[0.14em]" :class="isDark ? 'text-brand-300' : 'text-brand-700'">{{ caption }}</span>
      <span v-if="description" class="block mt-0.5" :class="isDark ? 'text-silver-300' : 'text-gray-600'">{{ description }}</span>
    </figcaption>
    <Teleport to="body">
      <div
        v-if="open"
        ref="dialog"
        class="fixed inset-0 z-[80] flex flex-col items-center justify-center gap-3 bg-black/90 p-3 sm:p-8"
        role="dialog"
        aria-modal="true"
        :aria-label="caption"
        data-testid="screenshot-lightbox"
        @click.self="close"
      >
        <button
          ref="closeButton"
          type="button"
          class="absolute top-3 right-3 px-3 py-1.5 rounded-md text-xs font-medium border border-white/25 text-white hover:border-white/60"
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
              class="max-h-[84vh] max-w-full object-contain"
            />
          </picture>
        </button>
        <p class="text-sm text-white/85 text-center max-w-2xl">
          <span class="font-mono text-[11px] uppercase tracking-[0.14em] text-brand-200">{{ caption }}</span>
          <template v-if="description"> · {{ description }}</template>
        </p>
      </div>
    </Teleport>
  </figure>
</template>

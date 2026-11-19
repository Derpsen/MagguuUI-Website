<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="open" class="admin-settings-backdrop fixed inset-0 z-50" @click="close()" />
    </Transition>

    <Transition name="slide">
      <div
        v-if="open"
        ref="panelRef"
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-settings-title"
        data-testid="admin-settings-drawer"
        class="admin-settings-drawer fixed inset-y-0 right-0 z-50 flex w-[300px] flex-col border-l border-mg-line bg-mg-surface"
      >
        <div class="flex items-center justify-between px-5 py-4 border-b border-mg-line">
          <h2 id="admin-settings-title" class="text-sm font-semibold text-mg-fg" tabindex="-1">Settings</h2>
          <button
            type="button"
            class="p-1 rounded-md transition-colors text-mg-fg-muted hover:text-mg-fg hover:bg-mg-surface-2"
            aria-label="Close settings"
            @click="close()"
          >
            <UIcon name="i-heroicons-x-mark" class="h-4 w-4" />
          </button>
        </div>

        <div class="flex-1 overflow-y-auto px-5 py-5 space-y-6">
          <section>
            <h3 class="text-xs font-semibold uppercase tracking-wider mb-3 text-mg-accent-text">Theme</h3>
            <div class="flex gap-2">
              <button
                v-for="mode in themes"
                :key="mode.value"
                type="button"
                class="admin-settings-theme flex-1 flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold"
                :class="colorMode.preference === mode.value ? 'is-on' : ''"
                @click="colorMode.preference = mode.value"
              >
                <UIcon :name="mode.icon" class="h-3.5 w-3.5" />
                {{ mode.label }}
              </button>
            </div>
          </section>

          <section>
            <h3 class="text-xs font-semibold uppercase tracking-wider mb-3 text-mg-accent-text">Primary Color</h3>
            <div class="flex gap-2.5">
              <button
                v-for="color in colors"
                :key="color.name"
                type="button"
                class="admin-settings-swatch h-7 w-7 rounded-full ring-2 ring-offset-2 transition-all"
                :class="selectedColor === color.name ? 'is-on' : ''"
                :style="{ backgroundColor: color.hex }"
                :title="color.name"
                :aria-label="`Primary colour ${color.name}`"
                @click="applyColor(color.name)"
              />
            </div>
            <p class="mt-2 text-[11px] text-mg-fg-muted">Changes the accent color across all admin UI.</p>
          </section>

          <section>
            <h3 class="text-xs font-semibold uppercase tracking-wider mb-3 text-mg-accent-text">Layout</h3>
            <label class="flex items-center justify-between cursor-pointer">
              <span class="text-sm text-mg-fg">Compact sidebar</span>
              <USwitch v-model="compactSidebar" />
            </label>
          </section>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
const colorMode = useColorMode()

const open = ref(false)
const triggerEl = ref<HTMLElement | null>(null)
const panelRef = ref<HTMLElement | null>(null)

function isVisible(el: HTMLElement | null): boolean {
  if (!el?.isConnected) return false
  const style = getComputedStyle(el)
  if (style.display === 'none' || style.visibility === 'hidden') return false
  return el.getClientRects().length > 0
}

function focusables(root: HTMLElement): HTMLElement[] {
  return [...root.querySelectorAll<HTMLElement>(
    'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
  )].filter(el => isVisible(el))
}

function focusAfterClose(el: HTMLElement | null) {
  if (isVisible(el)) {
    el.focus()
    return
  }
  // After a resize to md+, the mobile More-actions trigger is hidden — use the desktop gear.
  const desktop = document.querySelector<HTMLElement>('[data-testid="admin-settings-trigger"]')
  if (isVisible(desktop)) desktop.focus()
}

function close() {
  if (!open.value) return
  open.value = false
  const el = triggerEl.value
  triggerEl.value = null
  nextTick(() => focusAfterClose(el))
}

function focusDrawer() {
  const root = panelRef.value
  if (!root) return
  const first = focusables(root)[0]
  if (first) first.focus()
  else root.querySelector<HTMLElement>('#admin-settings-title')?.focus()
}

function openFrom(el?: HTMLElement | null) {
  triggerEl.value = el ?? (import.meta.client ? document.activeElement as HTMLElement | null : null)
  open.value = true
  nextTick(() => focusDrawer())
}

function toggle() {
  if (open.value) close()
  else openFrom()
}

function onDocumentKeydown(event: KeyboardEvent) {
  if (!open.value) return
  if (event.key === 'Escape') {
    event.preventDefault()
    close()
    return
  }
  if (event.key !== 'Tab' || !panelRef.value) return
  const list = focusables(panelRef.value)
  if (!list.length) return
  const first = list[0]!
  const last = list[list.length - 1]!
  const active = document.activeElement
  if (event.shiftKey && (active === first || !panelRef.value.contains(active))) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && (active === last || !panelRef.value.contains(active))) {
    event.preventDefault()
    first.focus()
  }
}

watch(open, (isOpen) => {
  if (!import.meta.client) return
  if (isOpen) document.addEventListener('keydown', onDocumentKeydown)
  else document.removeEventListener('keydown', onDocumentKeydown)
})

onUnmounted(() => {
  if (import.meta.client) document.removeEventListener('keydown', onDocumentKeydown)
})

defineExpose({ toggle, openFrom, close })

const selectedColor = ref('blue')
const compactSidebar = defineModel<boolean>('compactSidebar', { default: false })

const themes = [
  { value: 'light', label: 'Light', icon: 'i-heroicons-sun' },
  { value: 'dark', label: 'Dark', icon: 'i-heroicons-moon' },
  { value: 'system', label: 'System', icon: 'i-heroicons-computer-desktop' },
] as const

// Full Tailwind color palettes (50-950) — injected directly onto :root as
// CSS custom properties so NuxtUI's --ui-color-primary-* variables resolve
// to the selected palette. We bypass the reactive appConfig route because
// NuxtUI's color plugin doesn't reliably update its <style> tag after the
// initial hydration pass.
const palettes: Record<string, Record<number, string>> = {
  blue:   { 50: '#eff6ff', 100: '#dbeafe', 200: '#bfdbfe', 300: '#93c5fd', 400: '#60a5fa', 500: '#3b82f6', 600: '#2563eb', 700: '#1d4ed8', 800: '#1e40af', 900: '#1e3a8a', 950: '#172554' },
  violet: { 50: '#f5f3ff', 100: '#ede9fe', 200: '#ddd6fe', 300: '#c4b5fd', 400: '#a78bfa', 500: '#8b5cf6', 600: '#7c3aed', 700: '#6d28d9', 800: '#5b21b6', 900: '#4c1d95', 950: '#2e1065' },
  green:  { 50: '#f0fdf4', 100: '#dcfce7', 200: '#bbf7d0', 300: '#86efac', 400: '#4ade80', 500: '#22c55e', 600: '#16a34a', 700: '#15803d', 800: '#166534', 900: '#14532d', 950: '#052e16' },
  orange: { 50: '#fff7ed', 100: '#ffedd5', 200: '#fed7aa', 300: '#fdba74', 400: '#fb923c', 500: '#f97316', 600: '#ea580c', 700: '#c2410c', 800: '#9a3412', 900: '#7c2d12', 950: '#431407' },
  rose:   { 50: '#fff1f2', 100: '#ffe4e6', 200: '#fecdd3', 300: '#fda4af', 400: '#fb7185', 500: '#f43f5e', 600: '#e11d48', 700: '#be123c', 800: '#9f1239', 900: '#881337', 950: '#4c0519' },
}

const colors = [
  { name: 'blue', hex: palettes.blue[500] },
  { name: 'violet', hex: palettes.violet[500] },
  { name: 'green', hex: palettes.green[500] },
  { name: 'orange', hex: palettes.orange[500] },
  { name: 'rose', hex: palettes.rose[500] },
]

function applyColor(color: string) {
  selectedColor.value = color
  const palette = palettes[color]
  if (!palette) return

  const root = document.documentElement
  // Override the NuxtUI --ui-color-primary-N variables directly on :root.
  // Inline styles beat any stylesheet, so this works regardless of what
  // NuxtUI's colors plugin does.
  for (const [shade, hex] of Object.entries(palette)) {
    root.style.setProperty(`--ui-color-primary-${shade}`, hex)
  }
  // Also keep appConfig in sync for components that read it directly.
  updateAppConfig({ ui: { colors: { primary: color } } })
  localStorage.setItem('admin-primary-color', color)
}

onMounted(() => {
  const saved = localStorage.getItem('admin-primary-color')
  if (saved && palettes[saved]) {
    selectedColor.value = saved
    applyColor(saved)
  }
})
</script>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

.slide-enter-active, .slide-leave-active { transition: transform 0.25s ease; }
.slide-enter-from, .slide-leave-to { transform: translateX(100%); }

.admin-settings-backdrop {
  background: color-mix(in srgb, var(--mg-bg) 45%, #000 55%);
}

.admin-settings-theme {
  border: 1px solid var(--mg-line);
  color: var(--mg-fg-muted);
  background: transparent;
  transition: background-color var(--mg-dur, 0.15s) var(--mg-ease, ease), color var(--mg-dur, 0.15s) var(--mg-ease, ease), border-color var(--mg-dur, 0.15s) var(--mg-ease, ease);
}
.admin-settings-theme:hover {
  color: var(--mg-fg);
  background: var(--mg-surface-2);
}
.admin-settings-theme.is-on {
  border-color: var(--mg-accent-text);
  color: var(--mg-accent-text);
  background: color-mix(in srgb, var(--mg-accent) 14%, var(--mg-surface));
}

.admin-settings-swatch {
  box-shadow: 0 0 0 2px transparent, 0 0 0 4px var(--mg-surface);
}
.admin-settings-swatch.is-on {
  box-shadow: 0 0 0 2px var(--mg-accent-text), 0 0 0 4px var(--mg-surface);
}
</style>

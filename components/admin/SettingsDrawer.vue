<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="open" class="fixed inset-0 z-50 bg-black/40" @click="open = false" />
    </Transition>

    <!-- Drawer -->
    <Transition name="slide">
      <div
        v-if="open"
        class="fixed inset-y-0 right-0 z-50 flex w-[300px] flex-col border-l"
        :class="isDark ? 'bg-[hsl(222.34,10.43%,12.27%)] border-[hsl(240,3.7%,22%)]' : 'bg-white border-slate-200'"
      >
        <!-- Header -->
        <div class="flex items-center justify-between px-5 py-4 border-b" :class="isDark ? 'border-[hsl(240,3.7%,22%)]' : 'border-slate-200'">
          <span class="text-sm font-semibold" :class="isDark ? 'text-white' : 'text-slate-900'">Settings</span>
          <button
            class="p-1 rounded-md transition-colors"
            :class="isDark ? 'text-white/50 hover:text-white hover:bg-white/[0.06]' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'"
            @click="open = false"
          >
            <UIcon name="i-heroicons-x-mark" class="h-4 w-4" />
          </button>
        </div>

        <!-- Content -->
        <div class="flex-1 overflow-y-auto px-5 py-5 space-y-6">
          <!-- Theme -->
          <section>
            <h3 class="text-xs font-semibold uppercase tracking-wider mb-3" :class="isDark ? 'text-white/40' : 'text-slate-400'">Theme</h3>
            <div class="flex gap-2">
              <button
                v-for="mode in themes"
                :key="mode.value"
                class="flex-1 flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium border transition-colors"
                :class="colorMode.preference === mode.value
                  ? 'bg-primary/15 border-primary/30 text-primary'
                  : (isDark ? 'border-white/8 text-white/50 hover:text-white hover:bg-white/[0.04]' : 'border-slate-200 text-slate-500 hover:text-slate-700 hover:bg-slate-50')"
                @click="colorMode.preference = mode.value"
              >
                <UIcon :name="mode.icon" class="h-3.5 w-3.5" />
                {{ mode.label }}
              </button>
            </div>
          </section>

          <!-- Primary Color -->
          <section>
            <h3 class="text-xs font-semibold uppercase tracking-wider mb-3" :class="isDark ? 'text-white/40' : 'text-slate-400'">Primary Color</h3>
            <div class="flex gap-2.5">
              <button
                v-for="color in colors"
                :key="color.name"
                class="h-7 w-7 rounded-full ring-2 ring-offset-2 transition-all"
                :class="[
                  selectedColor === color.name ? 'ring-current scale-110' : 'ring-transparent hover:scale-105',
                  isDark ? 'ring-offset-[hsl(222.34,10.43%,12.27%)]' : 'ring-offset-white',
                ]"
                :style="{ backgroundColor: color.hex, color: color.hex }"
                :title="color.name"
                @click="applyColor(color.name)"
              />
            </div>
            <p class="mt-2 text-[11px]" :class="isDark ? 'text-white/30' : 'text-slate-400'">Changes the accent color across all admin UI.</p>
          </section>

          <!-- Layout -->
          <section>
            <h3 class="text-xs font-semibold uppercase tracking-wider mb-3" :class="isDark ? 'text-white/40' : 'text-slate-400'">Layout</h3>
            <label class="flex items-center justify-between cursor-pointer">
              <span class="text-sm" :class="isDark ? 'text-white/70' : 'text-slate-600'">Compact sidebar</span>
              <USwitch v-model="compactSidebar" />
            </label>
          </section>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
const isDark = useIsDark()
const colorMode = useColorMode()

const open = ref(false)

function toggle() {
  open.value = !open.value
}

defineExpose({ toggle })

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
</style>

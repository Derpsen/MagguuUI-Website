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
                  ? (isDark ? 'bg-white/10 border-white/20 text-white' : 'bg-blue-50 border-blue-200 text-blue-700')
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
                @click="selectedColor = color.name"
              />
            </div>
            <p class="mt-2 text-[11px]" :class="isDark ? 'text-white/30' : 'text-slate-400'">Visual only -- not yet wired to theme.</p>
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

const colors = [
  { name: 'blue', hex: '#3b82f6' },
  { name: 'violet', hex: '#8b5cf6' },
  { name: 'green', hex: '#22c55e' },
  { name: 'orange', hex: '#f97316' },
  { name: 'rose', hex: '#f43f5e' },
]
</script>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

.slide-enter-active, .slide-leave-active { transition: transform 0.25s ease; }
.slide-enter-from, .slide-leave-to { transform: translateX(100%); }
</style>

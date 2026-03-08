<!--
  Keyboard Shortcuts — Overlay Modal + Global Listener
  Press ? to open, g+key for navigation, n for new item
-->

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-150 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-100 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0">
      <div v-if="isOpen" class="fixed inset-0 z-[100] flex items-center justify-center p-4" @click.self="isOpen = false">
        <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" />
        <div class="relative w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden"
          :class="isDark ? 'bg-brand-800 border border-brand-400/15' : 'bg-white border border-gray-200'">

          <!-- Header -->
          <div class="flex items-center justify-between px-6 py-4 border-b"
            :class="isDark ? 'border-brand-400/10' : 'border-gray-100'">
            <div class="flex items-center gap-3">
              <div class="w-8 h-8 rounded-lg flex items-center justify-center"
                :class="isDark ? 'bg-brand-400/10' : 'bg-blue-50'">
                <UIcon name="i-heroicons-command-line" class="w-4 h-4" :class="isDark ? 'text-brand-300' : 'text-blue-600'" />
              </div>
              <h2 class="text-base font-semibold" :class="isDark ? 'text-white' : 'text-gray-900'">Keyboard Shortcuts</h2>
            </div>
            <button @click="isOpen = false"
              class="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
              :class="isDark ? 'text-silver-500 hover:text-white hover:bg-white/5' : 'text-gray-400 hover:text-gray-900 hover:bg-gray-100'">
              <UIcon name="i-heroicons-x-mark" class="w-4 h-4" />
            </button>
          </div>

          <!-- Content -->
          <div class="px-6 py-4 space-y-5 max-h-[60vh] overflow-y-auto">
            <div v-for="group in shortcutGroups" :key="group.title">
              <p class="text-[11px] font-semibold uppercase tracking-wider mb-2.5"
                :class="isDark ? 'text-silver-500' : 'text-gray-400'">
                {{ group.title }}
              </p>
              <div class="space-y-1.5">
                <div v-for="s in group.items" :key="s.label"
                  class="flex items-center justify-between py-1.5 px-2 rounded-lg"
                  :class="isDark ? 'hover:bg-white/[0.02]' : 'hover:bg-gray-50'">
                  <span class="text-sm" :class="isDark ? 'text-silver-300' : 'text-gray-600'">{{ s.label }}</span>
                  <div class="flex items-center gap-1">
                    <kbd v-for="(key, ki) in s.keys" :key="ki"
                      class="min-w-[24px] h-6 px-1.5 text-[11px] font-medium rounded flex items-center justify-center"
                      :class="isDark ? 'bg-brand-900/60 text-silver-400 border border-brand-400/10' : 'bg-gray-100 text-gray-500 border border-gray-200'">
                      {{ key }}
                    </kbd>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Footer -->
          <div class="px-6 py-3 border-t text-center"
            :class="isDark ? 'border-brand-400/10' : 'border-gray-100'">
            <p class="text-xs" :class="isDark ? 'text-silver-600' : 'text-gray-400'">
              Press <kbd class="px-1 py-0.5 rounded text-[10px] font-medium"
                :class="isDark ? 'bg-brand-900/60 text-silver-400 border border-brand-400/10' : 'bg-gray-100 text-gray-500 border border-gray-200'">Esc</kbd> to close
            </p>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
const router = useRouter()
const isDark = useIsDark()
const isOpen = ref(false)
let gPending = false
let gTimer: ReturnType<typeof setTimeout> | null = null

const shortcutGroups = [
  {
    title: 'General',
    items: [
      { label: 'Show shortcuts', keys: ['?'] },
      { label: 'Search', keys: ['\u2318', 'K'] },
    ],
  },
  {
    title: 'Navigation',
    items: [
      { label: 'Go to Dashboard', keys: ['G', 'D'] },
      { label: 'Go to Profiles', keys: ['G', 'P'] },
      { label: 'Go to WowUp', keys: ['G', 'W'] },
      { label: 'Go to Layouts', keys: ['G', 'L'] },
      { label: 'Go to Settings', keys: ['G', 'S'] },
      { label: 'Go to Activity', keys: ['G', 'A'] },
      { label: 'Go to Changelog', keys: ['G', 'C'] },
      { label: 'Go to Statistics', keys: ['G', 'T'] },
    ],
  },
]

const navMap: Record<string, string> = {
  d: '/admin',
  p: '/admin/strings/profiles',
  w: '/admin/strings/wowup',
  l: '/admin/strings/layouts',
  s: '/admin/system/settings',
  a: '/admin/system/activity',
  c: '/admin/content/changelog',
  t: '/admin/system/stats',
}

function handleKeydown(e: KeyboardEvent) {
  // Ignore when typing in inputs
  const tag = (e.target as HTMLElement)?.tagName?.toLowerCase()
  if (tag === 'input' || tag === 'textarea' || tag === 'select' || (e.target as HTMLElement)?.isContentEditable) return

  // Close on Escape
  if (e.key === 'Escape' && isOpen.value) {
    isOpen.value = false
    return
  }

  // Don't intercept when modal is open (except Escape)
  if (isOpen.value) return

  // ? → open shortcuts
  if (e.key === '?' || (e.shiftKey && e.key === '/')) {
    e.preventDefault()
    isOpen.value = true
    return
  }

  // g prefix → start navigation combo
  if (e.key === 'g' && !e.metaKey && !e.ctrlKey && !e.altKey) {
    if (gPending) return
    gPending = true
    gTimer = setTimeout(() => { gPending = false }, 800)
    return
  }

  // Second key after g
  if (gPending) {
    gPending = false
    if (gTimer) clearTimeout(gTimer)
    const dest = navMap[e.key.toLowerCase()]
    if (dest) {
      e.preventDefault()
      router.push(dest)
    }
    return
  }
}

defineExpose({ open: () => { isOpen.value = true }, close: () => { isOpen.value = false } })

onMounted(() => {
  if (import.meta.client) {
    document.addEventListener('keydown', handleKeydown)
  }
})

onUnmounted(() => {
  if (import.meta.client) {
    document.removeEventListener('keydown', handleKeydown)
    if (gTimer) clearTimeout(gTimer)
  }
})
</script>

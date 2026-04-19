<!--
  Error Page — Custom 404 and error handling
-->

<template>
  <div class="min-h-screen flex items-center justify-center px-4 transition-colors duration-300"
    :class="isDark ? 'bg-brand-950' : 'bg-[#f0f4f8]'">
    <div class="text-center max-w-md">
      <!-- Error Code -->
      <p class="text-8xl font-extrabold text-gradient mb-4">
        {{ error?.statusCode || 404 }}
      </p>

      <!-- Title -->
      <h1 class="text-2xl font-bold mb-3" :class="isDark ? 'text-white' : 'text-gray-900'">
        {{ errorTitle }}
      </h1>

      <!-- Description -->
      <p class="mb-8 leading-relaxed" :class="isDark ? 'text-silver-400' : 'text-gray-500'">
        {{ errorDesc }}
      </p>

      <!-- Actions -->
      <div class="flex items-center justify-center gap-4">
        <NuxtLink to="/" class="btn-gradient px-6 py-3 rounded-xl text-white font-semibold inline-flex items-center gap-2">
          <svg aria-hidden="true" class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          Home
        </NuxtLink>
        <button @click="handleError" class="px-6 py-3 rounded-xl font-semibold transition-all inline-flex items-center gap-2"
          :class="isDark ? 'text-silver-300 hover:text-white' : 'text-gray-600 hover:text-gray-900'"
          :style="isDark ? 'background: rgba(32, 28, 24, 0.6); border: 1px solid rgba(201, 135, 106, 0.1);' : 'background: rgba(255, 255, 255, 0.8); border: 1px solid rgba(201, 135, 106, 0.12);'">
          Go Back
        </button>
      </div>

      <!-- MagguuUI Logo -->
      <div class="mt-12 opacity-30">
        <img src="/logo.svg" alt="MagguuUI" width="40" height="40" loading="lazy" class="w-10 h-10 mx-auto" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const error = useError()
const isDark = useIsDark()
const router = useRouter()

useSeoMeta({
  robots: 'noindex, nofollow',
})

const errorTitle = computed(() => {
  const code = error.value?.statusCode
  if (code === 404) return 'Page not found'
  if (code === 500) return 'Server error'
  if (code === 403) return 'Access denied'
  return 'Something went wrong'
})

const errorDesc = computed(() => {
  const code = error.value?.statusCode
  if (code === 404) return 'The page you are looking for does not exist or has been moved.'
  if (code === 500) return 'An internal error occurred. Please try again later.'
  return error.value?.message || 'Unknown error'
})

function handleError() {
  if (import.meta.client && window.history.length > 1) {
    clearError()
    router.back()
    return
  }

  clearError({ redirect: '/' })
}
</script>

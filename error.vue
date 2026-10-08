<!--
  Error Page — Custom 404 and error handling
-->

<template>
  <div class="min-h-screen flex items-center px-6 transition-colors duration-300"
    :class="isDark ? 'bg-[#0b1118] text-silver-300' : 'bg-[#eef4fb] text-gray-700'">
    <div class="max-w-md">
      <p class="font-mono text-sm" :class="isDark ? 'text-brand-300' : 'text-brand-700'">
        {{ error?.statusCode || 404 }}
      </p>
      <h1 class="mt-2 text-3xl font-semibold tracking-tight" :class="isDark ? 'text-white' : 'text-gray-950'">
        {{ errorTitle }}
      </h1>
      <p class="mt-3 leading-relaxed">
        {{ errorDesc }}
      </p>
      <div class="mt-6 flex items-center gap-5 text-sm font-semibold">
        <button type="button" class="underline underline-offset-4" :class="isDark ? 'text-white' : 'text-gray-950'" @click="goHome">
          Home
        </button>
        <button type="button" class="underline underline-offset-4" :class="isDark ? 'text-silver-400' : 'text-gray-500'" @click="handleError">
          Go Back
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const error = useError()
const router = useRouter()
const isDark = computed(() => {
  if (!import.meta.client) return true
  return document.documentElement.classList.contains('dark')
})

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

function goHome() {
  // clearError({ redirect: '/' }) can leave SPA clients on /home (404) after a
  // fatal error — especially from admin routes with ssr:false. Hard-nav to /.
  clearError()
  if (import.meta.client) {
    window.location.assign('/')
    return
  }
  return navigateTo('/', { external: true })
}

function handleError() {
  if (import.meta.client && window.history.length > 1) {
    clearError()
    router.back()
    return
  }

  goHome()
}
</script>

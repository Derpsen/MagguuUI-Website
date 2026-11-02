<!--
  Error Page — Custom 404 and error handling
-->

<template>
  <!-- Same header, nav and footer as every public page (2026-11-02); content centred; Dark and Light. -->
  <NuxtLayout name="default">
    <div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 min-h-[50vh] flex items-center justify-center py-20">
      <div class="max-w-md text-center" data-testid="error-page">
        <p class="font-mono text-sm" :class="isDark ? 'text-brand-300' : 'text-brand-700'">
          {{ error?.statusCode || 404 }}
        </p>
        <h1 class="mt-2 text-3xl font-semibold tracking-tight" :class="isDark ? 'text-white' : 'text-gray-950'">
          {{ errorTitle }}
        </h1>
        <p class="mt-3 leading-relaxed" :class="isDark ? 'text-silver-300' : 'text-gray-600'">
          {{ errorDesc }}
        </p>
        <div class="mt-6 flex items-center justify-center gap-5 text-sm font-semibold">
          <button type="button" class="underline underline-offset-4" :class="isDark ? 'text-white' : 'text-gray-950'" @click="goHome">
            Home
          </button>
          <button type="button" class="underline underline-offset-4" :class="isDark ? 'text-silver-400' : 'text-gray-500'" @click="handleError">
            Go back
          </button>
        </div>
      </div>
    </div>
  </NuxtLayout>
</template>

<script setup lang="ts">
const error = useError()
const router = useRouter()
const isDark = useIsDark()

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

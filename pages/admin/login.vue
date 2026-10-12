<!--
  Admin Login Page — Password + Passkey
-->

<template>
  <div class="admin-login min-h-screen flex items-center px-4 py-8"
    :class="isDark ? 'bg-[#0b1118] text-silver-200' : 'bg-[#eef4fb] text-gray-800'">

    <div class="relative z-10 w-full max-w-6xl mx-auto grid gap-6 lg:grid-cols-[1.05fr_0.95fr] items-center">
      <section class="hidden lg:block pr-6">
        <div class="mb-6">
          <img src="/favicon-32.png" alt="MagguuUI" class="h-10 w-10 mb-5">
        </div>

        <p class="font-mono text-[11px] uppercase tracking-[0.16em] mb-3" :class="isDark ? 'text-brand-300' : 'text-brand-700'">Admin</p>
        <h1 class="text-4xl lg:text-5xl font-semibold tracking-tight leading-tight mb-4" :class="isDark ? 'text-white' : 'text-gray-950'">
          Welcome back
        </h1>
        <p class="text-base lg:text-lg max-w-lg leading-relaxed" :class="isDark ? 'text-silver-300' : 'text-gray-600'">
          Sign in to manage import strings, content and site settings.
        </p>

        <div class="mt-10 max-w-lg space-y-5 border-t pt-8" :class="isDark ? 'border-white/10' : 'border-gray-200'">
          <div v-for="item in loginHighlights" :key="item.title">
            <p class="font-mono text-[11px] uppercase tracking-[0.14em] mb-1.5" :class="isDark ? 'text-brand-300' : 'text-brand-700'">{{ item.title }}</p>
            <p class="text-sm leading-relaxed" :class="isDark ? 'text-silver-300' : 'text-gray-700'">{{ item.text }}</p>
          </div>
        </div>
      </section>

      <section class="py-2 lg:pl-12 lg:border-l max-w-md lg:max-w-none mx-auto w-full"
        :class="isDark ? 'border-white/10' : 'border-gray-200'">
        <div class="flex items-center justify-between gap-3 mb-8">
          <div class="flex items-start gap-3 min-w-0">
            <img src="/favicon-32.png" alt="MagguuUI" width="40" height="40" class="h-10 w-10 shrink-0 lg:hidden">
            <div class="min-w-0">
            <h2 class="font-mono text-[11px] uppercase tracking-[0.14em] mb-1.5" :class="isDark ? 'text-brand-300' : 'text-brand-700'">Sign in</h2>
            <p class="text-sm" :class="isDark ? 'text-silver-300' : 'text-gray-600'">
              Enter your credentials to access the admin panel.
            </p>
            </div>
          </div>

          <button type="button" class="p-2 rounded-md transition-colors"
            :class="isDark ? 'text-silver-300 hover:text-white hover:bg-white/[0.06]' : 'text-gray-600 hover:text-gray-950 hover:bg-gray-100'"
            :title="isDark ? 'Light mode' : 'Dark mode'"
            :aria-label="isDark ? 'Switch to light mode' : 'Switch to dark mode'"
            @click="toggleTheme">
            <UIcon :name="isDark ? 'i-heroicons-sun' : 'i-heroicons-moon'" class="w-4.5 h-4.5" />
          </button>
        </div>

        <div v-if="passkeySupported" class="mb-5">
          <UButton block size="lg" variant="outline" color="neutral" :loading="passkeyLoading" @click="handlePasskeyLogin"
            :disabled="!hasPasskeys && !passkeyLoading">
            <template #leading>
              <UIcon name="i-heroicons-finger-print" class="w-5 h-5" />
            </template>
            Sign in with Passkey
          </UButton>
          <p v-if="!hasPasskeys && !passkeyLoading" class="text-[11px] text-center mt-2" :class="isDark ? 'text-silver-400' : 'text-gray-600'">
            No passkeys registered yet
          </p>
        </div>

        <div v-if="passkeySupported" class="flex items-center gap-3 mb-5">
          <div class="flex-1 h-px" :class="isDark ? 'bg-white/10' : 'bg-gray-200'" />
          <span class="text-xs font-medium" :class="isDark ? 'text-silver-400' : 'text-gray-600'">or use password</span>
          <div class="flex-1 h-px" :class="isDark ? 'bg-white/10' : 'bg-gray-200'" />
        </div>

        <form class="space-y-4" novalidate @submit.prevent="handleLogin">
          <div>
            <label for="login-username" class="block text-sm font-medium mb-1.5" :class="isDark ? 'text-silver-200' : 'text-gray-800'">Username</label>
            <UInput id="login-username" v-model="form.username" name="username" autocomplete="username" placeholder="admin" icon="i-heroicons-user" size="lg" autofocus @update:model-value="error = ''" />
          </div>
          <div>
            <label for="login-password" class="block text-sm font-medium mb-1.5" :class="isDark ? 'text-silver-200' : 'text-gray-800'">Password</label>
            <UInput id="login-password" v-model="form.password" type="password" name="password" autocomplete="current-password" placeholder="••••••••" icon="i-heroicons-lock-closed" size="lg" @update:model-value="error = ''" />
          </div>
          <UAlert v-if="error" :color="isLocked ? 'warning' : 'error'" variant="subtle" role="alert" aria-live="polite" :icon="isLocked ? 'i-heroicons-lock-closed' : 'i-heroicons-exclamation-circle'" :title="error" />
          <UButton type="submit" block size="lg" :loading="loading">Sign In</UButton>
        </form>

        <div class="flex items-center justify-between gap-3 mt-6 pt-5 border-t"
          :class="isDark ? 'border-white/10' : 'border-gray-200'">
          <NuxtLink to="/" class="text-sm underline-offset-4 hover:underline"
            :class="isDark ? 'text-silver-300 hover:text-white' : 'text-gray-700 hover:text-gray-950'">
            Back to website
          </NuxtLink>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: false })

useSeoMeta({
  title: 'Login | MagguuUI',
  description: 'Sign in to the MagguuUI admin.',
  robots: 'noindex, nofollow',
})
const router = useRouter()
const colorMode = useColorMode()
const { login, isLoggedIn, restoreSession, setSession } = useAuth()
const isDark = useIsDark()
function toggleTheme() { colorMode.preference = isDark.value ? 'light' : 'dark' }

const form = reactive({ username: '', password: '' })
const loading = ref(false)
const passkeyLoading = ref(false)
const error = ref('')
const isLocked = computed(() => error.value === 'Account temporarily locked. Try again in 30 minutes.')
const hasPasskeys = ref(false)
const loginHighlights = [
  {
    icon: 'i-heroicons-book-open',
    title: 'Guided setup',
    text: 'Follow a clean install flow for your main character and keep alt setup predictable.',
  },
  {
    icon: 'i-heroicons-bolt',
    title: 'Curated imports',
    text: 'Profiles, packages and copy-ready strings stay organized instead of scattered across tools.',
  },
  {
    icon: 'i-heroicons-sparkles',
    title: 'Clear updates',
    text: 'Latest changes stay visible so you know what changed before importing again.',
  },
]

// Check WebAuthn support
const passkeySupported = ref(false)

async function checkPasskeys() {
  try {
    const res = await $fetch<{ meta?: { hasPasskeys?: boolean } }>('/api/v1/auth/webauthn/login-options', { method: 'POST' })
    hasPasskeys.value = res?.meta?.hasPasskeys || false
  } catch { hasPasskeys.value = false }
}

// ─── Password Login ────────────────────────
async function handleLogin() {
  if (!form.username || !form.password) { error.value = 'Please enter username and password'; return }
  loading.value = true; error.value = ''
  try { await login(form.username, form.password); router.push('/admin') }
  catch (e: unknown) {
    const status = errorStatus(e)
    if (status === 423) {
      error.value = 'Account temporarily locked. Try again in 30 minutes.'
    } else if (status === 429) {
      error.value = 'Too many attempts. Please wait and try again.'
    } else {
      error.value = errorMessage(e, 'Invalid credentials')
    }
  }
  finally { loading.value = false }
}

// ─── Passkey Login ─────────────────────────
async function handlePasskeyLogin() {
  passkeyLoading.value = true; error.value = ''
  try {
    // 1. Get authentication options from server
    const optionsRes = await $fetch<{ data?: import('@simplewebauthn/browser').PublicKeyCredentialRequestOptionsJSON }>('/api/v1/auth/webauthn/login-options', { method: 'POST' })
    if (!optionsRes?.data) {
      error.value = 'No passkeys registered yet'
      return
    }

    // 2. Start browser WebAuthn ceremony
    const { startAuthentication } = await import('@simplewebauthn/browser')
    const credential = await startAuthentication({ optionsJSON: optionsRes.data })

    // 3. Verify with server
    interface VerifyResponse {
      data?: {
        user?: { id: number, username: string, role: string }
        token?: string
      }
    }
    const verifyRes = await $fetch<VerifyResponse>('/api/v1/auth/webauthn/login-verify', {
      method: 'POST',
      body: { credential },
    })

    if (!verifyRes?.data?.user) {
      throw new Error('Passkey authentication failed')
    }

    // 4. Store auth data via shared auth composable
    setSession(verifyRes.data)
    router.push('/admin')
  } catch (e: unknown) {
    // User cancelled or error
    if (asApiError(e).name === 'NotAllowedError') {
      error.value = 'Passkey authentication cancelled'
    } else {
      const status = errorStatus(e)
      if (status === 423) {
        error.value = 'Account temporarily locked. Try again in 30 minutes.'
      } else if (status === 429) {
        error.value = 'Too many attempts. Please wait and try again.'
      } else {
        error.value = errorMessage(e, 'Passkey authentication failed')
      }
    }
  } finally { passkeyLoading.value = false }
}

onMounted(async () => {
  if (isLoggedIn.value || await restoreSession()) {
    router.replace('/admin')
    return
  }

  passkeySupported.value = !!window.PublicKeyCredential
  if (passkeySupported.value) {
    await checkPasskeys()
  }
})
</script>

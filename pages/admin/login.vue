<!--
  Admin Login Page — Password + Passkey
-->

<template>
  <div class="min-h-screen flex items-center px-4 py-8 transition-colors duration-300"
    :class="isDark ? 'bg-[hsl(220,13.06%,9%)] text-slate-200' : 'bg-[hsl(216,20%,95.5%)] text-slate-800'">

    <div class="relative z-10 w-full max-w-6xl mx-auto grid gap-6 lg:grid-cols-[1.05fr_0.95fr] items-center">
      <section class="hidden lg:block pr-6">
        <div class="mb-6">
          <img src="/logo.svg" alt="MagguuUI" class="h-10 w-10 mb-5">
        </div>

        <h1 class="text-4xl lg:text-5xl font-bold leading-tight mb-4" :class="isDark ? 'text-white' : 'text-slate-900'">
          Welcome back
        </h1>
        <p class="text-base lg:text-lg max-w-lg leading-relaxed" :class="isDark ? 'text-slate-400' : 'text-slate-500'">
          Sign in to manage import strings, content and site settings.
        </p>

        <div class="grid gap-3 mt-8 max-w-lg">
          <div v-for="item in loginHighlights" :key="item.title"
            class="rounded-xl p-4 flex items-start gap-3 border"
            :class="isDark ? 'border-white/8 bg-white/[0.03]' : 'border-slate-200 bg-white'">
            <span class="inline-flex items-center justify-center w-10 h-10 rounded-lg flex-shrink-0"
              :class="isDark ? 'bg-blue-500/12 text-blue-400' : 'bg-blue-50 text-blue-600'">
              <UIcon :name="item.icon" class="w-5 h-5" />
            </span>
            <div>
              <p class="text-sm font-semibold mb-0.5" :class="isDark ? 'text-white' : 'text-slate-900'">{{ item.title }}</p>
              <p class="text-sm leading-relaxed" :class="isDark ? 'text-slate-400' : 'text-slate-500'">{{ item.text }}</p>
            </div>
          </div>
        </div>
      </section>

      <section class="rounded-2xl border p-6 sm:p-8 lg:p-10 max-w-md lg:max-w-none mx-auto w-full"
        :class="isDark ? 'bg-[hsl(222.34,10.43%,12.27%)] border-[hsl(240,3.7%,22%)]' : 'bg-white border-slate-200 shadow-sm'">
        <div class="flex items-center justify-between gap-3 mb-8">
          <div>
            <h2 class="text-xl font-semibold mb-1" :class="isDark ? 'text-white' : 'text-slate-900'">Sign in</h2>
            <p class="text-sm" :class="isDark ? 'text-slate-400' : 'text-slate-500'">
              Enter your credentials to access the admin panel.
            </p>
          </div>

          <button class="p-2 rounded-lg transition-colors"
            :class="isDark ? 'text-slate-400 hover:text-white hover:bg-white/[0.06]' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'"
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
          <p v-if="!hasPasskeys && !passkeyLoading" class="text-[11px] text-center mt-2" :class="isDark ? 'text-slate-500' : 'text-slate-400'">
            No passkeys registered yet
          </p>
        </div>

        <div v-if="passkeySupported" class="flex items-center gap-3 mb-5">
          <div class="flex-1 h-px" :class="isDark ? 'bg-white/8' : 'bg-slate-200'" />
          <span class="text-xs font-medium" :class="isDark ? 'text-slate-500' : 'text-slate-400'">or use password</span>
          <div class="flex-1 h-px" :class="isDark ? 'bg-white/8' : 'bg-slate-200'" />
        </div>

        <form class="space-y-4" novalidate @submit.prevent="handleLogin">
          <div>
            <label for="login-username" class="block text-sm font-medium mb-1.5" :class="isDark ? 'text-slate-300' : 'text-slate-700'">Username</label>
            <UInput id="login-username" v-model="form.username" name="username" autocomplete="username" placeholder="admin" icon="i-heroicons-user" size="lg" autofocus @update:model-value="error = ''" />
          </div>
          <div>
            <label for="login-password" class="block text-sm font-medium mb-1.5" :class="isDark ? 'text-slate-300' : 'text-slate-700'">Password</label>
            <UInput id="login-password" v-model="form.password" type="password" name="password" autocomplete="current-password" placeholder="••••••••" icon="i-heroicons-lock-closed" size="lg" @update:model-value="error = ''" />
          </div>
          <UAlert v-if="error" :color="isLocked ? 'warning' : 'error'" variant="subtle" role="alert" aria-live="polite" :icon="isLocked ? 'i-heroicons-lock-closed' : 'i-heroicons-exclamation-circle'" :title="error" />
          <UButton type="submit" block size="lg" :loading="loading">Sign In</UButton>
        </form>

        <div class="flex items-center justify-between gap-3 mt-6 pt-5 border-t"
          :class="isDark ? 'border-white/8' : 'border-slate-200'">
          <NuxtLink to="/" class="text-sm transition-colors"
            :class="isDark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'">
            Back to website
          </NuxtLink>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: false })
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

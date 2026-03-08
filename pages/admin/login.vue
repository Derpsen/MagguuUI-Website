<!--
  Admin Login Page — Password + Passkey
-->

<template>
  <div class="admin-shell min-h-screen flex items-center px-4 py-8 transition-colors duration-300"
    :class="isDark ? 'bg-brand-950 text-silver-200' : 'bg-[#eef4fb] text-gray-800'">
    <div class="admin-grid-overlay" />

    <div class="relative z-10 w-full max-w-6xl mx-auto grid gap-6 lg:grid-cols-[1.05fr_0.95fr] items-center">
      <section class="hidden lg:block pr-6">
        <span class="inline-flex items-center gap-2 rounded-full px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] mb-5"
          :class="isDark ? 'bg-white/[0.04] border border-white/8 text-brand-300' : 'bg-white border border-blue-100 text-blue-700 shadow-sm'">
          <UIcon name="i-heroicons-shield-check" class="w-4 h-4" />
          Admin Access
        </span>

        <h1 class="text-4xl lg:text-5xl font-bold leading-tight mb-4">
          <span class="text-gradient">Modern control,</span><br>
          <span :class="isDark ? 'text-white' : 'text-gray-900'">without admin clutter.</span>
        </h1>
        <p class="text-base lg:text-lg max-w-xl leading-relaxed" :class="isDark ? 'text-silver-400' : 'text-gray-600'">
          Manage content, imports and system settings from one place. Passkeys are first-class, the shell stays fast, and the workflow remains focused on publishing instead of digging through menus.
        </p>

        <div class="grid gap-3 mt-8 max-w-xl">
          <div v-for="item in loginHighlights" :key="item.title"
            class="surface-panel rounded-2xl p-4 flex items-start gap-3">
            <span class="inline-flex items-center justify-center w-11 h-11 rounded-2xl flex-shrink-0"
              :class="isDark ? 'bg-white/[0.05] border border-white/8 text-brand-300' : 'bg-blue-50 border border-blue-100 text-blue-700'">
              <UIcon :name="item.icon" class="w-5 h-5" />
            </span>
            <div>
              <p class="text-sm font-semibold mb-1" :class="isDark ? 'text-white' : 'text-gray-900'">{{ item.title }}</p>
              <p class="text-sm leading-relaxed" :class="isDark ? 'text-silver-400' : 'text-gray-600'">{{ item.text }}</p>
            </div>
          </div>
        </div>
      </section>

      <section class="surface-panel rounded-[2rem] p-6 sm:p-8 lg:p-10 max-w-md lg:max-w-none mx-auto w-full">
        <div class="flex items-center justify-between gap-3 mb-6">
          <div class="flex items-center gap-3">
            <span class="inline-flex items-center justify-center w-14 h-14 rounded-[1.35rem]"
              :class="isDark ? 'bg-white/[0.05] border border-white/8' : 'bg-white border border-blue-100 shadow-sm'">
              <img :src="'/logo.svg'" alt="MagguuUI" class="w-9 h-9" />
            </span>
            <div>
              <p class="text-[11px] font-semibold uppercase tracking-[0.18em]" :class="isDark ? 'text-silver-500' : 'text-gray-500'">Control Center</p>
              <h1 class="text-2xl font-bold text-gradient">MagguuUI Admin</h1>
            </div>
          </div>

          <button class="admin-icon-button"
            :class="isDark ? 'text-silver-400 hover:text-white hover:bg-white/[0.06] border border-white/8' : 'text-gray-500 hover:text-gray-900 hover:bg-white border border-blue-100 shadow-sm'"
            @click="toggleTheme">
            <UIcon :name="isDark ? 'i-heroicons-sun' : 'i-heroicons-moon'" class="w-4.5 h-4.5" />
          </button>
        </div>

        <div class="mb-6">
          <h2 class="text-xl font-semibold mb-2" :class="isDark ? 'text-white' : 'text-gray-900'">Sign in to continue</h2>
          <p class="text-sm leading-relaxed" :class="isDark ? 'text-silver-400' : 'text-gray-600'">
            Use your passkey when available or fall back to password login. Security features and rate limits stay active either way.
          </p>
        </div>

        <div v-if="passkeySupported" class="rounded-2xl p-4 mb-5"
          :class="isDark ? 'bg-emerald-500/8 border border-emerald-400/15' : 'bg-emerald-50 border border-emerald-200'">
          <div class="flex items-start gap-3">
            <span class="inline-flex items-center justify-center w-10 h-10 rounded-2xl flex-shrink-0"
              :class="isDark ? 'bg-emerald-500/12 text-emerald-300' : 'bg-white text-emerald-700 border border-emerald-200'">
              <UIcon name="i-heroicons-finger-print" class="w-5 h-5" />
            </span>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-semibold mb-1" :class="isDark ? 'text-white' : 'text-gray-900'">Passkey sign-in</p>
              <p class="text-xs sm:text-sm mb-3" :class="isDark ? 'text-silver-400' : 'text-gray-600'">
                Faster sign-in with biometric or device-backed credentials.
              </p>
              <UButton block size="lg" variant="subtle" color="success" :loading="passkeyLoading" @click="handlePasskeyLogin"
                :disabled="!hasPasskeys && !passkeyLoading">
                <template #leading>
                  <UIcon name="i-heroicons-finger-print" class="w-5 h-5" />
                </template>
                Sign in with Passkey
              </UButton>
              <p v-if="!hasPasskeys && !passkeyLoading" class="text-[11px] text-center mt-2" :class="isDark ? 'text-silver-600' : 'text-gray-500'">
                No passkeys registered yet
              </p>
            </div>
          </div>
        </div>

        <div v-if="passkeySupported" class="flex items-center gap-3 mb-5">
          <div class="flex-1 h-px" :class="isDark ? 'bg-white/8' : 'bg-blue-100'" />
          <span class="text-xs font-medium uppercase tracking-[0.14em]" :class="isDark ? 'text-silver-600' : 'text-gray-400'">Or use password</span>
          <div class="flex-1 h-px" :class="isDark ? 'bg-white/8' : 'bg-blue-100'" />
        </div>

        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium mb-1.5" :class="isDark ? 'text-silver-300' : 'text-gray-700'">Username</label>
            <UInput v-model="form.username" placeholder="admin" icon="i-heroicons-user" size="lg" autofocus @keyup.enter="handleLogin" />
          </div>
          <div>
            <label class="block text-sm font-medium mb-1.5" :class="isDark ? 'text-silver-300' : 'text-gray-700'">Password</label>
            <UInput v-model="form.password" type="password" placeholder="••••••••" icon="i-heroicons-lock-closed" size="lg" @keyup.enter="handleLogin" />
          </div>
          <UAlert v-if="error" :color="isLocked ? 'warning' : 'error'" variant="subtle" :icon="isLocked ? 'i-heroicons-lock-closed' : 'i-heroicons-exclamation-circle'" :title="error" />
          <UButton block size="lg" :loading="loading" @click="handleLogin">Sign In</UButton>
        </div>

        <div class="flex items-center justify-between gap-3 mt-6 pt-5 border-t"
          :class="isDark ? 'border-white/8' : 'border-blue-100'">
          <NuxtLink to="/" class="text-sm transition-colors"
            :class="isDark ? 'text-silver-500 hover:text-white' : 'text-gray-500 hover:text-gray-900'">
            ← Back to website
          </NuxtLink>
          <span class="text-[11px] font-medium uppercase tracking-[0.14em]" :class="isDark ? 'text-silver-600' : 'text-gray-400'">
            Secure access
          </span>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: false })
const router = useRouter()
const colorMode = useColorMode()
const { login, isLoggedIn } = useAuth()
const isDark = useIsDark()
function toggleTheme() { colorMode.preference = isDark.value ? 'light' : 'dark' }
if (import.meta.client && isLoggedIn.value) { router.replace('/admin') }

const form = reactive({ username: '', password: '' })
const loading = ref(false)
const passkeyLoading = ref(false)
const error = ref('')
const isLocked = computed(() => error.value === 'Account temporarily locked. Try again in 30 minutes.')
const hasPasskeys = ref(false)
const loginHighlights = [
  {
    icon: 'i-heroicons-finger-print',
    title: 'Passkey-ready access',
    text: 'Biometric and device-backed login is available as soon as passkeys are registered.',
  },
  {
    icon: 'i-heroicons-shield-check',
    title: 'Protected by default',
    text: 'Rate limits and session checks stay active so admin access does not drift into weak defaults.',
  },
  {
    icon: 'i-heroicons-bolt',
    title: 'Focused workflow',
    text: 'Jump straight into content, data and system operations without a cluttered first screen.',
  },
]

// Check WebAuthn support
const passkeySupported = ref(false)
if (import.meta.client) {
  passkeySupported.value = !!window.PublicKeyCredential
  // Check if passkeys exist on server
  checkPasskeys()
}

async function checkPasskeys() {
  try {
    const res = await $fetch<any>('/api/v1/auth/webauthn/login-options', { method: 'POST' })
    hasPasskeys.value = res?.meta?.hasPasskeys || false
  } catch { hasPasskeys.value = false }
}

// ─── Password Login ────────────────────────
async function handleLogin() {
  if (!form.username || !form.password) { error.value = 'Please enter username and password'; return }
  loading.value = true; error.value = ''
  try { await login(form.username, form.password); router.push('/admin') }
  catch (e: any) {
    const status = e?.response?.status || e?.status || e?.statusCode
    if (status === 423) {
      error.value = 'Account temporarily locked. Try again in 30 minutes.'
    } else if (status === 429) {
      error.value = 'Too many attempts. Please wait and try again.'
    } else {
      error.value = e?.data?.message || e?.data?.error?.message || 'Invalid credentials'
    }
  }
  finally { loading.value = false }
}

// ─── Passkey Login ─────────────────────────
async function handlePasskeyLogin() {
  passkeyLoading.value = true; error.value = ''
  try {
    // 1. Get authentication options from server
    const optionsRes = await $fetch<any>('/api/v1/auth/webauthn/login-options', { method: 'POST' })
    if (!optionsRes?.data) {
      error.value = 'No passkeys registered yet'
      return
    }

    // 2. Start browser WebAuthn ceremony
    const { startAuthentication } = await import('@simplewebauthn/browser')
    const credential = await startAuthentication({ optionsJSON: optionsRes.data })

    // 3. Verify with server
    const verifyRes = await $fetch<any>('/api/v1/auth/webauthn/login-verify', {
      method: 'POST',
      body: { credential },
    })

    if (!verifyRes?.data?.token) {
      throw new Error('Passkey authentication failed')
    }

    // 4. Store auth data
    const { token: authToken, user: authUser, sessionId } = useAuth()
    authToken.value = verifyRes.data.token
    authUser.value = verifyRes.data.user
    sessionId.value = verifyRes.data.sessionId || null

    if (import.meta.client) {
      localStorage.setItem('token', verifyRes.data.token)
      if (verifyRes.data.sessionId) {
        localStorage.setItem('sessionId', String(verifyRes.data.sessionId))
      }
    }

    router.push('/admin')
  } catch (e: any) {
    // User cancelled or error
    if (e?.name === 'NotAllowedError') {
      error.value = 'Passkey authentication cancelled'
    } else {
      const status = e?.response?.status || e?.status || e?.statusCode
      if (status === 423) {
        error.value = 'Account temporarily locked. Try again in 30 minutes.'
      } else if (status === 429) {
        error.value = 'Too many attempts. Please wait and try again.'
      } else {
        error.value = e?.data?.message || e?.message || 'Passkey authentication failed'
      }
    }
  } finally { passkeyLoading.value = false }
}
</script>

<!--
  Admin Login Page — Password + Passkey
-->

<template>
  <div class="min-h-screen flex items-center justify-center px-4 transition-colors duration-300"
    :class="isDark ? 'bg-brand-900' : 'bg-[#f0f4f8]'">
    <div class="w-full max-w-sm">
      <div class="text-center mb-8">
        <img :src="'/logo.svg'" alt="MagguuUI" class="w-20 h-20 mx-auto mb-4 glow-blue" />
        <h1 class="text-2xl font-bold text-gradient">MagguuUI Admin</h1>
        <p class="text-sm mt-1" :class="isDark ? 'text-silver-600' : 'text-gray-400'">Sign in to continue</p>
      </div>

      <div class="rounded-xl p-6" :class="isDark ? 'glass' : 'bg-white shadow-lg border border-gray-200'">
        <!-- Passkey Button -->
        <div v-if="passkeySupported" class="mb-4">
          <UButton block size="lg" variant="subtle" color="success" :loading="passkeyLoading" @click="handlePasskeyLogin"
            :disabled="!hasPasskeys && !passkeyLoading">
            <template #leading>
              <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 10a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
                <path d="M8 18.5a6 6 0 0 1 4-5.65" />
                <path d="M16 15h.01" />
                <path d="M18 18l2-2" />
                <path d="M16 15a2 2 0 1 0 4 0 2 2 0 0 0-4 0Z" />
                <path d="M20 13v-1a2 2 0 0 0-2-2h-1" />
              </svg>
            </template>
            Sign in with Passkey
          </UButton>
          <p v-if="!hasPasskeys && !passkeyLoading" class="text-[11px] text-center mt-1.5" :class="isDark ? 'text-silver-700' : 'text-gray-300'">
            No passkeys registered yet
          </p>
        </div>

        <!-- Divider -->
        <div v-if="passkeySupported" class="flex items-center gap-3 mb-4">
          <div class="flex-1 h-px" :class="isDark ? 'bg-brand-400/10' : 'bg-gray-200'" />
          <span class="text-xs font-medium" :class="isDark ? 'text-silver-600' : 'text-gray-400'">or use password</span>
          <div class="flex-1 h-px" :class="isDark ? 'bg-brand-400/10' : 'bg-gray-200'" />
        </div>

        <!-- Password Form -->
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
      </div>

      <div class="flex items-center justify-between mt-6 px-2">
        <NuxtLink to="/" class="text-sm transition-colors" :class="isDark ? 'text-silver-600 hover:text-brand-400' : 'text-gray-400 hover:text-brand-500'">
          ← Back to website
        </NuxtLink>
        <div class="flex items-center gap-2">
          <button class="p-2 rounded-lg transition-all"
            :class="isDark ? 'text-silver-500 hover:text-brand-400 hover:bg-white/5' : 'text-gray-400 hover:text-brand-500 hover:bg-gray-100'"
            @click="toggleTheme">
            <svg v-if="isDark" class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clip-rule="evenodd" /></svg>
            <svg v-else class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" /></svg>
          </button>
        </div>
      </div>
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

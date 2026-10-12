export default defineNuxtPlugin((nuxtApp) => {
  const colorMode = useColorMode()
  if (colorMode.preference === 'system') colorMode.preference = 'dark'

  // useIsDark() renders the SSR dark fallback until hydration is finished,
  // then switches to the stored preference (see composables/useIsDark.ts).
  const hydrated = useState('magguuui-color-mode-hydrated', () => false)
  const markHydrated = () => {
    hydrated.value = true
  }
  if (nuxtApp.isHydrating) {
    nuxtApp.hooks.hookOnce('app:suspense:resolve', markHydrated)
  }
  else {
    markHydrated()
  }
})

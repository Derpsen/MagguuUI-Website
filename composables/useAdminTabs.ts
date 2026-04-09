/**
 * useAdminTabs — Route-based tab management for the admin panel.
 *
 * Tracks visited admin pages as closable/pinnable tabs.
 * Persists pinned tabs and tab order in localStorage.
 */

interface AdminTab {
  path: string
  label: string
  icon?: string
  pinned: boolean
}

const STORAGE_KEY = 'admin-tabs'
const DASHBOARD_TAB: AdminTab = { path: '/admin', label: 'Dashboard', icon: 'i-heroicons-squares-2x2', pinned: true }

// Shared state across all component instances
const tabs = ref<AdminTab[]>([DASHBOARD_TAB])
const initialized = ref(false)

export function useAdminTabs() {
  const route = useRoute()
  const router = useRouter()
  const { currentContext } = useAdminNavigation()

  function loadFromStorage() {
    if (initialized.value || !import.meta.client) return
    initialized.value = true

    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored) as AdminTab[]
        if (Array.isArray(parsed) && parsed.length) {
          // Ensure dashboard tab is always present
          const hasDashboard = parsed.some(t => t.path === '/admin')
          if (!hasDashboard) parsed.unshift({ ...DASHBOARD_TAB })
          tabs.value = parsed
        }
      }
    } catch {
      tabs.value = [{ ...DASHBOARD_TAB }]
    }
  }

  function persist() {
    if (!import.meta.client) return
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tabs.value))
  }

  function addTab(path: string, label?: string, icon?: string) {
    // Don't track the login page
    if (path === '/admin/login') return

    const existing = tabs.value.find(t => t.path === path)
    if (existing) {
      // Update label if it changed
      if (label && existing.label !== label) {
        existing.label = label
        if (icon) existing.icon = icon
        persist()
      }
      return
    }

    tabs.value.push({
      path,
      label: label || path.split('/').pop() || 'Page',
      icon,
      pinned: false,
    })
    persist()
  }

  function closeTab(path: string) {
    const tab = tabs.value.find(t => t.path === path)
    if (!tab || tab.pinned) return

    const idx = tabs.value.indexOf(tab)
    tabs.value.splice(idx, 1)

    // If closing the active tab, navigate to the nearest tab
    if (route.path === path) {
      const next = tabs.value[Math.min(idx, tabs.value.length - 1)]
      if (next) router.push(next.path)
    }

    persist()
  }

  function closeOtherTabs(path: string) {
    tabs.value = tabs.value.filter(t => t.pinned || t.path === path)
    persist()
  }

  function closeAllTabs() {
    tabs.value = tabs.value.filter(t => t.pinned)
    if (!tabs.value.some(t => t.path === route.path)) {
      const first = tabs.value[0]
      if (first) router.push(first.path)
    }
    persist()
  }

  function togglePin(path: string) {
    const tab = tabs.value.find(t => t.path === path)
    if (!tab) return

    // Don't allow unpinning the dashboard
    if (path === '/admin' && tab.pinned) return

    tab.pinned = !tab.pinned
    persist()
  }

  function isActive(path: string): boolean {
    return route.path === path
  }

  // Auto-track route changes
  function trackCurrentRoute() {
    const path = route.path
    if (!path.startsWith('/admin') || path === '/admin/login') return

    const label = currentContext.value.heading || currentContext.value.label || path.split('/').pop() || 'Page'
    const icon = currentContext.value.icon
    addTab(path, label, icon)
  }

  return {
    tabs: readonly(tabs),
    loadFromStorage,
    addTab,
    closeTab,
    closeOtherTabs,
    closeAllTabs,
    togglePin,
    isActive,
    trackCurrentRoute,
  }
}

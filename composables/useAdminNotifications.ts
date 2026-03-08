/**
 * useNotifications — Admin notification system
 *
 * Fetches notifications from API, persists dismissals in localStorage.
 * Auto-refreshes every 5 minutes.
 */

interface AdminNotification {
  id: string
  type: 'warning' | 'info' | 'error'
  title: string
  message: string
  link?: string
}

const DISMISSED_KEY = 'magguuui-dismissed-notifications'

function getDismissed(): Record<string, number> {
  if (!import.meta.client) return {}
  try {
    return JSON.parse(localStorage.getItem(DISMISSED_KEY) || '{}')
  } catch { return {} }
}

function saveDismissed(dismissed: Record<string, number>) {
  if (!import.meta.client) return
  // Clean entries older than 24h
  const cutoff = Date.now() - 24 * 60 * 60 * 1000
  const cleaned: Record<string, number> = {}
  for (const [k, v] of Object.entries(dismissed)) {
    if (v > cutoff) cleaned[k] = v
  }
  localStorage.setItem(DISMISSED_KEY, JSON.stringify(cleaned))
}

export function useAdminNotifications() {
  const allNotifications = useState<AdminNotification[]>('admin-notifications-all', () => [])
  const dismissed = useState<Record<string, number>>('admin-notifications-dismissed', () => ({}))
  const loading = useState('admin-notifications-loading', () => false)
  const lastFetch = useState('admin-notifications-last', () => 0)

  const { isLoggedIn } = useAuth()
  const { apiFetch } = useApi()

  // Load dismissed from localStorage on first use
  if (import.meta.client && Object.keys(dismissed.value).length === 0) {
    dismissed.value = getDismissed()
  }

  // Filter out dismissed notifications
  const notifications = computed(() =>
    allNotifications.value.filter(n => !dismissed.value[n.id])
  )
  const count = computed(() => notifications.value.length)
  const hasNotifications = computed(() => count.value > 0)

  async function refresh(force = false) {
    if (!isLoggedIn.value) return
    if (!force && Date.now() - lastFetch.value < 60_000) return

    loading.value = true
    try {
      allNotifications.value = await apiFetch('/api/v1/admin/notifications')
      lastFetch.value = Date.now()
    } catch {
      // Silent fail
    } finally {
      loading.value = false
    }
  }

  function dismiss(id: string) {
    dismissed.value = { ...dismissed.value, [id]: Date.now() }
    saveDismissed(dismissed.value)
  }

  return {
    notifications,
    count,
    hasNotifications,
    loading,
    refresh,
    dismiss,
  }
}

/**
 * useStringManager — Config-driven composable for admin string CRUD pages.
 *
 * Extracts the duplicated table, modal, drag-drop, bulk-select, and
 * lifecycle logic shared by profiles, wowup, and layouts admin pages.
 */

interface StringManagerConfig {
  apiBase: string
  entityName: string
  entityNamePlural: string
  stringField: string
  defaultForm: () => Record<string, any>
  flattenResponse?: (data: any) => any[]
}

export function useStringManager(config: StringManagerConfig) {
  const { apiFetch } = useApi()
  const toast = useToast()
  const route = useRoute()

  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------

  const items = ref<any[]>([])
  const loading = ref(true)
  const search = ref('')
  const selected = reactive(new Set<number>())

  // Modal state
  const modalOpen = ref(false)
  const form = ref<Record<string, any>>(config.defaultForm())
  const formError = ref('')
  const saving = ref(false)
  const editingItem = ref<any | null>(null)

  // Delete modal state
  const deleteModalOpen = ref(false)
  const deletingItem = ref<any | null>(null)
  const bulkDeleteModalOpen = ref(false)

  // Last-updated ticker
  const lastLoaded = ref<Date | null>(null)
  const lastUpdatedText = ref('')
  let lastUpdatedTimer: ReturnType<typeof setInterval> | undefined

  // Drag-drop
  const dragIdx = ref<number | null>(null)
  const dragOverIdx = ref<number | null>(null)

  // ---------------------------------------------------------------------------
  // Selection helpers (pure functions — pages wrap them in computed)
  // ---------------------------------------------------------------------------

  function isAllSelected(filteredItems: any[]): boolean {
    return filteredItems.length > 0 && filteredItems.every(item => selected.has(item.id))
  }

  function isSomeSelected(filteredItems: any[]): boolean {
    return filteredItems.some(item => selected.has(item.id))
  }

  function toggleSelect(id: number) {
    selected.has(id) ? selected.delete(id) : selected.add(id)
  }

  function toggleSelectAll(filteredItems: any[]) {
    if (isAllSelected(filteredItems)) {
      filteredItems.forEach(item => selected.delete(item.id))
    } else {
      filteredItems.forEach(item => selected.add(item.id))
    }
  }

  // ---------------------------------------------------------------------------
  // Last-updated text
  // ---------------------------------------------------------------------------

  function updateLastUpdatedText() {
    if (!lastLoaded.value) return
    const seconds = Math.floor((Date.now() - lastLoaded.value.getTime()) / 1000)
    if (seconds < 10) lastUpdatedText.value = 'Updated just now'
    else if (seconds < 60) lastUpdatedText.value = `Updated ${seconds}s ago`
    else if (seconds < 3600) lastUpdatedText.value = `Updated ${Math.floor(seconds / 60)}m ago`
    else lastUpdatedText.value = `Updated ${Math.floor(seconds / 3600)}h ago`
  }

  // ---------------------------------------------------------------------------
  // CRUD
  // ---------------------------------------------------------------------------

  async function load() {
    loading.value = true
    try {
      const data = await apiFetch<any>(config.apiBase)
      items.value = config.flattenResponse ? config.flattenResponse(data) : data
      lastLoaded.value = new Date()
      updateLastUpdatedText()
    } catch {
      toast.add({ title: `Error loading ${config.entityNamePlural}`, color: 'error' })
    } finally {
      loading.value = false
    }
  }

  function openCreate() {
    editingItem.value = null
    formError.value = ''
    form.value = config.defaultForm()
    modalOpen.value = true
  }

  function openEdit(item: any) {
    editingItem.value = item
    formError.value = ''
    const fresh: Record<string, any> = {}
    const defaults = config.defaultForm()
    for (const key of Object.keys(defaults)) {
      fresh[key] = item[key] !== undefined ? item[key] : defaults[key]
    }
    form.value = fresh
    modalOpen.value = true
  }

  async function save(extraFields?: Record<string, any>) {
    saving.value = true
    formError.value = ''

    const body = { ...form.value, ...extraFields }

    try {
      if (editingItem.value) {
        await apiFetch(`${config.apiBase}/${editingItem.value.id}`, { method: 'PUT', body })
        toast.add({ title: `${capitalize(config.entityName)} updated`, color: 'success' })
      } else {
        await apiFetch(config.apiBase, { method: 'POST', body })
        toast.add({ title: `${capitalize(config.entityName)} created`, color: 'success' })
      }

      modalOpen.value = false
      await load()
    } catch (error: any) {
      formError.value = error?.data?.message || `Error saving ${config.entityName}`
    } finally {
      saving.value = false
    }
  }

  async function toggleVisibility(item: any) {
    try {
      await apiFetch(`${config.apiBase}/${item.id}`, {
        method: 'PATCH',
        body: { isVisible: !item.isVisible },
      })
      item.isVisible = !item.isVisible
    } catch {
      toast.add({ title: `Error toggling visibility`, color: 'error' })
    }
  }

  function confirmDelete(item: any) {
    deletingItem.value = item
    deleteModalOpen.value = true
  }

  async function doDelete() {
    if (!deletingItem.value) return

    try {
      await apiFetch(`${config.apiBase}/${deletingItem.value.id}`, { method: 'DELETE' })
      toast.add({ title: `${capitalize(config.entityName)} deleted`, color: 'success' })
      deleteModalOpen.value = false
      await load()
    } catch {
      toast.add({ title: `Error deleting ${config.entityName}`, color: 'error' })
    }
  }

  async function doBulkDelete() {
    try {
      await apiFetch(`${config.apiBase}/bulk-delete`, {
        method: 'POST',
        body: { ids: [...selected] },
      })
      toast.add({ title: `${selected.size} ${config.entityNamePlural} deleted`, color: 'success' })
      selected.clear()
      bulkDeleteModalOpen.value = false
      await load()
    } catch {
      toast.add({ title: `Error deleting ${config.entityNamePlural}`, color: 'error' })
    }
  }

  // ---------------------------------------------------------------------------
  // Clipboard
  // ---------------------------------------------------------------------------

  async function copyString(item: any) {
    const text: string = item[config.stringField] ?? ''
    try {
      await navigator.clipboard.writeText(text)
      toast.add({ title: `Copied to clipboard`, color: 'success' })
    } catch {
      // Fallback for older browsers / insecure contexts
      const textarea = document.createElement('textarea')
      textarea.value = text
      textarea.style.cssText = 'position:fixed;opacity:0'
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      toast.add({ title: `Copied to clipboard`, color: 'success' })
    }
  }

  // ---------------------------------------------------------------------------
  // Drag & drop reorder
  // ---------------------------------------------------------------------------

  function onDragStart(event: DragEvent, idx: number) {
    dragIdx.value = idx
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move'
      event.dataTransfer.setData('text/plain', String(idx))
    }
  }

  function resetDrag() {
    dragIdx.value = null
    dragOverIdx.value = null
  }

  async function onDrop(event: DragEvent, toIdx: number, filteredItems: any[]) {
    event.preventDefault()
    const fromIdx = dragIdx.value
    resetDrag()
    if (fromIdx === null || fromIdx === toIdx) return

    const ordered = [...filteredItems]
    const [moved] = ordered.splice(fromIdx, 1)
    ordered.splice(toIdx, 0, moved)

    // Re-sort the full items array to match the new filtered order
    const idOrder = ordered.map(item => item.id)
    items.value = [...items.value].sort((a, b) => {
      const aIndex = idOrder.indexOf(a.id)
      const bIndex = idOrder.indexOf(b.id)
      if (aIndex === -1 && bIndex === -1) return 0
      if (aIndex === -1) return 1
      if (bIndex === -1) return -1
      return aIndex - bIndex
    })

    try {
      await apiFetch(`${config.apiBase}/reorder`, {
        method: 'POST',
        body: { items: ordered.map((item, idx) => ({ id: item.id, sortOrder: idx })) },
      })
    } catch {
      toast.add({ title: 'Error reordering', color: 'error' })
    }
  }

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  function setupLifecycle() {
    onMounted(() => {
      load()
      lastUpdatedTimer = setInterval(updateLastUpdatedText, 10000)
      if (route.query.action === 'create') {
        nextTick(() => openCreate())
      }
    })

    onUnmounted(() => {
      if (lastUpdatedTimer) clearInterval(lastUpdatedTimer)
    })
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  function capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1)
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  return {
    // State
    items,
    loading,
    search,
    selected,
    lastUpdatedText,

    // Modal state
    modalOpen,
    form,
    formError,
    saving,
    editingItem,

    // Delete modal state
    deleteModalOpen,
    deletingItem,
    bulkDeleteModalOpen,

    // Selection helpers
    isAllSelected,
    isSomeSelected,

    // Drag-drop
    dragIdx,
    dragOverIdx,
    onDragStart,
    onDrop,
    resetDrag,

    // Actions
    load,
    openCreate,
    openEdit,
    save,
    toggleVisibility,
    confirmDelete,
    doDelete,
    doBulkDelete,
    copyString,
    toggleSelect,
    toggleSelectAll,

    // Lifecycle
    setupLifecycle,
  }
}

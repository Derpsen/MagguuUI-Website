import { changedItems, publishedMap, type DraftItem } from '~/utils/contentDrafts'

interface DraftsResponse {
  items: Array<DraftItem & { updatedAt: number }>
  count: number
  updatedAt: number | null
}

/**
 * Draft / publish state for an admin content editor.
 *
 * Editors save a draft (only the cells that differ from the live content are
 * stored), see the unpublished state, and then Publish or Discard it. Public
 * pages only ever read the published content.
 */
export function useContentDraft(pages: string[]) {
  const { apiFetch } = useApi()
  const draftCount = ref(0)
  const draftUpdatedAt = ref<number | null>(null)
  const publishing = ref(false)
  const discarding = ref(false)
  let published = new Map<string, string>()

  const hasDraft = computed(() => draftCount.value > 0)
  const query = `pages=${encodeURIComponent(pages.join(','))}`

  /** Remember what the live site currently shows (items built from the published content only). */
  function setPublished(items: DraftItem[]) {
    published = publishedMap(items)
  }

  async function fetchDrafts(): Promise<DraftItem[]> {
    try {
      const data = await apiFetch<DraftsResponse>(`/api/v1/admin/content/drafts?${query}`)
      draftCount.value = data.count
      draftUpdatedAt.value = data.updatedAt
      return data.items
    } catch {
      draftCount.value = 0
      draftUpdatedAt.value = null
      return []
    }
  }

  async function saveDraft(items: DraftItem[]): Promise<number> {
    const changed = changedItems(items, published)
    await apiFetch('/api/v1/admin/content/drafts', { method: 'POST', body: { pages, items: changed } })
    draftCount.value = changed.length
    draftUpdatedAt.value = changed.length ? Math.floor(Date.now() / 1000) : null
    return changed.length
  }

  async function publish(): Promise<number> {
    publishing.value = true
    try {
      const res = await apiFetch<{ published: number }>('/api/v1/admin/content/publish', { method: 'POST', body: { pages } })
      draftCount.value = 0
      draftUpdatedAt.value = null
      return res.published
    } finally {
      publishing.value = false
    }
  }

  async function discard(): Promise<void> {
    discarding.value = true
    try {
      await apiFetch(`/api/v1/admin/content/drafts?${query}`, { method: 'DELETE' })
      draftCount.value = 0
      draftUpdatedAt.value = null
    } finally {
      discarding.value = false
    }
  }

  return { draftCount, draftUpdatedAt, hasDraft, publishing, discarding, setPublished, fetchDrafts, saveDraft, publish, discard }
}

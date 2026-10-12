import { mergePageCopy } from '~/utils/pageCopyDefaults'
import type { PageCopyDefaults } from '~/utils/pageCopyDefaults'

/** Public page copy from site_content (Admin → Content → Pages) with static defaults. */
export function usePageCopy(page: string, defaults: PageCopyDefaults) {
  const { data } = useFetch<{ data: Record<string, Record<string, string>> }>(`/api/v1/content/${page}`, {
    key: `page-copy-${page}`,
  })
  return computed(() => mergePageCopy(defaults, data.value?.data))
}

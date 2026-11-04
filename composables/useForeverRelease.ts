import type { ForeverRelease } from '~/utils/foreverRelease'

/** Newest MagguuUI x Forever release, null while none is published. */
export async function useForeverRelease() {
  const { data } = await useFetch<{ data: ForeverRelease | null }>('/api/v1/forever/release', { key: 'forever-release' })
  return computed(() => data.value?.data ?? null)
}

export function formatForeverDate(iso: string | null): string {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Berlin' })
}

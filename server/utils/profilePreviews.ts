/**
 * Public data for the profile preview page: addons that MagguuUI ships a
 * profile for, with the real profile names from the database and the preview
 * image if one was dropped into public/previews. Visible addons and visible
 * profiles only; nothing here reads drafts, hidden rows or import strings.
 */

import { PROFILE_KEY_BY_SLUG } from '~/utils/addonChipMeta'
import { compareProfileNames } from '~/utils/profileLabels'
import { resolvePreviewImage, type PreviewImage } from '~/utils/previewImages'

export interface PreviewAddonRow {
  slug: string
  name: string
  category: string
  description: string | null
  sortOrder: number
}

export interface ProfilePreviewItem {
  slug: string
  name: string
  category: 'required' | 'core' | 'optional'
  description: string
  profiles: string[]
  stringsHref: string
  image: PreviewImage | null
}

const CATEGORY_ORDER = ['required', 'core', 'optional'] as const

export function buildProfilePreviews(
  addons: PreviewAddonRow[],
  profileNamesByKey: Record<string, string[]>,
  files: Iterable<string>,
): ProfilePreviewItem[] {
  const fileList = [...files]
  const items: ProfilePreviewItem[] = []
  for (const addon of addons) {
    const key = PROFILE_KEY_BY_SLUG[addon.slug]
    if (!key) continue
    const names = [...new Set(profileNamesByKey[key] ?? [])].sort(compareProfileNames)
    if (!names.length) continue
    const category = (CATEGORY_ORDER as readonly string[]).includes(addon.category) ? addon.category as ProfilePreviewItem['category'] : 'optional'
    items.push({
      slug: addon.slug,
      name: addon.name,
      category,
      description: addon.description ?? '',
      profiles: names,
      stringsHref: `/strings?addon=${encodeURIComponent(key)}`,
      image: resolvePreviewImage(addon.slug, fileList),
    })
  }
  return items.sort((a, b) =>
    CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category)
    || (addons.find(x => x.slug === a.slug)?.sortOrder ?? 0) - (addons.find(x => x.slug === b.slug)?.sortOrder ?? 0)
    || a.name.localeCompare(b.name))
}

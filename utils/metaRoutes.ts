/**
 * Canonical /meta paths: lowercase, no trailing slash, no `.html`, no
 * doubled slashes. Uppercase and other variants 301 here when the target
 * is a known class/spec (or `/meta` itself). Unknown slugs 404 without a
 * redirect, so there is no 301→404 chain.
 */

import { findMetaClass, findMetaSpec, toMetaSlug } from './metaCatalog'

export function canonicalizeMetaPath(raw: string): { canonical: string, redirect: boolean, valid: boolean } | null {
  if (!raw) return null
  let path = raw.split(/[?#]/)[0] || ''
  try { path = decodeURIComponent(path) }
  catch { /* keep raw path */ }
  const isMeta = /^\/meta(?:\/|$)/i.test(path)
  if (!isMeta) return null
  path = path.replace(/\.html$/i, '')
  path = path.replace(/\/{2,}/g, '/')
  if (path.length > 1) path = path.replace(/\/+$/, '')
  const parts = path.split('/').filter(Boolean).map(part => toMetaSlug(part))
  if (parts[0] !== 'meta') return { canonical: '/meta', redirect: true, valid: false }
  let canonical: string
  let valid: boolean
  if (parts.length === 1) {
    canonical = '/meta'
    valid = true
  } else if (parts.length === 2) {
    canonical = `/meta/${parts[1]}`
    valid = Boolean(findMetaClass(parts[1]!))
  } else if (parts.length === 3) {
    canonical = `/meta/${parts[1]}/${parts[2]}`
    valid = Boolean(findMetaSpec(parts[1]!, parts[2]!))
  } else {
    canonical = `/meta/${parts.slice(1).join('/')}`
    valid = false
  }
  const rawPath = raw.split(/[?#]/)[0] || ''
  const redirect = rawPath !== canonical
  return { canonical, redirect, valid }
}

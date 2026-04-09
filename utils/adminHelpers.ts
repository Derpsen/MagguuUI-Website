/**
 * Shared helper functions for admin pages.
 * Auto-imported by Nuxt from utils/.
 */

export function timeAgo(value: string | number | Date | null): string {
  if (!value) return ''
  const date = value instanceof Date ? value : typeof value === 'number' ? new Date(value * 1000) : new Date(value)
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return date.toLocaleDateString('en', { day: '2-digit', month: 'short' })
}

export function absoluteDate(value: string | number | Date | null): string {
  if (!value) return ''
  const date = value instanceof Date ? value : typeof value === 'number' ? new Date(value * 1000) : new Date(value)
  return date.toLocaleDateString('en', { day: '2-digit', month: 'short' })
}

export function actionIcon(action: string): string {
  if (action === 'created') return 'i-heroicons-plus-circle'
  if (action === 'updated') return 'i-heroicons-pencil-square'
  if (action === 'deleted') return 'i-heroicons-trash'
  return 'i-heroicons-information-circle'
}

export function activityTone(action: string): string {
  if (action === 'created') return 'admin-tone-success'
  if (action === 'deleted') return 'admin-tone-danger'
  return 'admin-tone-brand'
}

export function entityTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    profile: 'Addon Profile',
    wowup: 'WowUp String',
    layout: 'Character Layout',
    changelog: 'Update',
    content: 'Content',
  }
  return labels[type] || type
}

export function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 B'
  if (bytes < 1024) return `${Math.round(bytes)} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

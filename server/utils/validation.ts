/**
 * Validation Schemas
 *
 * Zod schemas for request body validation.
 */

import { z } from 'zod'

// ─── Auth ───────────────────────────────────────

export const loginSchema = z.object({
  username: z.string().min(1, 'Username required'),
  password: z.string().min(1, 'Password required'),
})

export const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: passwordSchema,
})

// ─── Profiles ───────────────────────────────────

export const createProfileSchema = z.object({
  addon: z.string().min(1, 'Addon name required'),
  profile: z.string().min(1, 'Profile name required'),
  string: z.string().min(1, 'Import string required'),
  description: z.string().optional(),
  sortOrder: z.number().int().default(0),
  isVisible: z.boolean().default(true),
})

export const updateProfileSchema = createProfileSchema.partial()

// ─── WowUp Strings ─────────────────────────────

export const createWowupSchema = z.object({
  name: z.string().min(1, 'Name required'),
  string: z.string().min(1, 'Import string required'),
  description: z.string().optional(),
  isVisible: z.boolean().default(true),
})

export const updateWowupSchema = createWowupSchema.partial()

// ─── Character Layouts ──────────────────────────

export const createLayoutSchema = z.object({
  name: z.string().min(1, 'Layout name required'),
  className: z.string().optional(),
  spec: z.string().optional(),
  description: z.string().optional(),
  screenshot: z.string().optional(),
  importString: z.string().optional(),
  sortOrder: z.number().int().default(0),
  isVisible: z.boolean().default(true),
})

export const updateLayoutSchema = createLayoutSchema.partial()

// ─── Changelogs ─────────────────────────────────

export const createChangelogSchema = z.object({
  version: z.string().min(1, 'Version required'),
  content: z.string().min(1, 'Content required'),
  isPublished: z.boolean().default(false),
})

export const updateChangelogSchema = createChangelogSchema.partial()

// ─── Site Content ───────────────────────────────

export const updateContentSchema = z.object({
  value: z.string(),
})

export const createContentSchema = z.object({
  page: z.string().min(1),
  section: z.string().min(1),
  key: z.string().min(1),
  value: z.string(),
  type: z.enum(['text', 'markdown', 'url', 'image']).default('text'),
  sortOrder: z.number().int().default(0),
})

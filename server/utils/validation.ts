/**
 * Validation Schemas
 *
 * Zod schemas for request body validation.
 */

import { z, ZodError, type ZodSchema } from 'zod'

export const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')

// ─── Shared helper ────────────────────────────────

/**
 * Parse and validate a request body against a Zod schema.
 * Throws a 400 createError with structured error details on failure.
 */
export function validateBody<T>(schema: ZodSchema<T>, body: unknown): T {
  try {
    return schema.parse(body)
  } catch (error) {
    if (error instanceof ZodError) {
      const message = error.issues.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
      throw createError({
        statusCode: 400,
        data: {
          success: false,
          error: { code: 'VALIDATION_ERROR', message },
        },
        message,
      })
    }
    throw error
  }
}

// ─── Profiles ─────────────────────────────────────

export const profileCreateSchema = z.object({
  addon: z.string().min(1).max(100),
  profile: z.string().min(1).max(200),
  string: z.string().min(1).max(5_000_000),
  description: z.string().max(1000).optional().nullable(),
  isVisible: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
  customFields: z.string().max(50_000).optional().nullable(),
})

export const profileUpdateSchema = profileCreateSchema.partial()

// ─── WowUp Strings ────────────────────────────────

export const wowupCreateSchema = z.object({
  name: z.string().min(1).max(200),
  string: z.string().min(1).max(5_000_000),
  description: z.string().max(1000).optional().nullable(),
  isVisible: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
  customFields: z.string().max(50_000).optional().nullable(),
})

export const wowupUpdateSchema = wowupCreateSchema.partial()

// ─── Addons ──────────────────────────────────────

export const addonCategorySchema = z.enum(['required', 'core', 'optional'])

// Restrict stored addon URLs to http(s). Zod's `.url()` accepts `javascript:`,
// `data:`, etc., which would execute when rendered through Vue's `:href`.
const httpUrlSchema = z.string().url().max(500)
  .refine(value => /^https?:\/\//i.test(value), 'URL must start with http:// or https://')

export const addonCreateSchema = z.object({
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase, digits, or hyphens'),
  tocName: z.string().max(100).optional().nullable(),
  name: z.string().min(1).max(150),
  category: addonCategorySchema,
  emoji: z.string().max(10).optional().nullable(),
  description: z.string().max(2000).optional().nullable(),
  url: httpUrlSchema.optional().nullable(),
  sortOrder: z.number().int().optional(),
  isVisible: z.boolean().optional(),
})

export const addonUpdateSchema = addonCreateSchema.partial().extend({
  isAvailable: z.boolean().optional(),
})

// ─── Character Layouts ────────────────────────────

export const layoutCreateSchema = z.object({
  name: z.string().min(1).max(200),
  className: z.string().max(100).optional().nullable(),
  spec: z.string().max(100).optional().nullable(),
  importString: z.string().max(5_000_000).optional().nullable(),
  // Only bare filenames (UUID-style, e.g. "abc123.png") are valid — no path separators
  screenshot: z.string().max(500).regex(/^[a-zA-Z0-9_-]+\.[a-zA-Z0-9]+$/, 'Invalid screenshot filename').optional().nullable(),
  description: z.string().max(1000).optional().nullable(),
  isVisible: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
  customFields: z.string().max(50_000).optional().nullable(),
})

export const layoutUpdateSchema = layoutCreateSchema.partial()

// ─── Changelogs ───────────────────────────────────

export const changelogCreateSchema = z.object({
  version: z.string().min(1).max(50),
  content: z.string().min(1).max(100_000),
  contentEn: z.string().max(100_000).optional().nullable(),
  isPublished: z.boolean().optional(),
  publishedAt: z.number().int().optional().nullable(),
})

export const changelogUpdateSchema = changelogCreateSchema.partial()

// ─── FAQs ─────────────────────────────────────────

export const faqCreateSchema = z.object({
  category: z.enum(['general', 'installation', 'addons', 'troubleshooting']),
  question: z.string().min(1).max(1000),
  answer: z.string().min(1).max(50_000),
  sortOrder: z.number().int().optional(),
  isVisible: z.boolean().optional(),
})

export const faqUpdateSchema = faqCreateSchema.partial()

// ─── Site Content (bulk) ──────────────────────────

export const contentItemSchema = z.object({
  page: z.string().min(1).max(100),
  section: z.string().min(1).max(100),
  key: z.string().min(1).max(100),
  value: z.string().max(100_000),
  locale: z.string().max(10).optional(),
  type: z.string().max(50).optional(),
})

export const contentBulkSchema = z.object({
  items: z.array(contentItemSchema).min(1).max(200),
})

// ─── Settings ─────────────────────────────────────

export const settingsUpdateSchema = z.object({
  settings: z.record(z.string().max(100), z.string().max(10_000)),
})

// ─── API Keys ─────────────────────────────────────

export const apiKeyCreateSchema = z.object({
  name: z.string().min(1).max(200),
  permissions: z.enum(['read', 'write', 'admin']).optional(),
})

// ─── Field Definitions ────────────────────────────

export const fieldDefinitionCreateSchema = z.object({
  entityType: z.enum(['profiles', 'wowup', 'layouts']),
  fieldName: z.string().min(1).max(100),
  fieldLabel: z.string().min(1).max(200),
  fieldType: z.enum(['text', 'textarea', 'number', 'toggle', 'select']).optional(),
  fieldOptions: z.unknown().optional().nullable(), // JSON — serialized by endpoint
  isRequired: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
})

export const fieldDefinitionUpdateSchema = fieldDefinitionCreateSchema.partial()

// ─── Reorder (shared) ─────────────────────────────

export const reorderSchema = z.object({
  items: z.array(z.object({
    id: z.number().int(),
    sortOrder: z.number().int(),
  })).min(1).max(500),
})

// ─── Bulk Delete (shared) ─────────────────────────

export const bulkDeleteSchema = z.object({
  ids: z.array(z.number().int()).min(1).max(500),
})

// ─── Users ────────────────────────────────────────

export const userCreateSchema = z.object({
  username: z.string().min(3).max(50),
  password: passwordSchema,
  role: z.enum(['admin', 'viewer']).optional(),
})

// ─── Password Change ──────────────────────────────

export const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1).max(1000),
  newPassword: passwordSchema,
})

// ─── Passkey Rename ───────────────────────────────

export const passkeyRenameSchema = z.object({
  deviceName: z.string().min(1).max(100),
})

// ─── GitHub Push ──────────────────────────────────

export const githubPushSchema = z.object({
  reason: z.string().max(200).optional(),
})

// ─── GitHub Import ────────────────────────────────

export const githubImportSchema = z.object({
  data: z.unknown(),
  strategy: z.enum(['merge', 'overwrite']).optional(),
})

/**
 * POST /api/v1/admin/upload
 *
 * Upload a screenshot image. Returns the filename.
 * Saved to /app/uploads/ (mounted volume).
 */

import { join } from 'path'
import { writeFileSync, mkdirSync } from 'fs'
import { randomUUID } from 'crypto'

export default defineEventHandler(async (event) => {
  const formData = await readMultipartFormData(event)

  if (!formData || formData.length === 0) {
    throw createError({ statusCode: 400, message: 'No file uploaded' })
  }

  const file = formData.find(f => f.name === 'file')
  if (!file || !file.data) {
    throw createError({ statusCode: 400, message: 'No file found' })
  }

  // Validate mime type
  const allowedTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/gif']
  if (file.type && !allowedTypes.includes(file.type)) {
    throw createError({ statusCode: 400, message: 'Nur PNG, JPG, WebP und GIF erlaubt' })
  }

  // Validate file extension (prevent double-extension attacks like "payload.php.png")
  const allowedExtensions = ['png', 'jpg', 'jpeg', 'webp', 'gif']
  const ext = (file.filename?.split('.').pop() || 'png').toLowerCase()
  if (!allowedExtensions.includes(ext)) {
    throw createError({ statusCode: 400, message: 'Invalid file extension' })
  }

  // Generate safe filename (UUID prevents path traversal)
  const filename = `${randomUUID()}.${ext}`

  // Save to uploads directory
  const uploadsDir = join(process.cwd(), 'uploads')
  mkdirSync(uploadsDir, { recursive: true })
  writeFileSync(join(uploadsDir, filename), file.data)

  return { success: true, data: { filename } }
})

/**
 * POST /api/v1/admin/upload
 *
 * Upload a screenshot image. Returns the filename.
 * Saved to /app/uploads/ (mounted volume).
 */

import { join } from 'path'
import { mkdir, writeFile } from 'fs/promises'
import { randomUUID } from 'crypto'

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024

function detectImageType(buffer: Buffer): { mime: string; ext: string } | null {
  if (buffer.length >= 8
    && buffer[0] === 0x89
    && buffer[1] === 0x50
    && buffer[2] === 0x4E
    && buffer[3] === 0x47
    && buffer[4] === 0x0D
    && buffer[5] === 0x0A
    && buffer[6] === 0x1A
    && buffer[7] === 0x0A) {
    return { mime: 'image/png', ext: 'png' }
  }

  if (buffer.length >= 3
    && buffer[0] === 0xFF
    && buffer[1] === 0xD8
    && buffer[2] === 0xFF) {
    return { mime: 'image/jpeg', ext: 'jpg' }
  }

  if (buffer.length >= 12
    && buffer.toString('ascii', 0, 4) === 'RIFF'
    && buffer.toString('ascii', 8, 12) === 'WEBP') {
    return { mime: 'image/webp', ext: 'webp' }
  }

  if (buffer.length >= 6) {
    const signature = buffer.toString('ascii', 0, 6)
    if (signature === 'GIF87a' || signature === 'GIF89a') {
      return { mime: 'image/gif', ext: 'gif' }
    }
  }

  return null
}

export default defineEventHandler(async (event) => {
  const formData = await readMultipartFormData(event)

  if (!formData || formData.length === 0) {
    throw createError({ statusCode: 400, message: 'No file uploaded' })
  }

  const file = formData.find(f => f.name === 'file')
  if (!file || !file.data) {
    throw createError({ statusCode: 400, message: 'No file found' })
  }

  if (file.data.byteLength > MAX_UPLOAD_BYTES) {
    throw createError({ statusCode: 400, message: 'Image exceeds the 5 MB upload limit' })
  }

  const detectedType = detectImageType(file.data)
  if (!detectedType) {
    throw createError({ statusCode: 400, message: 'Invalid image file' })
  }

  if (file.type && file.type !== detectedType.mime) {
    throw createError({ statusCode: 400, message: 'Uploaded file type does not match file contents' })
  }

  // Generate safe filename from detected content type (not user-provided extension).
  const filename = `${randomUUID()}.${detectedType.ext}`

  const uploadsDir = join(process.cwd(), 'uploads')
  await mkdir(uploadsDir, { recursive: true })
  await writeFile(join(uploadsDir, filename), file.data)

  return { success: true, data: { filename } }
})

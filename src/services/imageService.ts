import { supabase } from '../lib/supabase'

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024 // 10 MB

/** In-memory cache of resolved signed GET URLs, keyed by R2 object key. */
const urlCache = new Map<string, { url: string; expiresAt: number }>()
const CACHE_TTL_MS = 55 * 60 * 1000 // just under the 1-hour signed URL lifetime

function validate(file: File): string | null {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return 'Please choose a JPEG, PNG, or WebP image.'
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return 'Image is too large. Please choose an image smaller than 10 MB.'
  }
  return null
}

export const imageService = {
  /**
   * Uploads a file for a product that already has an ID (real Supabase
   * row) and returns the permanent R2 object key to store in
   * products.image_url. Never falls back to local/mock storage — a
   * failure here is a real error, surfaced to the caller.
   */
  async upload(file: File, productId: string): Promise<string> {
    const validationError = validate(file)
    if (validationError) throw new Error(validationError)

    const { data, error } = await supabase.functions.invoke('r2-upload-url', {
      body: { productId, contentType: file.type, fileSize: file.size },
    })
    if (error || !data?.uploadUrl || !data?.objectKey) {
      throw new Error(data?.error || 'Unable to start the image upload. Please try again.')
    }

    const putResponse = await fetch(data.uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': file.type },
      body: file,
    })
    if (!putResponse.ok) {
      throw new Error('Image upload failed. Please try again.')
    }

    return data.objectKey as string
  },

  /** Admin-only server-side delete. Best-effort from the caller's point of view. */
  async remove(objectKey: string | undefined): Promise<void> {
    if (!objectKey) return
    const { data, error } = await supabase.functions.invoke('r2-delete', { body: { objectKey } })
    if (error || !data?.ok) {
      // Deliberately non-fatal: the product record has already been
      // saved/deleted by this point. Logged so it can be cleaned up later
      // rather than blocking or corrupting the business-data operation.
      console.warn('R2 cleanup failed for', objectKey, error || data?.error)
    }
    urlCache.delete(objectKey)
  },

  /** Resolves one or more R2 object keys to short-lived signed GET URLs, with caching. */
  async getDisplayUrls(objectKeys: string[]): Promise<Record<string, string>> {
    const now = Date.now()
    const uncached = objectKeys.filter((k) => !urlCache.has(k) || urlCache.get(k)!.expiresAt < now)

    if (uncached.length > 0) {
      const { data, error } = await supabase.functions.invoke('r2-read-urls', { body: { keys: uncached } })
      if (error || !data?.urls) {
        throw new Error('Unable to load product images right now.')
      }
      for (const [key, url] of Object.entries(data.urls as Record<string, string>)) {
        urlCache.set(key, { url, expiresAt: now + CACHE_TTL_MS })
      }
    }

    const result: Record<string, string> = {}
    for (const key of objectKeys) {
      const cached = urlCache.get(key)
      if (cached) result[key] = cached.url
    }
    return result
  },
}

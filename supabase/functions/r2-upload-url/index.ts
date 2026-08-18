// POST { productId: string, contentType: string, fileSize: number }
// → { uploadUrl: string, objectKey: string }
//
// Admin-only (matches the existing products write permission). Verifies
// the caller via Supabase Auth + profiles, validates the file's declared
// type/size, generates a safe deterministic object key, and returns a
// presigned PUT URL the browser uploads directly to R2. The R2 secret
// itself never leaves this function.
import { corsHeaders, handlePreflight, jsonResponse } from '../_shared/cors.ts'
import { getCaller, requireAdmin } from '../_shared/auth.ts'
import { ALLOWED_CONTENT_TYPES, MAX_FILE_SIZE_BYTES, buildObjectKey, presignPut } from '../_shared/r2.ts'

Deno.serve(async (req) => {
  const preflight = handlePreflight(req)
  if (preflight) return preflight

  try {
    const caller = await getCaller(req)
    if (!requireAdmin(caller)) {
      return jsonResponse({ error: 'Only an admin can upload product images.' }, 403)
    }

    const body = await req.json().catch(() => null)
    const productId = body?.productId
    const contentType = body?.contentType
    const fileSize = Number(body?.fileSize)

    if (!productId || typeof productId !== 'string') {
      return jsonResponse({ error: 'productId is required.' }, 400)
    }
    if (!ALLOWED_CONTENT_TYPES.includes(contentType)) {
      return jsonResponse({ error: 'Unsupported image type. Use JPEG, PNG, or WebP.' }, 400)
    }
    if (!fileSize || fileSize <= 0 || fileSize > MAX_FILE_SIZE_BYTES) {
      return jsonResponse({ error: 'Image is too large. Please choose an image smaller than 10 MB.' }, 400)
    }

    const objectKey = buildObjectKey(productId, contentType)
    const uploadUrl = await presignPut(objectKey, contentType)

    return jsonResponse({ uploadUrl, objectKey })
  } catch (err) {
    console.error('r2-upload-url error:', err)
    return jsonResponse({ error: 'Unable to prepare the image upload. Please try again.' }, 500)
  }
})

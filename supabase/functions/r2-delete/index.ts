// POST { objectKey: string } → { ok: true }
//
// Admin-only. Deletes an object from R2 directly, server-side — DELETE is
// never presigned to the browser. Used when a product image is replaced
// (delete the OLD key only after the new upload + DB update succeed) and
// when a product is deleted (best-effort cleanup; failures are logged
// here rather than allowed to roll back the already-completed database
// delete, per the brief's "don't corrupt product data" instruction).
import { corsHeaders, handlePreflight, jsonResponse } from '../_shared/cors.ts'
import { getCaller, requireAdmin } from '../_shared/auth.ts'
import { deleteObject } from '../_shared/r2.ts'

Deno.serve(async (req) => {
  const preflight = handlePreflight(req)
  if (preflight) return preflight

  try {
    const caller = await getCaller(req)
    if (!requireAdmin(caller)) {
      return jsonResponse({ error: 'Only an admin can delete product images.' }, 403)
    }

    const body = await req.json().catch(() => null)
    const objectKey = body?.objectKey
    if (!objectKey || typeof objectKey !== 'string' || !objectKey.startsWith('products/')) {
      return jsonResponse({ error: 'A valid objectKey is required.' }, 400)
    }

    await deleteObject(objectKey)
    return jsonResponse({ ok: true })
  } catch (err) {
    // Intentionally does not throw further up — see file header. The
    // caller (imageService.remove) treats this as best-effort and the
    // product's own delete/update has already committed by this point.
    console.error('r2-delete error:', err)
    return jsonResponse({ error: 'Unable to delete the image from storage.' }, 500)
  }
})

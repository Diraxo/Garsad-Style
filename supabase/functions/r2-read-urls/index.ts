// POST { keys: string[] } → { urls: Record<string, string> }
//
// Any authenticated, active Garsad user (admin or seller) can resolve
// object keys to short-lived signed GET URLs — sellers need to see
// product photos too. The bucket stays private; nothing here makes any
// object publicly reachable, each URL just works for about an hour.
import { corsHeaders, handlePreflight, jsonResponse } from '../_shared/cors.ts'
import { getCaller, requireActive } from '../_shared/auth.ts'
import { presignGet } from '../_shared/r2.ts'

const MAX_KEYS_PER_REQUEST = 100

Deno.serve(async (req) => {
  const preflight = handlePreflight(req)
  if (preflight) return preflight

  try {
    const caller = await getCaller(req)
    if (!requireActive(caller)) {
      return jsonResponse({ error: 'You must be signed in to view product images.' }, 403)
    }

    const body = await req.json().catch(() => null)
    const keys: unknown = body?.keys
    if (!Array.isArray(keys) || keys.some((k) => typeof k !== 'string')) {
      return jsonResponse({ error: 'keys must be an array of strings.' }, 400)
    }
    const uniqueKeys = [...new Set(keys as string[])].slice(0, MAX_KEYS_PER_REQUEST)

    const entries = await Promise.all(
      uniqueKeys.map(async (key) => [key, await presignGet(key)] as const)
    )

    return jsonResponse({ urls: Object.fromEntries(entries) })
  } catch (err) {
    console.error('r2-read-urls error:', err)
    return jsonResponse({ error: 'Unable to load product images right now.' }, 500)
  }
})

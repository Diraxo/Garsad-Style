// POST (no body) → { sellers: Array<{ id, name, email, role, status, created_at, lastSignInAt }> }
//
// Admin-only. `profiles` has no column for auth activity, so last-sign-in
// info only exists in `auth.users` — which the browser can never read
// directly. This function reads it server-side with the service-role key
// and merges it onto each seller's profile row before returning.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4'
import { corsHeaders, handlePreflight, jsonResponse } from '../_shared/cors.ts'
import { getCaller, requireAdmin } from '../_shared/auth.ts'

Deno.serve(async (req) => {
  const preflight = handlePreflight(req)
  if (preflight) return preflight

  try {
    const caller = await getCaller(req)
    if (!requireAdmin(caller)) {
      return jsonResponse({ error: 'Only an admin can view sellers.' }, 403)
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const admin = createClient(supabaseUrl, serviceRoleKey)

    const { data: profiles, error: profilesError } = await admin
      .from('profiles')
      .select('id, name, email, role, status, created_at')
      .eq('role', 'seller')
      .order('name')

    if (profilesError) {
      console.error('admin-list-sellers: profiles query failed:', profilesError.message)
      return jsonResponse({ error: 'Unable to load sellers. Please try again.' }, 500)
    }

    // Best-effort: a shop's seller count fits comfortably in one page. If
    // this call fails for any reason, still return the profiles — just
    // without sign-in times — rather than failing the whole list.
    let lastSignInById = new Map<string, string | null>()
    const { data: usersPage, error: usersError } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
    if (usersError) {
      console.error('admin-list-sellers: listUsers failed:', usersError.message)
    } else {
      lastSignInById = new Map(usersPage.users.map((u) => [u.id, u.last_sign_in_at ?? null]))
    }

    const sellers = (profiles ?? []).map((p) => ({
      id: p.id,
      name: p.name,
      email: p.email,
      role: p.role,
      status: p.status,
      created_at: p.created_at,
      lastSignInAt: lastSignInById.get(p.id) ?? null,
    }))

    return jsonResponse({ sellers })
  } catch (err) {
    console.error('admin-list-sellers error:', err)
    return jsonResponse({ error: 'Unable to load sellers. Please try again.' }, 500)
  }
})

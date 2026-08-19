// POST { name: string, email: string, password: string }
// → { id, name, email, role: 'seller', status: 'active', createdAt }
//
// Admin-only. This is the only supported way to create a seller account —
// it replaces the old "create the user by hand in the Supabase Dashboard"
// workflow. Creates a real Supabase Auth user via the server-side Admin
// API (the service-role key is only ever read here, never sent to the
// browser) and makes sure the resulting profiles row is role=seller,
// status=active with the admin-entered name.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4'
import { corsHeaders, handlePreflight, jsonResponse } from '../_shared/cors.ts'
import { getCaller, requireAdmin } from '../_shared/auth.ts'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MIN_PASSWORD_LENGTH = 8

Deno.serve(async (req) => {
  const preflight = handlePreflight(req)
  if (preflight) return preflight

  try {
    const caller = await getCaller(req)
    if (!requireAdmin(caller)) {
      return jsonResponse({ error: 'Only an admin can create seller accounts.' }, 403)
    }

    const body = await req.json().catch(() => null)
    const name = typeof body?.name === 'string' ? body.name.trim() : ''
    const email = typeof body?.email === 'string' ? body.email.trim() : ''
    const password = typeof body?.password === 'string' ? body.password : ''

    if (!name) {
      return jsonResponse({ error: 'Seller name is required.' }, 400)
    }
    if (!email || !EMAIL_RE.test(email)) {
      return jsonResponse({ error: 'Enter a valid email address.' }, 400)
    }
    if (!password || password.length < MIN_PASSWORD_LENGTH) {
      return jsonResponse({ error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.` }, 400)
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const admin = createClient(supabaseUrl, serviceRoleKey)

    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name },
    })

    if (createError || !created?.user) {
      const status = createError?.status
      const code = (createError as { code?: string } | null)?.code
      const message = (createError?.message ?? '').toLowerCase()
      const isDuplicate =
        status === 422 ||
        code === 'email_exists' ||
        message.includes('already been registered') ||
        message.includes('already registered')

      if (isDuplicate) {
        return jsonResponse({ error: 'This email is already registered.' }, 409)
      }
      // Never log the password — only the error message from Auth.
      console.error('admin-create-seller: createUser failed:', createError?.message)
      return jsonResponse({ error: 'Unable to create seller. Please try again.' }, 500)
    }

    const userId = created.user.id

    // handle_new_user() already inserted a profiles row (role=seller,
    // status=active) as part of the auth.users insert above — this update
    // makes the admin-entered name authoritative and the resulting state
    // explicit rather than relying solely on the trigger's fallback name.
    const { data: profile, error: profileError } = await admin
      .from('profiles')
      .update({ name, role: 'seller', status: 'active' })
      .eq('id', userId)
      .select('id, name, email, role, status, created_at')
      .single()

    if (profileError || !profile) {
      console.error('admin-create-seller: profile update failed:', profileError?.message)
      return jsonResponse(
        { error: 'Seller account was created, but the profile could not be finished. Please try again or contact support.' },
        500
      )
    }

    return jsonResponse({
      id: profile.id,
      name: profile.name,
      email: profile.email,
      role: profile.role,
      status: profile.status,
      createdAt: profile.created_at,
    })
  } catch (err) {
    console.error('admin-create-seller error:', err)
    return jsonResponse({ error: 'Unable to create seller. Please try again.' }, 500)
  }
})

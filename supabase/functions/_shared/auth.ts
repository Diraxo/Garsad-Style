// Verifies the caller's Supabase session and profile from inside an Edge
// Function. Uses the service-role key (available automatically as an env
// var in every Edge Function — never exposed to the browser) so it can
// read `profiles` regardless of RLS, then re-derives the same permission
// rules RLS already enforces on the tables themselves. This function is
// the "server-side check" the brief requires — the browser's role is
// never trusted on its own.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4'

export interface CallerProfile {
  id: string
  role: 'admin' | 'seller'
  status: 'active' | 'disabled'
}

export async function getCaller(req: Request): Promise<CallerProfile | null> {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) return null
  const jwt = authHeader.replace('Bearer ', '')

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const admin = createClient(supabaseUrl, serviceRoleKey)

  const { data: userData, error: userError } = await admin.auth.getUser(jwt)
  if (userError || !userData.user) return null

  const { data: profile, error: profileError } = await admin
    .from('profiles')
    .select('id, role, status')
    .eq('id', userData.user.id)
    .maybeSingle()
  if (profileError || !profile) return null

  return profile as CallerProfile
}

export function requireActive(caller: CallerProfile | null): caller is CallerProfile {
  return !!caller && caller.status === 'active'
}

export function requireAdmin(caller: CallerProfile | null): caller is CallerProfile {
  return requireActive(caller) && caller.role === 'admin'
}

import { supabase } from '../lib/supabase'
import type { User } from '../types'

export interface AuthResult {
  ok: boolean
  user?: User
  error?: string
}

function mapProfile(row: {
  id: string; name: string; email: string; role: 'admin' | 'seller'; status: 'active' | 'disabled'; created_at: string
}): User {
  return { id: row.id, name: row.name, email: row.email, role: row.role, status: row.status, createdAt: row.created_at }
}

async function fetchProfile(userId: string): Promise<User | null> {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle()
  if (error || !data) return null
  return mapProfile(data)
}

function friendlyAuthError(message: string): string {
  const m = message.toLowerCase()
  if (m.includes('invalid login') || m.includes('invalid_credentials')) return 'Incorrect email or password.'
  if (m.includes('email not confirmed')) return 'Please confirm your email before logging in.'
  if (m.includes('rate limit')) return 'Too many attempts. Please wait a moment and try again.'
  return 'Could not sign in. Please try again.'
}

export const authService = {
  async login(email: string, password: string): Promise<AuthResult> {
    const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    if (error) return { ok: false, error: friendlyAuthError(error.message) }
    if (!data.user) return { ok: false, error: 'Could not sign in.' }

    const profile = await fetchProfile(data.user.id)
    if (!profile) {
      await supabase.auth.signOut()
      return { ok: false, error: 'No profile found for this account. Ask an admin to check your access.' }
    }
    if (profile.status === 'disabled') {
      await supabase.auth.signOut()
      return { ok: false, error: 'This account has been disabled by an administrator.' }
    }
    return { ok: true, user: profile }
  },

  async logout(): Promise<void> {
    await supabase.auth.signOut()
  },

  /** One-shot check used on initial app load. */
  async getSession(): Promise<User | null> {
    const { data } = await supabase.auth.getSession()
    const authUser = data.session?.user
    if (!authUser) return null
    const profile = await fetchProfile(authUser.id)
    if (!profile || profile.status === 'disabled') return null
    return profile
  },

  /** Ongoing subscription so session refresh/expiry/logout in another tab stays in sync. */
  onChange(callback: (user: User | null) => void): () => void {
    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!session?.user) {
        callback(null)
        return
      }
      const profile = await fetchProfile(session.user.id)
      callback(profile && profile.status !== 'disabled' ? profile : null)
    })
    return () => sub.subscription.unsubscribe()
  },
}

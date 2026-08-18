import type { User } from '../types'
import { supabase } from '../lib/supabase'

function mapRow(row: { id: string; name: string; email: string; role: 'admin' | 'seller'; status: 'active' | 'disabled'; created_at: string }): User {
  return { id: row.id, name: row.name, email: row.email, role: row.role, status: row.status, createdAt: row.created_at }
}

export const sellerService = {
  async list(): Promise<User[]> {
    const { data, error } = await supabase.from('profiles').select('*').eq('role', 'seller').order('name')
    if (error) throw new Error('Unable to load sellers. Please try again.')
    return (data ?? []).map(mapRow)
  },

  async salesCount(sellerId: string): Promise<number> {
    const { count } = await supabase.from('sales').select('id', { count: 'exact', head: true }).eq('seller_id', sellerId)
    return count ?? 0
  },

  async lastActivity(sellerId: string): Promise<string | null> {
    const { data } = await supabase
      .from('sales')
      .select('created_at')
      .eq('seller_id', sellerId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    return data?.created_at ?? null
  },

  /** Admin-only, enforced by the profiles_admin_update RLS policy. */
  async setStatus(id: string, status: 'active' | 'disabled'): Promise<User> {
    const { data, error } = await supabase.from('profiles').update({ status }).eq('id', id).select().single()
    if (error) throw new Error('Unable to update seller status.')
    return mapRow(data)
  },
}

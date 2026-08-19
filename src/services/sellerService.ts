import type { User } from '../types'
import { supabase } from '../lib/supabase'

export interface SellerRow extends User {
  /** From Supabase Auth, resolved server-side — null if the seller has never signed in. */
  lastSignInAt: string | null
}

function mapRow(row: {
  id: string
  name: string
  email: string
  role: 'admin' | 'seller'
  status: 'active' | 'disabled'
  created_at: string
}): User {
  return { id: row.id, name: row.name, email: row.email, role: row.role, status: row.status, createdAt: row.created_at }
}

export interface CreateSellerInput {
  name: string
  email: string
  password: string
}

export const sellerService = {
  /** Admin-only. Enriches each profile with its Supabase Auth last-sign-in time. */
  async list(): Promise<SellerRow[]> {
    const { data, error } = await supabase.functions.invoke('admin-list-sellers')
    if (error || !data?.sellers) {
      throw new Error(data?.error || 'Unable to load sellers. Please try again.')
    }
    const rows = data.sellers as Array<{
      id: string
      name: string
      email: string
      role: 'admin' | 'seller'
      status: 'active' | 'disabled'
      created_at: string
      lastSignInAt: string | null
    }>
    return rows.map((r) => ({ ...mapRow(r), lastSignInAt: r.lastSignInAt }))
  },

  async salesCount(sellerId: string): Promise<number> {
    const { count } = await supabase.from('sales').select('id', { count: 'exact', head: true }).eq('seller_id', sellerId)
    return count ?? 0
  },

  /**
   * Admin-only. Creates the Supabase Auth user (via a secure Edge Function
   * using the service-role key) and the matching seller profile in one
   * step. Never sends or stores the password anywhere but the initial
   * request to that function.
   */
  async create(input: CreateSellerInput): Promise<User> {
    const { data, error } = await supabase.functions.invoke('admin-create-seller', {
      body: { name: input.name, email: input.email, password: input.password },
    })
    if (error || !data?.id) {
      throw new Error(data?.error || 'Unable to create seller. Please try again.')
    }
    return mapRow({ id: data.id, name: data.name, email: data.email, role: data.role, status: data.status, created_at: data.createdAt })
  },

  /** Admin-only, enforced by the profiles_admin_update RLS policy. */
  async setStatus(id: string, status: 'active' | 'disabled'): Promise<User> {
    const { data, error } = await supabase.from('profiles').update({ status }).eq('id', id).select().single()
    if (error) throw new Error('Unable to update seller status.')
    return mapRow(data)
  },
}

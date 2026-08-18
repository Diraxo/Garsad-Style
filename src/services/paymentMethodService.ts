import type { PaymentMethod } from '../types'
import { supabase } from '../lib/supabase'

function mapRow(row: { id: string; name: string; active: boolean; created_at: string }): PaymentMethod {
  return { id: row.id, name: row.name, active: row.active, createdAt: row.created_at }
}

export const paymentMethodService = {
  async list(activeOnly = false): Promise<PaymentMethod[]> {
    let query = supabase.from('payment_methods').select('*').order('name')
    if (activeOnly) query = query.eq('active', true)
    const { data, error } = await query
    if (error) throw new Error('Unable to load payment methods. Please try again.')
    return (data ?? []).map(mapRow)
  },

  async create(name: string): Promise<PaymentMethod> {
    const { data, error } = await supabase.from('payment_methods').insert({ name: name.trim() }).select().single()
    if (error) throw new Error(error.code === '23505' ? 'A payment method with this name already exists.' : 'Unable to add payment method.')
    return mapRow(data)
  },

  async rename(id: string, name: string): Promise<PaymentMethod> {
    const { data, error } = await supabase.from('payment_methods').update({ name: name.trim() }).eq('id', id).select().single()
    if (error) throw new Error('Unable to rename payment method.')
    return mapRow(data)
  },

  async toggleActive(id: string): Promise<PaymentMethod> {
    const { data: current, error: readError } = await supabase.from('payment_methods').select('active').eq('id', id).single()
    if (readError || !current) throw new Error('Payment method not found.')
    const { data, error } = await supabase
      .from('payment_methods')
      .update({ active: !current.active })
      .eq('id', id)
      .select()
      .single()
    if (error) throw new Error('Unable to update payment method.')
    return mapRow(data)
  },

  async remove(id: string): Promise<void> {
    const { error } = await supabase.from('payment_methods').delete().eq('id', id)
    if (error) throw new Error('Unable to delete payment method.')
  },
}

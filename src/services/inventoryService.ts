import type { InventoryMovement } from '../types'
import { supabase } from '../lib/supabase'

type MovementRow = {
  id: string; product_id: string
  type: 'INITIAL_STOCK' | 'SALE' | 'RESTOCK' | 'ADJUSTMENT'
  quantity_change: number; resulting_stock: number
  user_id: string | null; note: string | null; created_at: string
  profiles: { name: string } | { name: string }[] | null
}

function mapRow(row: MovementRow): InventoryMovement {
  const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles
  return {
    id: row.id,
    productId: row.product_id,
    type: row.type,
    quantityChange: row.quantity_change,
    resultingStock: row.resulting_stock,
    userId: row.user_id ?? '',
    userName: profile?.name ?? 'Unknown',
    note: row.note ?? undefined,
    createdAt: row.created_at,
  }
}

export const inventoryService = {
  async listMovements(productId?: string): Promise<InventoryMovement[]> {
    let query = supabase
      .from('inventory_movements')
      .select('*, profiles(name)')
      .order('created_at', { ascending: false })
    if (productId) query = query.eq('product_id', productId)

    const { data, error } = await query
    if (error) throw new Error('Unable to load inventory history. Please try again.')
    return (data ?? []).map((row) => mapRow(row as MovementRow))
  },

  /** Admin-only. Adds stock and logs the movement atomically via RPC. */
  async addStock(productId: string, amount: number, note?: string) {
    const { data, error } = await supabase.rpc('restock_product', {
      p_product_id: productId,
      p_amount: amount,
      p_note: note ?? null,
    })
    if (error) throw new Error(error.message.includes('greater than zero') ? error.message : 'Unable to add stock.')
    return data
  },

  /** Admin-only. Sets an exact quantity and logs the delta atomically via RPC. */
  async adjustStock(productId: string, newQuantity: number, note?: string) {
    const { data, error } = await supabase.rpc('adjust_product_stock', {
      p_product_id: productId,
      p_new_quantity: newQuantity,
      p_note: note ?? null,
    })
    if (error) throw new Error('Unable to adjust stock.')
    return data
  },
}

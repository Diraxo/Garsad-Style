import type { ShopSettings } from '../types'
import { supabase } from '../lib/supabase'
import type { Database } from '../lib/database.types'

type ShopSettingsUpdate = Database['public']['Tables']['shop_settings']['Update']

function mapRow(row: {
  shop_name: string; logo_initial: string; phone: string; address: string; currency: string; low_stock_threshold: number
}): ShopSettings {
  return {
    shopName: row.shop_name,
    logoInitial: row.logo_initial,
    phone: row.phone,
    address: row.address,
    currency: row.currency,
    lowStockThreshold: row.low_stock_threshold,
  }
}

export const settingsService = {
  async get(): Promise<ShopSettings> {
    const { data, error } = await supabase.from('shop_settings').select('*').eq('id', true).single()
    if (error || !data) throw new Error('Unable to load shop settings. Please try again.')
    return mapRow(data)
  },

  async update(patch: Partial<ShopSettings>): Promise<ShopSettings> {
    const dbPatch: ShopSettingsUpdate = {}
    if (patch.shopName !== undefined) dbPatch.shop_name = patch.shopName
    if (patch.logoInitial !== undefined) dbPatch.logo_initial = patch.logoInitial
    if (patch.phone !== undefined) dbPatch.phone = patch.phone
    if (patch.address !== undefined) dbPatch.address = patch.address
    if (patch.currency !== undefined) dbPatch.currency = patch.currency
    if (patch.lowStockThreshold !== undefined) dbPatch.low_stock_threshold = patch.lowStockThreshold

    const { data, error } = await supabase.from('shop_settings').update(dbPatch).eq('id', true).select().single()
    if (error) throw new Error('Unable to save settings. Please try again.')
    return mapRow(data)
  },
}

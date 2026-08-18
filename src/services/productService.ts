import type { Product } from '../types'
import { supabase } from '../lib/supabase'
import type { Database } from '../lib/database.types'

type ProductUpdate = Database['public']['Tables']['products']['Update']

export interface ProductFilters {
  search?: string
  categoryId?: string
  stock?: 'all' | 'in_stock' | 'low' | 'critical' | 'sold_out'
  sort?: 'name_asc' | 'name_desc' | 'price_asc' | 'price_desc' | 'stock_asc' | 'stock_desc'
}

type ProductRow = {
  id: string; name: string; brand: string; category_id: string; sku: string
  size: string | null; color: string | null; purchase_cost: number; selling_price: number
  quantity: number; initial_quantity: number; description: string | null; image_url: string | null
  created_at: string; updated_at: string
}

function mapRow(row: ProductRow): Product {
  return {
    id: row.id,
    name: row.name,
    brand: row.brand,
    categoryId: row.category_id,
    sku: row.sku,
    size: row.size ?? undefined,
    color: row.color ?? undefined,
    purchaseCost: Number(row.purchase_cost),
    sellingPrice: Number(row.selling_price),
    quantity: row.quantity,
    initialQuantity: row.initial_quantity,
    description: row.description ?? undefined,
    imageUrl: row.image_url ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function matchesStock(p: Product, filter: ProductFilters['stock'], threshold: number) {
  if (!filter || filter === 'all') return true
  if (filter === 'sold_out') return p.quantity <= 0
  if (filter === 'critical') return p.quantity === 1
  if (filter === 'low') return p.quantity > 1 && p.quantity <= threshold
  if (filter === 'in_stock') return p.quantity > threshold
  return true
}

async function getLowStockThreshold(): Promise<number> {
  const { data } = await supabase.from('shop_settings').select('low_stock_threshold').eq('id', true).single()
  return data?.low_stock_threshold ?? 5
}

export const productService = {
  async list(filters: ProductFilters = {}): Promise<Product[]> {
    let query = supabase.from('products').select('*')

    if (filters.search && filters.search.trim()) {
      const q = filters.search.trim().replace(/[%_]/g, '')
      query = query.or(`name.ilike.%${q}%,brand.ilike.%${q}%,sku.ilike.%${q}%`)
    }
    if (filters.categoryId && filters.categoryId !== 'all') {
      query = query.eq('category_id', filters.categoryId)
    }

    const { data, error } = await query
    if (error) throw new Error('Unable to load products. Please try again.')

    let items = (data ?? []).map(mapRow)
    const threshold = await getLowStockThreshold()
    items = items.filter((p) => matchesStock(p, filters.stock, threshold))

    switch (filters.sort) {
      case 'name_desc': items.sort((a, b) => b.name.localeCompare(a.name)); break
      case 'price_asc': items.sort((a, b) => a.sellingPrice - b.sellingPrice); break
      case 'price_desc': items.sort((a, b) => b.sellingPrice - a.sellingPrice); break
      case 'stock_asc': items.sort((a, b) => a.quantity - b.quantity); break
      case 'stock_desc': items.sort((a, b) => b.quantity - a.quantity); break
      default: items.sort((a, b) => a.name.localeCompare(b.name))
    }
    return items
  },

  async get(id: string): Promise<Product | null> {
    const { data, error } = await supabase.from('products').select('*').eq('id', id).maybeSingle()
    if (error || !data) return null
    return mapRow(data)
  },

  /** Creates the product and its INITIAL_STOCK movement atomically via RPC. */
  async create(
    input: Omit<Product, 'id' | 'createdAt' | 'updatedAt' | 'initialQuantity'>
  ): Promise<Product> {
    if (
      !Number.isFinite(input.purchaseCost) ||
      !Number.isFinite(input.sellingPrice) ||
      !Number.isFinite(input.quantity)
    ) {
      throw new Error('Unable to create product: purchase cost, selling price, and quantity must be valid numbers.')
    }
    const { data, error } = await supabase.rpc('create_product_with_stock', {
      p_name: input.name,
      p_brand: input.brand,
      p_category_id: input.categoryId,
      p_sku: input.sku,
      p_size: input.size ?? null,
      p_color: input.color ?? null,
      p_purchase_cost: input.purchaseCost,
      p_selling_price: input.sellingPrice,
      p_quantity: input.quantity,
      p_description: input.description ?? null,
      p_image_url: input.imageUrl ?? null,
    })
    if (error) {
      throw new Error(error.code === '23505' ? 'A product with this SKU already exists.' : 'Unable to create product.')
    }
    return mapRow(data as ProductRow)
  },

  /**
   * Updates product fields. If `quantity` is part of the patch, that part is
   * routed through the adjust_product_stock RPC (so it still produces an
   * inventory movement) rather than written directly — everything else goes
   * through a normal table update. `imageUrl: undefined` means "leave the
   * image alone"; pass `imageUrl: null` to explicitly clear it.
   */
  async update(id: string, patch: Omit<Partial<Product>, 'imageUrl'> & { imageUrl?: string | null }): Promise<Product> {
    const { quantity, ...rest } = patch

    if (quantity !== undefined) {
      if (!Number.isFinite(quantity) || !Number.isInteger(quantity) || quantity < 0) {
        throw new Error('Unable to update stock quantity: quantity must be a valid whole number.')
      }
      const { error: rpcError } = await supabase.rpc('adjust_product_stock', {
        p_product_id: id,
        p_new_quantity: quantity,
        p_note: 'Adjusted from product edit form',
      })
      if (rpcError) throw new Error('Unable to update stock quantity.')
    }

    const dbPatch: ProductUpdate = {}
    if (rest.name !== undefined) dbPatch.name = rest.name
    if (rest.brand !== undefined) dbPatch.brand = rest.brand
    if (rest.categoryId !== undefined) dbPatch.category_id = rest.categoryId
    if (rest.sku !== undefined) dbPatch.sku = rest.sku
    if (rest.size !== undefined) dbPatch.size = rest.size ?? null
    if (rest.color !== undefined) dbPatch.color = rest.color ?? null
    if (rest.purchaseCost !== undefined) {
      if (!Number.isFinite(rest.purchaseCost) || rest.purchaseCost < 0) {
        throw new Error('Unable to update product: purchase cost must be a valid number.')
      }
      dbPatch.purchase_cost = rest.purchaseCost
    }
    if (rest.sellingPrice !== undefined) {
      if (!Number.isFinite(rest.sellingPrice) || rest.sellingPrice <= 0) {
        throw new Error('Unable to update product: selling price must be a valid number.')
      }
      dbPatch.selling_price = rest.sellingPrice
    }
    if (rest.description !== undefined) dbPatch.description = rest.description ?? null
    if (rest.imageUrl !== undefined) dbPatch.image_url = rest.imageUrl // string or null; undefined already excluded

    if (Object.keys(dbPatch).length > 0) {
      const { error } = await supabase.from('products').update(dbPatch).eq('id', id)
      if (error) throw new Error(error.code === '23505' ? 'A product with this SKU already exists.' : 'Unable to update product.')
    }

    const updated = await this.get(id)
    if (!updated) throw new Error('Product not found after update.')
    return updated
  },

  async remove(id: string): Promise<void> {
    // Read the image key first so we can clean it up after the row is
    // gone — deleting the DB row is the operation that matters; R2
    // cleanup is best-effort and must never block or reverse it.
    const existing = await this.get(id)
    const { error } = await supabase.from('products').delete().eq('id', id)
    if (error) throw new Error('Unable to delete product.')
    if (existing?.imageUrl) {
      const { imageService } = await import('./imageService')
      await imageService.remove(existing.imageUrl)
    }
  },
}

import type { Sale, SaleItem } from '../types'
import { supabase } from '../lib/supabase'

export interface RecordSaleInput {
  productId: string
  quantity: number
  actualPrice: number
  paymentMethodId: string
}

export interface SaleFilters {
  date?: 'today' | 'yesterday' | 'week' | 'month' | 'all'
  sellerId?: string
  paymentMethodId?: string
  productId?: string
  categoryId?: string
  sellerOnly?: string
}

type SaleRow = {
  id: string
  seller_id: string
  payment_method_id: string
  total_amount: number
  total_profit: number
  created_at: string
  profiles: { name: string } | { name: string }[] | null
  payment_methods: { name: string } | { name: string }[] | null
  sale_items: {
    id: string; product_id: string; quantity: number
    original_price: number; actual_price: number; purchase_cost: number; profit: number
    products: { name: string; sku: string; category_id: string } | { name: string; sku: string; category_id: string }[] | null
  }[]
}

function one<T>(v: T | T[] | null): T | null {
  return Array.isArray(v) ? (v[0] ?? null) : v
}

function mapRow(row: SaleRow): Sale & { _categoryIds: string[] } {
  const seller = one(row.profiles)
  const pm = one(row.payment_methods)
  const items: SaleItem[] = row.sale_items.map((it) => {
    const product = one(it.products)
    return {
      id: it.id,
      saleId: row.id,
      productId: it.product_id,
      productName: product?.name ?? 'Deleted product',
      sku: product?.sku ?? '',
      quantity: it.quantity,
      originalPrice: Number(it.original_price),
      actualPrice: Number(it.actual_price),
      purchaseCost: Number(it.purchase_cost),
      profit: Number(it.profit),
    }
  })
  return {
    id: row.id,
    sellerId: row.seller_id,
    sellerName: seller?.name ?? 'Unknown seller',
    paymentMethodId: row.payment_method_id,
    paymentMethodName: pm?.name ?? 'Unknown',
    items,
    totalAmount: Number(row.total_amount),
    totalProfit: Number(row.total_profit),
    createdAt: row.created_at,
    _categoryIds: row.sale_items.map((it) => one(it.products)?.category_id).filter((v): v is string => !!v),
  }
}

function dateRangeBounds(range?: SaleFilters['date']): { gte?: string; lt?: string } {
  if (!range || range === 'all') return {}
  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  if (range === 'today') return { gte: startOfToday.toISOString() }
  if (range === 'yesterday') {
    const startOfYesterday = new Date(startOfToday.getTime() - 86400000)
    return { gte: startOfYesterday.toISOString(), lt: startOfToday.toISOString() }
  }
  if (range === 'week') return { gte: new Date(now.getTime() - 7 * 86400000).toISOString() }
  if (range === 'month') return { gte: new Date(now.getTime() - 30 * 86400000).toISOString() }
  return {}
}

const SALE_SELECT = `
  id, seller_id, payment_method_id, total_amount, total_profit, created_at,
  profiles(name),
  payment_methods(name),
  sale_items(id, product_id, quantity, original_price, actual_price, purchase_cost, profit, products(name, sku, category_id))
`

export const salesService = {
  /**
   * Records a sale via the record_sale() Postgres function — a single
   * atomic call that checks stock, writes the sale + items, decrements
   * inventory, and logs the movement. If stock is insufficient the
   * function raises and nothing is written; we surface that as a plain
   * error message here.
   */
  async recordSale(input: RecordSaleInput): Promise<{ ok: boolean; error?: string }> {
    const { error } = await supabase.rpc('record_sale', {
      p_product_id: input.productId,
      p_quantity: input.quantity,
      p_actual_price: input.actualPrice,
      p_payment_method_id: input.paymentMethodId,
    })
    if (error) {
      // Postgres RAISE EXCEPTION messages come through as error.message
      return { ok: false, error: error.message || 'Unable to record this sale.' }
    }
    return { ok: true }
  },

  async list(filters: SaleFilters = {}): Promise<Sale[]> {
    let query = supabase.from('sales').select(SALE_SELECT).order('created_at', { ascending: false })

    const seller = filters.sellerOnly ?? (filters.sellerId && filters.sellerId !== 'all' ? filters.sellerId : undefined)
    if (seller) query = query.eq('seller_id', seller)
    if (filters.paymentMethodId && filters.paymentMethodId !== 'all') query = query.eq('payment_method_id', filters.paymentMethodId)

    const { gte, lt } = dateRangeBounds(filters.date)
    if (gte) query = query.gte('created_at', gte)
    if (lt) query = query.lt('created_at', lt)

    const { data, error } = await query
    if (error) throw new Error('Unable to load sales. Please try again.')

    let items = (data ?? []).map((row) => mapRow(row as unknown as SaleRow))

    if (filters.productId && filters.productId !== 'all') {
      items = items.filter((s) => s.items.some((i) => i.productId === filters.productId))
    }
    if (filters.categoryId && filters.categoryId !== 'all') {
      items = items.filter((s) => s._categoryIds.includes(filters.categoryId!))
    }
    return items
  },

  async dashboardStats() {
    const [{ count: totalProducts }, { data: qtyRows }, todaySales, { data: settings }] = await Promise.all([
      supabase.from('products').select('id', { count: 'exact', head: true }),
      supabase.from('products').select('quantity'),
      this.list({ date: 'today' }),
      supabase.from('shop_settings').select('low_stock_threshold').eq('id', true).single(),
    ])

    const threshold = settings?.low_stock_threshold ?? 5
    const { data: allQuantities } = { data: qtyRows } // already fetched above
    const totalInventoryUnits = (allQuantities ?? []).reduce((sum, r) => sum + (r.quantity ?? 0), 0)

    const { data: lowStockRows } = await supabase.from('products').select('quantity').gt('quantity', 0).lte('quantity', threshold)
    const { count: soldOutCount } = await supabase.from('products').select('id', { count: 'exact', head: true }).lte('quantity', 0)

    const totalUnits = (list: Sale[]) => list.reduce((sum, s) => sum + s.items.reduce((a, i) => a + i.quantity, 0), 0)

    return {
      totalProducts: totalProducts ?? 0,
      totalInventoryUnits,
      todaySalesCount: todaySales.length,
      todayRevenue: todaySales.reduce((sum, s) => sum + s.totalAmount, 0),
      todayProfit: todaySales.reduce((sum, s) => sum + s.totalProfit, 0),
      todayUnitsSold: totalUnits(todaySales),
      lowStockCount: lowStockRows?.length ?? 0,
      soldOutCount: soldOutCount ?? 0,
    }
  },

  async salesSeries(range: 'today' | 'week' | 'month' = 'week') {
    const days = range === 'today' ? 1 : range === 'week' ? 7 : 30
    const since = new Date()
    since.setHours(0, 0, 0, 0)
    since.setDate(since.getDate() - (days - 1))

    const { data, error } = await supabase
      .from('sales')
      .select('total_amount, total_profit, created_at, sale_items(quantity)')
      .gte('created_at', since.toISOString())
    if (error) throw new Error('Unable to load sales chart data.')

    const buckets: { label: string; revenue: number; profit: number; units: number }[] = []
    for (let i = days - 1; i >= 0; i--) {
      const day = new Date()
      day.setHours(0, 0, 0, 0)
      day.setDate(day.getDate() - i)
      const next = new Date(day.getTime() + 86400000)
      const inBucket = (data ?? []).filter((s) => {
        const d = new Date(s.created_at)
        return d >= day && d < next
      })
      buckets.push({
        label: day.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        revenue: inBucket.reduce((sum, s) => sum + Number(s.total_amount), 0),
        profit: inBucket.reduce((sum, s) => sum + Number(s.total_profit), 0),
        units: inBucket.reduce((sum, s) => sum + s.sale_items.reduce((a, i) => a + i.quantity, 0), 0),
      })
    }
    return buckets
  },
}

import { useCallback, useEffect, useState } from 'react'
import { AppShell } from '../../components/layout/AppShell'
import { EmptyState, PageLoading, Spinner } from '../../components/common/Basics'
import { StockBadge } from '../../components/common/StockBadge'
import { Modal } from '../../components/common/Modal'
import { productService, type ProductFilters } from '../../services/productService'
import { categoryService } from '../../services/categoryService'
import { settingsService } from '../../services/settingsService'
import { inventoryService } from '../../services/inventoryService'
import { useToast } from '../../context/ToastContext'
import type { Category, Product, ShopSettings } from '../../types'

export default function Inventory() {
  const { show } = useToast()
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [settings, setSettings] = useState<ShopSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [filters, setFilters] = useState<ProductFilters>({ search: '', categoryId: 'all', stock: 'all', sort: 'stock_asc' })
  const [restockTarget, setRestockTarget] = useState<Product | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError('')
    try {
      const [prod, cats, set] = await Promise.all([productService.list(filters), categoryService.list(), settingsService.get()])
      setProducts(prod)
      setCategories(cats)
      setSettings(set)
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'Unable to load inventory.')
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => { load() }, [load])

  const categoryMap = Object.fromEntries(categories.map((c) => [c.id, c]))

  async function handleRestock(amount: number, note: string) {
    if (!restockTarget) return
    try {
      await inventoryService.addStock(restockTarget.id, amount, note)
      show('Stock updated successfully.')
      setRestockTarget(null)
      await load()
    } catch (e) {
      show(e instanceof Error ? e.message : 'Unable to update stock.', 'error')
    }
  }

  return (
    <AppShell title="Inventory">
      <div className="space-y-4">
        <div className="card p-3 flex flex-wrap items-center gap-2">
          <input
            className="input flex-1 min-w-[180px]"
            placeholder="Search name, brand or SKU…"
            value={filters.search}
            onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
          />
          <select className="input w-auto" value={filters.categoryId} onChange={(e) => setFilters((f) => ({ ...f, categoryId: e.target.value }))}>
            <option value="all">All categories</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select className="input w-auto" value={filters.stock} onChange={(e) => setFilters((f) => ({ ...f, stock: e.target.value as ProductFilters['stock'] }))}>
            <option value="all">All</option>
            <option value="in_stock">In Stock</option>
            <option value="low">Low Stock</option>
            <option value="critical">Critical</option>
            <option value="sold_out">Sold Out</option>
          </select>
          <select className="input w-auto" value={filters.sort} onChange={(e) => setFilters((f) => ({ ...f, sort: e.target.value as ProductFilters['sort'] }))}>
            <option value="stock_asc">Stock low–high</option>
            <option value="stock_desc">Stock high–low</option>
            <option value="name_asc">Name A–Z</option>
          </select>
        </div>

        {loading ? (
          <PageLoading />
        ) : loadError ? (
          <div className="card">
            <EmptyState title="Unable to load inventory" hint={loadError} action={<button className="btn-primary" onClick={load}>Retry</button>} />
          </div>
        ) : products.length === 0 ? (
          <div className="card"><EmptyState title="No products found" hint="Try a different search or filter." /></div>
        ) : (
          <div className="card overflow-x-auto">
            <table className="w-full text-sm min-w-[760px]">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-ink-400 border-b border-ink-100">
                  <th className="px-4 py-3 font-semibold">Product</th>
                  <th className="px-4 py-3 font-semibold">Initial</th>
                  <th className="px-4 py-3 font-semibold">Sold</th>
                  <th className="px-4 py-3 font-semibold">Current</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Last update</th>
                  <th className="px-4 py-3 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {products.map((p) => (
                  <tr key={p.id} className="hover:bg-ink-50">
                    <td className="px-4 py-3 font-medium text-ink-800">
                      {p.name}
                      <span className="block text-xs text-ink-400 font-normal">{categoryMap[p.categoryId]?.name} · {p.sku}</span>
                    </td>
                    <td className="px-4 py-3 text-ink-500">{p.initialQuantity}</td>
                    <td className="px-4 py-3 text-ink-500">{Math.max(0, p.initialQuantity - p.quantity)}</td>
                    <td className="px-4 py-3 font-semibold text-ink-800">{p.quantity}</td>
                    <td className="px-4 py-3"><StockBadge quantity={p.quantity} threshold={settings?.lowStockThreshold} /></td>
                    <td className="px-4 py-3 text-ink-400 text-xs">{new Date(p.updatedAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-right">
                      <button className="btn-secondary !py-1.5 !px-3 !text-xs" onClick={() => setRestockTarget(p)}>Add stock</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal open={!!restockTarget} title="Add stock" onClose={() => setRestockTarget(null)}>
        {restockTarget && <RestockForm product={restockTarget} onSubmit={handleRestock} onCancel={() => setRestockTarget(null)} />}
      </Modal>
    </AppShell>
  )
}

function RestockForm({
  product,
  onSubmit,
  onCancel,
}: {
  product: Product
  onSubmit: (amount: number, note: string) => Promise<void>
  onCancel: () => void
}) {
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const parsedAmount = Number(amount)

  async function handleSubmit() {
    if (!amount || !Number.isInteger(parsedAmount) || parsedAmount <= 0) {
      setError('Enter a whole number greater than zero.')
      return
    }
    setSubmitting(true)
    try {
      await onSubmit(parsedAmount, note)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="bg-ink-50 rounded-lg p-3 flex items-center justify-between text-sm">
        <span className="text-ink-500">Current stock</span>
        <span className="font-semibold text-ink-800">{product.quantity}</span>
      </div>
      <div>
        <label className="label">Add stock</label>
        <input className="input" inputMode="numeric" value={amount} onChange={(e) => { setAmount(e.target.value); setError('') }} placeholder="20" autoFocus />
        {error && <p className="text-xs text-crit-600 mt-1">{error}</p>}
      </div>
      <div>
        <label className="label">Note <span className="text-ink-400 normal-case font-normal">(optional)</span></label>
        <input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. New shipment" />
      </div>
      {amount && !isNaN(parsedAmount) && parsedAmount > 0 && (
        <div className="bg-brand-50 rounded-lg p-3 flex items-center justify-between text-sm">
          <span className="text-brand-700">New stock</span>
          <span className="font-semibold text-brand-800">{product.quantity + parsedAmount}</span>
        </div>
      )}
      <div className="flex justify-end gap-2 pt-1">
        <button className="btn-secondary" onClick={onCancel} disabled={submitting}>Cancel</button>
        <button className="btn-primary" onClick={handleSubmit} disabled={submitting}>
          {submitting ? <Spinner /> : 'Add stock'}
        </button>
      </div>
    </div>
  )
}

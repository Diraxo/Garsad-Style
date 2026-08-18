import { useEffect, useState } from 'react'
import { AppShell } from '../../components/layout/AppShell'
import { EmptyState, PageLoading } from '../../components/common/Basics'
import { StockBadge } from '../../components/common/StockBadge'
import { ProductImage } from '../../components/common/ProductImage'
import { Modal } from '../../components/common/Modal'
import { RecordSale } from './RecordSale'
import { productService } from '../../services/productService'
import { settingsService } from '../../services/settingsService'
import type { Product, ShopSettings } from '../../types'

export default function SellerHome() {
  const [search, setSearch] = useState('')
  const [products, setProducts] = useState<Product[]>([])
  const [settings, setSettings] = useState<ShopSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [selected, setSelected] = useState<Product | null>(null)

  async function load() {
    setLoading(true)
    setLoadError('')
    try {
      const [prod, set] = await Promise.all([productService.list({ search, sort: 'name_asc' }), settingsService.get()])
      setProducts(prod)
      setSettings(set)
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'Unable to load products.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const t = setTimeout(load, 150)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search])

  return (
    <AppShell title="Find a product">
      <div className="space-y-4">
        <div className="relative">
          <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.35-4.35" strokeLinecap="round" />
          </svg>
          <input
            className="input !pl-10 !py-4 text-base"
            placeholder="Search product name, brand or SKU…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
          />
        </div>

        {loading ? (
          <PageLoading />
        ) : loadError ? (
          <div className="card">
            <EmptyState title="Unable to load products" hint={loadError} action={<button className="btn-primary" onClick={load}>Retry</button>} />
          </div>
        ) : products.length === 0 ? (
          <div className="card"><EmptyState title="No products found" hint="Try a different name, brand, or SKU." /></div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {products.map((p) => (
              <button
                key={p.id}
                disabled={p.quantity <= 0}
                onClick={() => setSelected(p)}
                className="card p-3 text-left hover:shadow-pop transition disabled:opacity-50 disabled:hover:shadow-card"
              >
                <div className="aspect-square rounded-lg bg-ink-100 overflow-hidden mb-2.5">
                  <ProductImage imageKey={p.imageUrl} alt="" className="w-full h-full object-cover" />
                </div>
                <p className="text-sm font-semibold text-ink-900 truncate">{p.name}</p>
                <p className="text-xs text-ink-400 truncate">{p.brand}</p>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-sm font-semibold text-ink-900">{p.sellingPrice.toLocaleString()} ETB</span>
                </div>
                <div className="mt-2"><StockBadge quantity={p.quantity} threshold={settings?.lowStockThreshold} /></div>
              </button>
            ))}
          </div>
        )}
      </div>

      <Modal open={!!selected} title="Record sale" onClose={() => setSelected(null)}>
        {selected && (
          <RecordSale
            product={selected}
            onDone={() => { setSelected(null); load() }}
            onCancel={() => setSelected(null)}
          />
        )}
      </Modal>
    </AppShell>
  )
}

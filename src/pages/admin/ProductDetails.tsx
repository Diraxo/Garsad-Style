import { useEffect, useState } from 'react'
import type { Category, InventoryMovement, Product, Sale } from '../../types'
import { StockBadge } from '../../components/common/StockBadge'
import { ProductImage } from '../../components/common/ProductImage'
import { inventoryService } from '../../services/inventoryService'
import { salesService } from '../../services/salesService'
import { PageLoading } from '../../components/common/Basics'

export function ProductDetails({
  product,
  category,
  onEdit,
}: {
  product: Product
  category?: Category
  onEdit: () => void
}) {
  const [movements, setMovements] = useState<InventoryMovement[]>([])
  const [sales, setSales] = useState<Sale[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  useEffect(() => {
    setLoading(true)
    setLoadError('')
    Promise.all([inventoryService.listMovements(product.id), salesService.list({ productId: product.id })])
      .then(([m, s]) => {
        setMovements(m)
        setSales(s)
      })
      .catch((e) => setLoadError(e instanceof Error ? e.message : 'Unable to load product history.'))
      .finally(() => setLoading(false))
  }, [product.id])

  const unitsSold = movements.filter((m) => m.type === 'SALE').reduce((sum, m) => sum + Math.abs(m.quantityChange), 0)

  return (
    <div className="space-y-5">
      <div className="flex gap-4">
        <div className="h-24 w-24 rounded-xl2 bg-ink-100 overflow-hidden shrink-0">
          <ProductImage imageKey={product.imageUrl} alt="" className="w-full h-full object-cover" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-display font-bold text-lg text-ink-900">{product.name}</h3>
              <p className="text-sm text-ink-500">{product.brand} · {category?.name ?? 'Uncategorized'}</p>
            </div>
            <StockBadge quantity={product.quantity} />
          </div>
          <p className="text-xs font-mono text-ink-400 mt-1">{product.sku}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
        <Field label="Size" value={product.size || '—'} />
        <Field label="Color" value={product.color || '—'} />
        <Field label="Purchase cost" value={`${product.purchaseCost.toLocaleString()} ETB`} />
        <Field label="Selling price" value={`${product.sellingPrice.toLocaleString()} ETB`} />
        <Field label="Current stock" value={product.quantity.toString()} />
        <Field label="Initial stock" value={product.initialQuantity.toString()} />
        <Field label="Units sold" value={unitsSold.toString()} />
        <Field label="Updated" value={new Date(product.updatedAt).toLocaleDateString()} />
      </div>

      {product.description && (
        <div>
          <p className="label mb-1">Notes</p>
          <p className="text-sm text-ink-600">{product.description}</p>
        </div>
      )}

      {loading ? (
        <PageLoading />
      ) : loadError ? (
        <p className="text-sm text-crit-600 bg-crit-100 rounded-lg px-3 py-2.5">{loadError}</p>
      ) : (
        <>
          <div>
            <p className="label mb-2">Inventory history</p>
            <div className="border border-ink-100 rounded-lg divide-y divide-ink-100 max-h-48 overflow-y-auto">
              {movements.length === 0 && <p className="text-sm text-ink-400 p-3">No movements yet.</p>}
              {movements.map((m) => (
                <div key={m.id} className="flex items-center justify-between px-3 py-2 text-sm">
                  <div>
                    <span className="font-medium text-ink-700">{movementLabel(m.type)}</span>
                    <span className="text-ink-400 ml-2 text-xs">{new Date(m.createdAt).toLocaleString()}</span>
                  </div>
                  <span className={`font-mono text-xs font-semibold ${m.quantityChange >= 0 ? 'text-ok-700' : 'text-crit-700'}`}>
                    {m.quantityChange >= 0 ? '+' : ''}{m.quantityChange} → {m.resultingStock}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="label mb-2">Sales history</p>
            <div className="border border-ink-100 rounded-lg divide-y divide-ink-100 max-h-48 overflow-y-auto">
              {sales.length === 0 && <p className="text-sm text-ink-400 p-3">No sales recorded yet.</p>}
              {sales.map((s) => (
                <div key={s.id} className="flex items-center justify-between px-3 py-2 text-sm">
                  <div>
                    <span className="text-ink-700">{s.sellerName}</span>
                    <span className="text-ink-400 ml-2 text-xs">{new Date(s.createdAt).toLocaleDateString()}</span>
                  </div>
                  <span className="font-mono text-xs text-ink-600">{s.totalAmount.toLocaleString()} ETB</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      <div className="flex justify-end pt-2 border-t border-ink-100">
        <button className="btn-primary" onClick={onEdit}>Edit product</button>
      </div>
    </div>
  )
}

function movementLabel(t: InventoryMovement['type']) {
  return { INITIAL_STOCK: 'Initial stock', SALE: 'Sale', RESTOCK: 'Restock', ADJUSTMENT: 'Adjustment' }[t]
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-ink-50 rounded-lg px-3 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-400">{label}</p>
      <p className="font-medium text-ink-800 mt-0.5">{value}</p>
    </div>
  )
}

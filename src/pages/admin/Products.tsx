import { useCallback, useEffect, useState } from 'react'
import { AppShell } from '../../components/layout/AppShell'
import { EmptyState, PageLoading } from '../../components/common/Basics'
import { StockBadge } from '../../components/common/StockBadge'
import { Modal } from '../../components/common/Modal'
import { ConfirmDialog } from '../../components/common/ConfirmDialog'
import { ProductForm, type ProductFormValues, type ImageIntent } from './ProductForm'
import { ProductDetails } from './ProductDetails'
import { productService, type ProductFilters } from '../../services/productService'
import { categoryService } from '../../services/categoryService'
import { settingsService } from '../../services/settingsService'
import { imageService } from '../../services/imageService'
import { useToast } from '../../context/ToastContext'
import { ProductImage } from '../../components/common/ProductImage'
import type { Category, Product, ShopSettings } from '../../types'

export default function Products() {
  const { show } = useToast()
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [settings, setSettings] = useState<ShopSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [view, setView] = useState<'grid' | 'list'>('grid')
  const [filters, setFilters] = useState<ProductFilters>({ search: '', categoryId: 'all', stock: 'all', sort: 'name_asc' })

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Product | null>(null)
  const [detailsProduct, setDetailsProduct] = useState<Product | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null)
  const [deleting, setDeleting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError('')
    try {
      const [prod, cats, set] = await Promise.all([productService.list(filters), categoryService.list(), settingsService.get()])
      setProducts(prod)
      setCategories(cats)
      setSettings(set)
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'Unable to load products.')
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => {
    load()
  }, [load])

  function openAdd() {
    setEditing(null)
    setFormOpen(true)
  }
  function openEdit(p: Product) {
    setEditing(p)
    setDetailsProduct(null)
    setFormOpen(true)
  }

  async function handleFormSubmit(values: ProductFormValues, image: ImageIntent) {
    const payload = {
      name: values.name.trim(),
      brand: values.brand.trim(),
      categoryId: values.categoryId,
      sku: values.sku.trim(),
      size: values.size.trim() || undefined,
      color: values.color.trim() || undefined,
      purchaseCost: Number(values.purchaseCost),
      sellingPrice: Number(values.sellingPrice),
      quantity: Number(values.quantity),
      description: values.description.trim() || undefined,
    }

    try {
      if (editing) {
        // Fields first, image second — so a field edit still saves even if
        // the image step below has a problem, and we always know the
        // product's real ID before touching R2.
        await productService.update(editing.id, payload)

        if (image.kind === 'upload') {
          try {
            const newKey = await imageService.upload(image.file, editing.id)
            await productService.update(editing.id, { imageUrl: newKey })
            if (editing.imageUrl) await imageService.remove(editing.imageUrl) // old image deleted LAST
          } catch (e) {
            show(e instanceof Error ? `Product saved, but the image failed: ${e.message}` : 'Product saved, but the image upload failed.', 'error')
          }
        } else if (image.kind === 'remove' && editing.imageUrl) {
          const oldKey = editing.imageUrl
          await productService.update(editing.id, { imageUrl: null })
          await imageService.remove(oldKey)
        }

        show('Product updated successfully.')
      } else {
        // Create the row first (no image yet) so a failed upload never
        // leaves an orphaned object with nothing pointing to it.
        const created = await productService.create(payload)

        if (image.kind === 'upload') {
          try {
            const key = await imageService.upload(image.file, created.id)
            await productService.update(created.id, { imageUrl: key })
          } catch (e) {
            show(e instanceof Error ? `Product created, but the image failed: ${e.message}` : 'Product created, but the image upload failed. You can add it by editing the product.', 'error')
          }
        }

        show('Product added successfully.')
      }
      setFormOpen(false)
      setEditing(null)
      await load()
    } catch (e) {
      show(e instanceof Error ? e.message : 'Something went wrong saving the product.', 'error')
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await productService.remove(deleteTarget.id)
      show('Product deleted.')
      setDeleteTarget(null)
      await load()
    } finally {
      setDeleting(false)
    }
  }

  const categoryMap = Object.fromEntries(categories.map((c) => [c.id, c]))

  return (
    <AppShell title="Products">
      <div className="space-y-4">
        <div className="card p-3 flex flex-wrap items-center gap-2">
          <input
            className="input flex-1 min-w-[180px]"
            placeholder="Search name, brand or SKU…"
            value={filters.search}
            onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
          />
          <select
            className="input w-auto"
            value={filters.categoryId}
            onChange={(e) => setFilters((f) => ({ ...f, categoryId: e.target.value }))}
          >
            <option value="all">All categories</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select
            className="input w-auto"
            value={filters.stock}
            onChange={(e) => setFilters((f) => ({ ...f, stock: e.target.value as ProductFilters['stock'] }))}
          >
            <option value="all">All stock</option>
            <option value="in_stock">In stock</option>
            <option value="low">Low</option>
            <option value="critical">Critical</option>
            <option value="sold_out">Sold out</option>
          </select>
          <select
            className="input w-auto"
            value={filters.sort}
            onChange={(e) => setFilters((f) => ({ ...f, sort: e.target.value as ProductFilters['sort'] }))}
          >
            <option value="name_asc">Name A–Z</option>
            <option value="name_desc">Name Z–A</option>
            <option value="price_asc">Price low–high</option>
            <option value="price_desc">Price high–low</option>
            <option value="stock_asc">Stock low–high</option>
            <option value="stock_desc">Stock high–low</option>
          </select>
          <div className="flex rounded-lg border border-ink-200 p-0.5 ml-auto">
            <button
              className={`px-2.5 py-1.5 rounded-md ${view === 'grid' ? 'bg-ink-100' : ''}`}
              onClick={() => setView('grid')}
              aria-label="Grid view"
            >
              <GridIcon />
            </button>
            <button
              className={`px-2.5 py-1.5 rounded-md ${view === 'list' ? 'bg-ink-100' : ''}`}
              onClick={() => setView('list')}
              aria-label="List view"
            >
              <ListIcon />
            </button>
          </div>
          <button className="btn-primary" onClick={openAdd}>+ Add product</button>
        </div>

        {loading ? (
          <PageLoading />
        ) : loadError ? (
          <div className="card">
            <EmptyState title="Unable to load products" hint={loadError} action={<button className="btn-primary" onClick={load}>Retry</button>} />
          </div>
        ) : products.length === 0 ? (
          <div className="card">
            <EmptyState
              title="No products found"
              hint="Try a different search or filter, or add your first product."
              action={<button className="btn-primary" onClick={openAdd}>+ Add product</button>}
            />
          </div>
        ) : view === 'grid' ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {products.map((p) => (
              <button key={p.id} onClick={() => setDetailsProduct(p)} className="card p-3 text-left hover:shadow-pop transition">
                <div className="aspect-square rounded-lg bg-ink-100 overflow-hidden mb-2.5">
                  <ProductImage imageKey={p.imageUrl} alt="" className="w-full h-full object-cover" />
                </div>
                <p className="text-sm font-semibold text-ink-900 truncate">{p.name}</p>
                <p className="text-xs text-ink-400 truncate">{p.brand} · {categoryMap[p.categoryId]?.name}</p>
                <p className="text-xs font-mono text-ink-400 mt-0.5">{p.sku}</p>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-sm font-semibold text-ink-900">{p.sellingPrice.toLocaleString()} ETB</span>
                </div>
                <div className="mt-2"><StockBadge quantity={p.quantity} threshold={settings?.lowStockThreshold} /></div>
              </button>
            ))}
          </div>
        ) : (
          <div className="card overflow-x-auto">
            <table className="w-full text-sm min-w-[720px]">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-ink-400 border-b border-ink-100">
                  <th className="px-4 py-3 font-semibold">Product</th>
                  <th className="px-4 py-3 font-semibold">Category</th>
                  <th className="px-4 py-3 font-semibold">SKU</th>
                  <th className="px-4 py-3 font-semibold">Cost</th>
                  <th className="px-4 py-3 font-semibold">Price</th>
                  <th className="px-4 py-3 font-semibold">Stock</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {products.map((p) => (
                  <tr key={p.id} className="hover:bg-ink-50 cursor-pointer" onClick={() => setDetailsProduct(p)}>
                    <td className="px-4 py-3 font-medium text-ink-800">{p.name}<span className="block text-xs text-ink-400 font-normal">{p.brand}</span></td>
                    <td className="px-4 py-3 text-ink-600">{categoryMap[p.categoryId]?.name}</td>
                    <td className="px-4 py-3 font-mono text-ink-500">{p.sku}</td>
                    <td className="px-4 py-3 text-ink-600">{p.purchaseCost.toLocaleString()}</td>
                    <td className="px-4 py-3 font-semibold text-ink-800">{p.sellingPrice.toLocaleString()}</td>
                    <td className="px-4 py-3"><StockBadge quantity={p.quantity} threshold={settings?.lowStockThreshold} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal open={formOpen} title={editing ? 'Edit product' : 'Add product'} onClose={() => setFormOpen(false)} wide>
        <ProductForm
          categories={categories}
          initial={editing ?? undefined}
          submitLabel={editing ? 'Save changes' : 'Add product'}
          onSubmit={handleFormSubmit}
          onCancel={() => setFormOpen(false)}
        />
      </Modal>

      <Modal open={!!detailsProduct} title="Product details" onClose={() => setDetailsProduct(null)} wide>
        {detailsProduct && (
          <>
            <ProductDetails product={detailsProduct} category={categoryMap[detailsProduct.categoryId]} onEdit={() => openEdit(detailsProduct)} />
            <button
              className="text-xs font-semibold text-crit-600 hover:text-crit-700 mt-4"
              onClick={() => { setDeleteTarget(detailsProduct); setDetailsProduct(null) }}
            >
              Delete this product
            </button>
          </>
        )}
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete product?"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? This cannot be undone.`}
        confirmLabel="Delete"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </AppShell>
  )
}

function GridIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  )
}
function ListIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" strokeLinecap="round" />
    </svg>
  )
}

import { useCallback, useEffect, useState } from 'react'
import { AppShell } from '../../components/layout/AppShell'
import { EmptyState, PageLoading } from '../../components/common/Basics'
import { salesService, type SaleFilters } from '../../services/salesService'
import { sellerService } from '../../services/sellerService'
import { paymentMethodService } from '../../services/paymentMethodService'
import { categoryService } from '../../services/categoryService'
import type { Category, PaymentMethod, Sale, User } from '../../types'

export default function Sales() {
  const [sales, setSales] = useState<Sale[]>([])
  const [sellers, setSellers] = useState<User[]>([])
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [filters, setFilters] = useState<SaleFilters>({ date: 'all', sellerId: 'all', paymentMethodId: 'all', categoryId: 'all' })

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError('')
    try {
      const [s, sel, pm, cats] = await Promise.all([
        salesService.list(filters),
        sellerService.list(),
        paymentMethodService.list(),
        categoryService.list(),
      ])
      setSales(s)
      setSellers(sel)
      setPaymentMethods(pm)
      setCategories(cats)
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'Unable to load sales.')
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => { load() }, [load])

  const totalRevenue = sales.reduce((sum, s) => sum + s.totalAmount, 0)
  const totalProfit = sales.reduce((sum, s) => sum + s.totalProfit, 0)

  return (
    <AppShell title="Sales">
      <div className="space-y-4">
        <div className="card p-3 flex flex-wrap items-center gap-2">
          <select className="input w-auto" value={filters.date} onChange={(e) => setFilters((f) => ({ ...f, date: e.target.value as SaleFilters['date'] }))}>
            <option value="all">All time</option>
            <option value="today">Today</option>
            <option value="yesterday">Yesterday</option>
            <option value="week">This week</option>
            <option value="month">This month</option>
          </select>
          <select className="input w-auto" value={filters.sellerId} onChange={(e) => setFilters((f) => ({ ...f, sellerId: e.target.value }))}>
            <option value="all">All sellers</option>
            {sellers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <select className="input w-auto" value={filters.paymentMethodId} onChange={(e) => setFilters((f) => ({ ...f, paymentMethodId: e.target.value }))}>
            <option value="all">All payment methods</option>
            {paymentMethods.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <select className="input w-auto" value={filters.categoryId} onChange={(e) => setFilters((f) => ({ ...f, categoryId: e.target.value }))}>
            <option value="all">All categories</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        {!loading && sales.length > 0 && (
          <div className="grid grid-cols-3 gap-3">
            <div className="card p-4"><p className="text-xs font-semibold uppercase text-ink-500">Sales</p><p className="font-display text-xl font-bold mt-1">{sales.length}</p></div>
            <div className="card p-4"><p className="text-xs font-semibold uppercase text-ink-500">Revenue</p><p className="font-display text-xl font-bold mt-1 text-ok-700">{totalRevenue.toLocaleString()} ETB</p></div>
            <div className="card p-4"><p className="text-xs font-semibold uppercase text-ink-500">Profit</p><p className="font-display text-xl font-bold mt-1 text-ok-700">{totalProfit.toLocaleString()} ETB</p></div>
          </div>
        )}

        {loading ? (
          <PageLoading />
        ) : loadError ? (
          <div className="card">
            <EmptyState title="Unable to load sales" hint={loadError} action={<button className="btn-primary" onClick={load}>Retry</button>} />
          </div>
        ) : sales.length === 0 ? (
          <div className="card"><EmptyState title="No sales yet" hint="Sales recorded by sellers will show up here." /></div>
        ) : (
          <div className="card overflow-x-auto">
            <table className="w-full text-sm min-w-[820px]">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-ink-400 border-b border-ink-100">
                  <th className="px-4 py-3 font-semibold">Product</th>
                  <th className="px-4 py-3 font-semibold">Qty</th>
                  <th className="px-4 py-3 font-semibold">Original</th>
                  <th className="px-4 py-3 font-semibold">Sale price</th>
                  <th className="px-4 py-3 font-semibold">Total</th>
                  <th className="px-4 py-3 font-semibold">Payment</th>
                  <th className="px-4 py-3 font-semibold">Seller</th>
                  <th className="px-4 py-3 font-semibold">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {sales.flatMap((s) => s.items.map((item) => (
                  <tr key={item.id} className="hover:bg-ink-50">
                    <td className="px-4 py-3 font-medium text-ink-800">{item.productName}<span className="block text-xs text-ink-400 font-mono font-normal">{item.sku}</span></td>
                    <td className="px-4 py-3 text-ink-600">{item.quantity}</td>
                    <td className="px-4 py-3 text-ink-400">{item.originalPrice.toLocaleString()}</td>
                    <td className="px-4 py-3 text-ink-700 font-medium">{item.actualPrice.toLocaleString()}</td>
                    <td className="px-4 py-3 font-semibold text-ink-900">{(item.actualPrice * item.quantity).toLocaleString()}</td>
                    <td className="px-4 py-3"><span className="tag bg-ink-100 text-ink-600">{s.paymentMethodName}</span></td>
                    <td className="px-4 py-3 text-ink-600">{s.sellerName}</td>
                    <td className="px-4 py-3 text-ink-400 text-xs">{new Date(s.createdAt).toLocaleString()}</td>
                  </tr>
                )))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppShell>
  )
}

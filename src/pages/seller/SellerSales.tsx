import { useEffect, useState } from 'react'
import { AppShell } from '../../components/layout/AppShell'
import { EmptyState, PageLoading } from '../../components/common/Basics'
import { salesService } from '../../services/salesService'
import { useAuth } from '../../context/AuthContext'
import type { Sale } from '../../types'

export default function SellerSales() {
  const { user } = useAuth()
  const [sales, setSales] = useState<Sale[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  function load() {
    if (!user) return
    setLoading(true)
    setLoadError('')
    salesService
      .list({ sellerOnly: user.id })
      .then(setSales)
      .catch((e) => setLoadError(e instanceof Error ? e.message : 'Unable to load your sales.'))
      .finally(() => setLoading(false))
  }

  useEffect(load, [user])

  const totalToday = sales
    .filter((s) => new Date(s.createdAt).toDateString() === new Date().toDateString())
    .reduce((sum, s) => sum + s.totalAmount, 0)

  return (
    <AppShell title="My Sales">
      <div className="space-y-4">
        <div className="card p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase text-ink-500">Today's total</p>
            <p className="font-display text-2xl font-bold text-ink-900 mt-1">{totalToday.toLocaleString()} ETB</p>
          </div>
          <div className="text-right">
            <p className="text-xs font-semibold uppercase text-ink-500">Total sales</p>
            <p className="font-display text-2xl font-bold text-ink-900 mt-1">{sales.length}</p>
          </div>
        </div>

        {loading ? (
          <PageLoading />
        ) : loadError ? (
          <div className="card">
            <EmptyState title="Unable to load your sales" hint={loadError} action={<button className="btn-primary" onClick={load}>Retry</button>} />
          </div>
        ) : sales.length === 0 ? (
          <div className="card"><EmptyState title="No sales yet" hint="Sales you record will show up here." /></div>
        ) : (
          <div className="space-y-2.5">
            {sales.map((s) => (
              <div key={s.id} className="card p-3.5">
                {s.items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between">
                    <div className="min-w-0">
                      <p className="font-medium text-ink-800 truncate">{item.productName} <span className="text-ink-400 font-normal">× {item.quantity}</span></p>
                      <p className="text-xs text-ink-400 mt-0.5">{new Date(s.createdAt).toLocaleString()}</p>
                    </div>
                    <div className="text-right shrink-0 ml-3">
                      <p className="font-semibold text-ink-900">{(item.actualPrice * item.quantity).toLocaleString()} ETB</p>
                      <span className="tag bg-ink-100 text-ink-600 mt-1">{s.paymentMethodName}</span>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  )
}

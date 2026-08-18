import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { AppShell } from '../../components/layout/AppShell'
import { StatCard, PageLoading, EmptyState } from '../../components/common/Basics'
import { StockBadge } from '../../components/common/StockBadge'
import { ProductImage } from '../../components/common/ProductImage'
import { salesService } from '../../services/salesService'
import { productService } from '../../services/productService'
import { settingsService } from '../../services/settingsService'
import type { Product, ShopSettings } from '../../types'

type Range = 'today' | 'week' | 'month'

export default function Dashboard() {
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [stats, setStats] = useState<Awaited<ReturnType<typeof salesService.dashboardStats>> | null>(null)
  const [series, setSeries] = useState<Awaited<ReturnType<typeof salesService.salesSeries>>>([])
  const [lowStock, setLowStock] = useState<Product[]>([])
  const [settings, setSettings] = useState<ShopSettings | null>(null)
  const [range, setRange] = useState<Range>('week')

  useEffect(() => {
    load()
  }, [])

  useEffect(() => {
    salesService.salesSeries(range).then(setSeries).catch(() => {})
  }, [range])

  async function load() {
    setLoading(true)
    setLoadError('')
    try {
      const [s, prod, set] = await Promise.all([
        salesService.dashboardStats(),
        productService.list({ sort: 'stock_asc' }),
        settingsService.get(),
      ])
      setStats(s)
      setSettings(set)
      setLowStock(prod.filter((p) => p.quantity <= set.lowStockThreshold).slice(0, 6))
      setSeries(await salesService.salesSeries(range))
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'Unable to load the dashboard.')
    } finally {
      setLoading(false)
    }
  }

  const currency = settings?.currency ?? 'ETB'
  const fmt = (n: number) => `${n.toLocaleString()} ${currency}`

  return (
    <AppShell title="Dashboard">
      {loading || !stats ? (
        <PageLoading />
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard label="Total Products" value={stats.totalProducts.toString()} />
            <StatCard label="Inventory Units" value={stats.totalInventoryUnits.toString()} />
            <StatCard label="Today's Sales" value={stats.todaySalesCount.toString()} sub={`${stats.todayUnitsSold} units sold`} />
            <StatCard label="Today's Revenue" value={fmt(stats.todayRevenue)} tone="ok" />
            <StatCard label="Today's Profit" value={fmt(stats.todayProfit)} tone="ok" />
            <StatCard label="Low Stock" value={stats.lowStockCount.toString()} tone={stats.lowStockCount > 0 ? 'warn' : 'default'} />
            <StatCard label="Sold Out" value={stats.soldOutCount.toString()} tone={stats.soldOutCount > 0 ? 'crit' : 'default'} />
          </div>

          <div className="card p-4 md:p-5">
            <div className="flex items-center justify-between flex-wrap gap-3 mb-2">
              <h2 className="font-display font-semibold text-ink-900">Sales overview</h2>
              <div className="flex rounded-lg border border-ink-200 p-0.5 bg-ink-50">
                {(['today', 'week', 'month'] as Range[]).map((r) => (
                  <button
                    key={r}
                    onClick={() => setRange(r)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-md capitalize transition ${
                      range === r ? 'bg-white shadow-sm text-brand-700' : 'text-ink-500'
                    }`}
                  >
                    {r === 'today' ? 'Today' : r === 'week' ? 'This Week' : 'This Month'}
                  </button>
                ))}
              </div>
            </div>
            <div className="h-64 -ml-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={series} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#1E5AE0" stopOpacity={0.25} />
                      <stop offset="100%" stopColor="#1E5AE0" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#EEF1F6" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#8791AA' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#8791AA' }} axisLine={false} tickLine={false} width={40} />
                  <Tooltip
                    formatter={(value: number, name: string) => [
                      name === 'units' ? value : fmt(value),
                      name === 'revenue' ? 'Revenue' : name === 'profit' ? 'Profit' : 'Units',
                    ]}
                    contentStyle={{ borderRadius: 10, border: '1px solid #EEF1F6', fontSize: 12 }}
                  />
                  <Area type="monotone" dataKey="revenue" stroke="#1E5AE0" strokeWidth={2} fill="url(#rev)" name="revenue" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="card p-4 md:p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display font-semibold text-ink-900">Low stock &amp; sold out</h2>
              <Link to="/inventory" className="text-sm font-semibold text-brand-600 hover:text-brand-700">
                View inventory →
              </Link>
            </div>
            {lowStock.length === 0 ? (
              <EmptyState title="No low-stock products" hint="Everything is well stocked right now." />
            ) : (
              <div className="divide-y divide-ink-100">
                {lowStock.map((p) => (
                  <div key={p.id} className="flex items-center justify-between py-2.5 gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-9 w-9 rounded-lg bg-ink-100 overflow-hidden shrink-0">
                        <ProductImage imageKey={p.imageUrl} alt="" className="w-full h-full object-cover" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-ink-800 truncate">{p.name}</p>
                        <p className="text-xs text-ink-400 font-mono">{p.sku}</p>
                      </div>
                    </div>
                    <StockBadge quantity={p.quantity} threshold={settings?.lowStockThreshold} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </AppShell>
  )
}

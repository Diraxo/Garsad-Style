import { useEffect, useState } from 'react'
import { AppShell } from '../../components/layout/AppShell'
import { EmptyState, PageLoading } from '../../components/common/Basics'
import { sellerService } from '../../services/sellerService'
import { useToast } from '../../context/ToastContext'
import type { User } from '../../types'

interface Row extends User {
  sales: number
  lastActivity: string | null
}

export default function Sellers() {
  const { show } = useToast()
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function load() {
    setLoading(true)
    setError('')
    try {
      const sellers = await sellerService.list()
      const enriched = await Promise.all(
        sellers.map(async (s) => ({
          ...s,
          sales: await sellerService.salesCount(s.id),
          lastActivity: await sellerService.lastActivity(s.id),
        }))
      )
      setRows(enriched)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to load sellers.')
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [])

  async function toggleStatus(row: Row) {
    try {
      await sellerService.setStatus(row.id, row.status === 'active' ? 'disabled' : 'active')
      show(row.status === 'active' ? 'Seller disabled.' : 'Seller enabled.')
      await load()
    } catch {
      show('Unable to update this seller. Please try again.', 'error')
    }
  }

  return (
    <AppShell title="Sellers">
      <div className="space-y-4">
        <div className="card p-4 flex items-start gap-3 bg-brand-50 border-brand-100">
          <div className="h-8 w-8 rounded-lg bg-brand-100 text-brand-700 flex items-center justify-center shrink-0 font-display font-bold text-sm">i</div>
          <div className="text-sm text-ink-700">
            <p className="font-semibold text-ink-900">To add a new seller</p>
            <p className="mt-0.5 text-ink-600">
              Create their account in <strong>Supabase Dashboard → Authentication → Users → Add user</strong>.
              A seller profile is created automatically the first time they log in, and they'll appear in the
              list below. This keeps password handling entirely inside Supabase Auth.
            </p>
          </div>
        </div>

        {loading ? (
          <PageLoading />
        ) : error ? (
          <div className="card"><EmptyState title="Unable to load sellers" hint={error} /></div>
        ) : rows.length === 0 ? (
          <div className="card"><EmptyState title="No sellers yet" hint="Add one from the Supabase Dashboard and they'll show up here." /></div>
        ) : (
          <div className="card overflow-x-auto">
            <table className="w-full text-sm min-w-[640px]">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-ink-400 border-b border-ink-100">
                  <th className="px-4 py-3 font-semibold">Seller</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Sales</th>
                  <th className="px-4 py-3 font-semibold">Last activity</th>
                  <th className="px-4 py-3 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {rows.map((r) => (
                  <tr key={r.id} className="hover:bg-ink-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-ink-800">{r.name}</p>
                      <p className="text-xs text-ink-400">{r.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`tag ${r.status === 'active' ? 'bg-ok-100 text-ok-700' : 'bg-ink-100 text-ink-500'}`}>
                        {r.status === 'active' ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-ink-600">{r.sales}</td>
                    <td className="px-4 py-3 text-ink-400 text-xs">{r.lastActivity ? new Date(r.lastActivity).toLocaleString() : '—'}</td>
                    <td className="px-4 py-3 text-right">
                      <button className="btn-ghost !px-2.5 !py-1.5 !text-xs" onClick={() => toggleStatus(r)}>
                        {r.status === 'active' ? 'Disable' : 'Enable'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppShell>
  )
}

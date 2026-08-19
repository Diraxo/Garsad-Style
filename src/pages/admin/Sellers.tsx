import { useEffect, useState } from 'react'
import { AppShell } from '../../components/layout/AppShell'
import { EmptyState, PageLoading } from '../../components/common/Basics'
import { Modal } from '../../components/common/Modal'
import { ConfirmDialog } from '../../components/common/ConfirmDialog'
import { SellerForm, type SellerFormValues, type ServerFieldError } from './SellerForm'
import { sellerService, type SellerRow } from '../../services/sellerService'
import { useToast } from '../../context/ToastContext'
import { formatRelativeTime } from '../../lib/format'

interface Row extends SellerRow {
  sales: number
}

export default function Sellers() {
  const { show } = useToast()
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [formOpen, setFormOpen] = useState(false)
  const [serverError, setServerError] = useState<ServerFieldError | null>(null)
  const [disableTarget, setDisableTarget] = useState<Row | null>(null)
  const [disabling, setDisabling] = useState(false)

  async function load() {
    setLoading(true)
    setError('')
    try {
      const sellers = await sellerService.list()
      const enriched = await Promise.all(
        sellers.map(async (s) => ({ ...s, sales: await sellerService.salesCount(s.id) }))
      )
      setRows(enriched)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to load sellers.')
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [])

  function openAdd() {
    setServerError(null)
    setFormOpen(true)
  }

  async function handleCreate(values: SellerFormValues) {
    setServerError(null)
    try {
      await sellerService.create({ name: values.name.trim(), email: values.email.trim(), password: values.password })
      show('Seller account created successfully.')
      setFormOpen(false)
      await load()
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Unable to create seller. Please try again.'
      if (message.toLowerCase().includes('already registered')) {
        setServerError({ field: 'email', message })
      } else {
        show(message, 'error')
      }
    }
  }

  async function handleEnable(row: Row) {
    try {
      await sellerService.setStatus(row.id, 'active')
      show('Seller account enabled.')
      await load()
    } catch {
      show('Unable to update this seller. Please try again.', 'error')
    }
  }

  async function handleDisable() {
    if (!disableTarget) return
    setDisabling(true)
    try {
      await sellerService.setStatus(disableTarget.id, 'disabled')
      show('Seller disabled.')
      setDisableTarget(null)
      await load()
    } catch {
      show('Unable to update this seller. Please try again.', 'error')
    } finally {
      setDisabling(false)
    }
  }

  return (
    <AppShell title="Sellers">
      <div className="space-y-4">
        <div className="flex justify-end">
          <button className="btn-primary" onClick={openAdd}>+ Add Seller</button>
        </div>

        {loading ? (
          <PageLoading />
        ) : error ? (
          <div className="card"><EmptyState title="Unable to load sellers" hint={error} /></div>
        ) : rows.length === 0 ? (
          <div className="card">
            <EmptyState
              title="No sellers yet"
              hint="Add your first seller to get started."
              action={<button className="btn-primary" onClick={openAdd}>+ Add Seller</button>}
            />
          </div>
        ) : (
          <div className="card overflow-x-auto">
            <table className="w-full text-sm min-w-[720px]">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-ink-400 border-b border-ink-100">
                  <th className="px-4 py-3 font-semibold">Seller</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Sales</th>
                  <th className="px-4 py-3 font-semibold">Last active</th>
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
                        {r.status === 'active' ? 'ACTIVE' : 'DISABLED'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-ink-600">{r.sales}</td>
                    <td className="px-4 py-3 text-ink-400 text-xs">{r.lastSignInAt ? formatRelativeTime(r.lastSignInAt) : 'Never'}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        className="btn-ghost !px-2.5 !py-1.5 !text-xs"
                        onClick={() => (r.status === 'active' ? setDisableTarget(r) : handleEnable(r))}
                      >
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

      <Modal open={formOpen} title="Add seller" onClose={() => setFormOpen(false)}>
        <SellerForm
          submitLabel="Add seller"
          serverError={serverError}
          onSubmit={handleCreate}
          onDismissServerError={() => setServerError(null)}
          onCancel={() => setFormOpen(false)}
        />
      </Modal>

      <ConfirmDialog
        open={!!disableTarget}
        title="Disable this seller?"
        message={`${disableTarget?.name} will no longer be able to sign in or access the shop system. Their sales history and profile will be kept, and you can re-enable them at any time.`}
        confirmLabel="Disable"
        loading={disabling}
        onConfirm={handleDisable}
        onCancel={() => setDisableTarget(null)}
      />
    </AppShell>
  )
}

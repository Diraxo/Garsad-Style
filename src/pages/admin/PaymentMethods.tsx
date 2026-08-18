import { useEffect, useState } from 'react'
import { AppShell } from '../../components/layout/AppShell'
import { EmptyState, PageLoading, Spinner } from '../../components/common/Basics'
import { Modal } from '../../components/common/Modal'
import { paymentMethodService } from '../../services/paymentMethodService'
import { useToast } from '../../context/ToastContext'
import type { PaymentMethod } from '../../types'

export default function PaymentMethods() {
  const { show } = useToast()
  const [methods, setMethods] = useState<PaymentMethod[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<PaymentMethod | null>(null)
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function load() {
    setLoading(true)
    setLoadError('')
    try {
      setMethods(await paymentMethodService.list())
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'Unable to load payment methods.')
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [])

  function openAdd() { setEditing(null); setName(''); setError(''); setFormOpen(true) }
  function openEdit(pm: PaymentMethod) { setEditing(pm); setName(pm.name); setError(''); setFormOpen(true) }

  async function handleSave() {
    if (!name.trim()) { setError('Name is required.'); return }
    setSaving(true)
    try {
      if (editing) {
        await paymentMethodService.rename(editing.id, name)
        show('Payment method updated.')
      } else {
        await paymentMethodService.create(name)
        show('Payment method added.')
      }
      setFormOpen(false)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to save payment method.')
    } finally {
      setSaving(false)
    }
  }

  async function handleToggle(pm: PaymentMethod) {
    try {
      await paymentMethodService.toggleActive(pm.id)
      show(pm.active ? 'Payment method disabled.' : 'Payment method enabled.')
      await load()
    } catch {
      show('Unable to update payment method.', 'error')
    }
  }

  async function handleDelete(pm: PaymentMethod) {
    try {
      await paymentMethodService.remove(pm.id)
      show('Payment method deleted.')
      await load()
    } catch {
      show('Unable to delete payment method.', 'error')
    }
  }

  return (
    <AppShell title="Payment Methods">
      <div className="space-y-4">
        <div className="flex justify-end">
          <button className="btn-primary" onClick={openAdd}>+ Add payment method</button>
        </div>

        {loading ? (
          <PageLoading />
        ) : loadError ? (
          <div className="card">
            <EmptyState title="Unable to load payment methods" hint={loadError} action={<button className="btn-primary" onClick={load}>Retry</button>} />
          </div>
        ) : methods.length === 0 ? (
          <div className="card"><EmptyState title="No payment methods configured" action={<button className="btn-primary" onClick={openAdd}>+ Add payment method</button>} /></div>
        ) : (
          <div className="card divide-y divide-ink-100">
            {methods.map((pm) => (
              <div key={pm.id} className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className={`h-2 w-2 rounded-full ${pm.active ? 'bg-ok-600' : 'bg-ink-300'}`} />
                  <span className="font-medium text-ink-800">{pm.name}</span>
                  {!pm.active && <span className="tag bg-ink-100 text-ink-500">Disabled</span>}
                </div>
                <div className="flex gap-1.5">
                  <button className="btn-ghost !px-2.5 !py-1.5 !text-xs" onClick={() => openEdit(pm)}>Rename</button>
                  <button className="btn-ghost !px-2.5 !py-1.5 !text-xs" onClick={() => handleToggle(pm)}>{pm.active ? 'Disable' : 'Enable'}</button>
                  <button className="btn-ghost !px-2.5 !py-1.5 !text-xs !text-crit-600" onClick={() => handleDelete(pm)}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal open={formOpen} title={editing ? 'Rename payment method' : 'Add payment method'} onClose={() => setFormOpen(false)}>
        <div className="space-y-4">
          <div>
            <label className="label">Name</label>
            <input className="input" value={name} onChange={(e) => { setName(e.target.value); setError('') }} placeholder="e.g. Telebirr" autoFocus />
            {error && <p className="text-xs text-crit-600 mt-1">{error}</p>}
          </div>
          <div className="flex justify-end gap-2">
            <button className="btn-secondary" onClick={() => setFormOpen(false)} disabled={saving}>Cancel</button>
            <button className="btn-primary" onClick={handleSave} disabled={saving}>{saving ? <Spinner /> : 'Save'}</button>
          </div>
        </div>
      </Modal>
    </AppShell>
  )
}

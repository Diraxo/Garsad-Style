import { useEffect, useState } from 'react'
import { AppShell } from '../../components/layout/AppShell'
import { EmptyState, PageLoading, Spinner } from '../../components/common/Basics'
import { Modal } from '../../components/common/Modal'
import { ConfirmDialog } from '../../components/common/ConfirmDialog'
import { categoryService } from '../../services/categoryService'
import { useToast } from '../../context/ToastContext'
import type { Category } from '../../types'

export default function Categories() {
  const { show } = useToast()
  const [categories, setCategories] = useState<Category[]>([])
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Category | null>(null)
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null)
  const [deleteError, setDeleteError] = useState('')
  const [deleting, setDeleting] = useState(false)

  async function load() {
    setLoading(true)
    setLoadError('')
    try {
      const cats = await categoryService.list()
      setCategories(cats)
      const entries = await Promise.all(cats.map(async (c) => [c.id, await categoryService.productCount(c.id)] as const))
      setCounts(Object.fromEntries(entries))
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'Unable to load categories.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  function openAdd() {
    setEditing(null)
    setName('')
    setError('')
    setFormOpen(true)
  }
  function openEdit(c: Category) {
    setEditing(c)
    setName(c.name)
    setError('')
    setFormOpen(true)
  }

  async function handleSave() {
    if (!name.trim()) { setError('Category name is required.'); return }
    setSaving(true)
    try {
      if (editing) {
        await categoryService.update(editing.id, name)
        show('Category updated.')
      } else {
        await categoryService.create(name)
        show('Category created.')
      }
      setFormOpen(false)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to save category.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    setDeleteError('')
    const result = await categoryService.remove(deleteTarget.id)
    setDeleting(false)
    if (!result.ok) {
      setDeleteError(result.reason ?? 'Could not delete this category.')
      return
    }
    show('Category deleted.')
    setDeleteTarget(null)
    await load()
  }

  return (
    <AppShell title="Categories">
      <div className="space-y-4">
        <div className="flex justify-end">
          <button className="btn-primary" onClick={openAdd}>+ Add category</button>
        </div>

        {loading ? (
          <PageLoading />
        ) : loadError ? (
          <div className="card">
            <EmptyState title="Unable to load categories" hint={loadError} action={<button className="btn-primary" onClick={load}>Retry</button>} />
          </div>
        ) : categories.length === 0 ? (
          <div className="card"><EmptyState title="No categories created" action={<button className="btn-primary" onClick={openAdd}>+ Add category</button>} /></div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {categories.map((c) => (
              <div key={c.id} className="card p-4 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-ink-900">{c.name}</p>
                  <p className="text-xs text-ink-400 mt-0.5">{counts[c.id] ?? 0} products</p>
                </div>
                <div className="flex gap-1.5">
                  <button className="btn-ghost !px-2.5 !py-1.5 !text-xs" onClick={() => openEdit(c)}>Edit</button>
                  <button className="btn-ghost !px-2.5 !py-1.5 !text-xs !text-crit-600" onClick={() => { setDeleteTarget(c); setDeleteError('') }}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal open={formOpen} title={editing ? 'Edit category' : 'Add category'} onClose={() => setFormOpen(false)}>
        <div className="space-y-4">
          <div>
            <label className="label">Category name</label>
            <input className="input" value={name} onChange={(e) => { setName(e.target.value); setError('') }} placeholder="e.g. Shoes" autoFocus />
            {error && <p className="text-xs text-crit-600 mt-1">{error}</p>}
          </div>
          <div className="flex justify-end gap-2">
            <button className="btn-secondary" onClick={() => setFormOpen(false)} disabled={saving}>Cancel</button>
            <button className="btn-primary" onClick={handleSave} disabled={saving}>{saving ? <Spinner /> : 'Save'}</button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete category?"
        message={deleteError || `Are you sure you want to delete "${deleteTarget?.name}"?`}
        confirmLabel="Delete"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </AppShell>
  )
}

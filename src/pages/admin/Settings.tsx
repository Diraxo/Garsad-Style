import { useEffect, useState } from 'react'
import { AppShell } from '../../components/layout/AppShell'
import { PageLoading, Spinner, EmptyState } from '../../components/common/Basics'
import { settingsService } from '../../services/settingsService'
import { useToast } from '../../context/ToastContext'
import type { ShopSettings } from '../../types'

export default function Settings() {
  const { show } = useToast()
  const [settings, setSettings] = useState<ShopSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    settingsService.get()
      .then((s) => setSettings(s))
      .catch((e) => setError(e instanceof Error ? e.message : 'Unable to load settings.'))
      .finally(() => setLoading(false))
  }, [])

  function update<K extends keyof ShopSettings>(key: K, value: ShopSettings[K]) {
    setSettings((s) => (s ? { ...s, [key]: value } : s))
  }

  async function handleSave() {
    if (!settings) return
    setSaving(true)
    try {
      await settingsService.update(settings)
      show('Settings saved successfully.')
    } catch (e) {
      show(e instanceof Error ? e.message : 'Unable to save settings.', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <AppShell title="Settings">
      {loading ? (
        <PageLoading />
      ) : error || !settings ? (
        <div className="card"><EmptyState title="Unable to load settings" hint={error} /></div>
      ) : (
        <div className="space-y-5 max-w-2xl">
          <section className="card p-5">
            <h2 className="font-display font-semibold text-ink-900 mb-4">Shop information</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Shop name</label>
                <input className="input" value={settings.shopName} onChange={(e) => update('shopName', e.target.value)} />
              </div>
              <div>
                <label className="label">Logo initial</label>
                <input className="input" maxLength={2} value={settings.logoInitial} onChange={(e) => update('logoInitial', e.target.value.toUpperCase())} />
              </div>
              <div>
                <label className="label">Phone</label>
                <input className="input" value={settings.phone} onChange={(e) => update('phone', e.target.value)} />
              </div>
              <div>
                <label className="label">Currency</label>
                <input className="input" value={settings.currency} onChange={(e) => update('currency', e.target.value.toUpperCase())} />
              </div>
              <div className="sm:col-span-2">
                <label className="label">Address</label>
                <input className="input" value={settings.address} onChange={(e) => update('address', e.target.value)} />
              </div>
            </div>
          </section>

          <section className="card p-5">
            <h2 className="font-display font-semibold text-ink-900 mb-4">Inventory</h2>
            <div className="max-w-xs">
              <label className="label">Low stock threshold</label>
              <input
                className="input"
                inputMode="numeric"
                value={settings.lowStockThreshold}
                onChange={(e) => update('lowStockThreshold', Number(e.target.value.replace(/\D/g, '')) || 0)}
              />
              <p className="text-xs text-ink-400 mt-1.5">Products at or below this quantity are flagged as low stock.</p>
            </div>
          </section>

          <section className="card p-5">
            <h2 className="font-display font-semibold text-ink-900 mb-1">Security</h2>
            <p className="text-sm text-ink-500 mb-4">
              Passwords and sessions are managed by Supabase Auth. These controls are placeholders for now.
            </p>
            <div className="space-y-2.5">
              {['Change password', 'Admin PIN', 'Session settings', 'Two-factor authentication'].map((label) => (
                <div key={label} className="flex items-center justify-between bg-ink-50 rounded-lg px-3.5 py-2.5">
                  <span className="text-sm text-ink-600">{label}</span>
                  <span className="tag bg-ink-100 text-ink-400">Coming soon</span>
                </div>
              ))}
            </div>
          </section>

          <div className="flex justify-end">
            <button className="btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? <Spinner /> : 'Save changes'}
            </button>
          </div>
        </div>
      )}
    </AppShell>
  )
}

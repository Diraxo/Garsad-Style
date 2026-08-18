import type { ReactNode } from 'react'

export function EmptyState({ title, hint, action }: { title: string; hint?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-4">
      <div className="h-12 w-12 rounded-xl2 bg-ink-100 flex items-center justify-center text-ink-400 mb-3">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
          <path d="M3 7h18M3 12h18M3 17h10" strokeLinecap="round" />
        </svg>
      </div>
      <p className="font-display font-semibold text-ink-800">{title}</p>
      {hint && <p className="text-sm text-ink-500 mt-1 max-w-xs">{hint}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export function Spinner({ className = '' }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} width="18" height="18" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" opacity="0.2" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}

export function PageLoading({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center py-24 text-ink-400 gap-2 text-sm">
      <Spinner /> {label}
    </div>
  )
}

export function StatCard({
  label,
  value,
  sub,
  tone = 'default',
}: {
  label: string
  value: string
  sub?: string
  tone?: 'default' | 'warn' | 'crit' | 'ok'
}) {
  const toneCls = {
    default: 'text-ink-900',
    ok: 'text-ok-700',
    warn: 'text-warn-700',
    crit: 'text-crit-700',
  }[tone]
  return (
    <div className="card p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">{label}</p>
      <p className={`font-display text-2xl font-bold mt-1.5 ${toneCls}`}>{value}</p>
      {sub && <p className="text-xs text-ink-400 mt-1">{sub}</p>}
    </div>
  )
}

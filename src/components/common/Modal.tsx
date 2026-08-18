import type { ReactNode } from 'react'

export function Modal({
  open,
  title,
  onClose,
  children,
  wide = false,
}: {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
  wide?: boolean
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center bg-ink-900/40 p-0 sm:p-4 overflow-y-auto">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`animate-modal-in bg-white w-full ${wide ? 'sm:max-w-2xl' : 'sm:max-w-lg'} sm:rounded-xl2 sm:my-8 min-h-screen sm:min-h-0 sm:shadow-pop`}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-ink-100 sticky top-0 bg-white sm:rounded-t-xl2 z-10">
          <h2 className="font-display font-semibold text-ink-900">{title}</h2>
          <button onClick={onClose} aria-label="Close" className="btn-ghost !px-2">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}

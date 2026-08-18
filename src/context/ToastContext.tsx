import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'

export type ToastKind = 'success' | 'error' | 'info'
interface Toast {
  id: number
  message: string
  kind: ToastKind
}

interface ToastContextValue {
  show: (message: string, kind?: ToastKind) => void
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined)
let counter = 0

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const show = useCallback((message: string, kind: ToastKind = 'success') => {
    const id = ++counter
    setToasts((prev) => [...prev, { id, message, kind }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 3200)
  }, [])

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 w-[calc(100%-2rem)] max-w-sm">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={`animate-toast-in card px-4 py-3 flex items-start gap-2.5 text-sm font-medium shadow-pop ${
              t.kind === 'success' ? 'text-ok-700' : t.kind === 'error' ? 'text-crit-700' : 'text-ink-700'
            }`}
          >
            <span
              className={`mt-0.5 inline-block h-2 w-2 shrink-0 rounded-full ${
                t.kind === 'success' ? 'bg-ok-600' : t.kind === 'error' ? 'bg-crit-600' : 'bg-brand-500'
              }`}
            />
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}

import { useState, type ReactNode } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

const adminNav = [
  { to: '/dashboard', label: 'Dashboard', icon: 'grid' },
  { to: '/products', label: 'Products', icon: 'box' },
  { to: '/inventory', label: 'Inventory', icon: 'layers' },
  { to: '/sales', label: 'Sales', icon: 'receipt' },
  { to: '/categories', label: 'Categories', icon: 'tag' },
  { to: '/payment-methods', label: 'Payment Methods', icon: 'card' },
  { to: '/sellers', label: 'Sellers', icon: 'users' },
  { to: '/settings', label: 'Settings', icon: 'gear' },
]

const sellerNav = [
  { to: '/seller', label: 'Find Products', icon: 'search' },
  { to: '/seller/sales', label: 'My Sales', icon: 'receipt' },
]

function Icon({ name, className = '' }: { name: string; className?: string }) {
  const paths: Record<string, ReactNode> = {
    grid: <path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z" />,
    box: <path d="M21 8l-9-5-9 5 9 5 9-5zM3 8v8l9 5 9-5V8M12 13v8" />,
    layers: <path d="M12 3l9 5-9 5-9-5 9-5zM3 13l9 5 9-5" />,
    receipt: <path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3zM9 8h6M9 12h6" />,
    tag: <path d="M20.6 12.6L12 21l-9-9V4h8l9.6 8.6zM7 8h.01" />,
    card: <path d="M2 7h20v10H2V7zM2 11h20" />,
    users: <path d="M17 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />,
    gear: <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1 1.55V21a2 2 0 1 1-4 0v-.09A1.7 1.7 0 0 0 9 19.4a1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.55-1H3a2 2 0 1 1 0-4h.09A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-1.55V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1 1.55 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.4 9a1.7 1.7 0 0 0 1.55 1H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.51 1z" />,
    search: <path d="M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.35-4.35" />,
    menu: <path d="M4 7h16M4 12h16M4 17h16" />,
    close: <path d="M18 6L6 18M6 6l12 12" />,
    logout: <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />,
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={className}>
      {paths[name]}
    </svg>
  )
}

export function AppShell({ children, title }: { children: ReactNode; title: string }) {
  const { user, logout } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)
  const navigate = useNavigate()
  const nav = user?.role === 'admin' ? adminNav : sellerNav

  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  const NavItems = (
    <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto">
      {nav.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === '/seller' || item.to === '/dashboard'}
          onClick={() => setMobileOpen(false)}
          className={({ isActive }) =>
            `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
              isActive ? 'bg-brand-50 text-brand-700' : 'text-ink-600 hover:bg-ink-100 hover:text-ink-900'
            }`
          }
        >
          {({ isActive }) => (
            <>
              <Icon name={item.icon} className={`h-[18px] w-[18px] shrink-0 ${isActive ? 'text-brand-600' : 'text-ink-400'}`} />
              {item.label}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  )

  return (
    <div className="min-h-screen flex bg-ink-50">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:flex-col w-64 border-r border-ink-100 bg-white shrink-0">
        <Brand />
        {NavItems}
        <UserFooter user={user} onLogout={handleLogout} />
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-ink-900/40" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-72 bg-white flex flex-col animate-modal-in">
            <div className="flex items-center justify-between px-4 pt-4">
              <Brand compact />
              <button className="btn-ghost !px-2" onClick={() => setMobileOpen(false)} aria-label="Close menu">
                <Icon name="close" className="h-5 w-5" />
              </button>
            </div>
            {NavItems}
            <UserFooter user={user} onLogout={handleLogout} />
          </aside>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-ink-100 px-4 md:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <button className="md:hidden btn-ghost !px-2" onClick={() => setMobileOpen(true)} aria-label="Open menu">
              <Icon name="menu" className="h-5 w-5" />
            </button>
            <h1 className="font-display text-lg md:text-xl font-semibold text-ink-900 truncate">{title}</h1>
          </div>
          <div className="flex items-center gap-3">
            <span className={`hidden sm:inline-flex tag ${user?.role === 'admin' ? 'bg-brand-100 text-brand-700' : 'bg-ink-100 text-ink-600'}`}>
              {user?.role === 'admin' ? 'Owner' : 'Seller'}
            </span>
            <div className="h-9 w-9 rounded-full bg-brand-600 text-white flex items-center justify-center font-display text-sm font-semibold">
              {user?.name?.[0] ?? '?'}
            </div>
          </div>
        </header>
        <main className="flex-1 p-4 md:p-6 max-w-[1400px] w-full mx-auto">{children}</main>
      </div>
    </div>
  )
}

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`flex items-center gap-2.5 px-4 ${compact ? 'py-4' : 'h-16'}`}>
      <div className="h-9 w-9 rounded-[10px] bg-brand-600 text-white flex items-center justify-center font-display font-bold text-base shadow-sm">
        G
      </div>
      <span className="font-display font-bold text-lg text-ink-900 tracking-tight">Garsad</span>
    </div>
  )
}

function UserFooter({ user, onLogout }: { user: { name: string; email: string } | null; onLogout: () => void }) {
  return (
    <div className="border-t border-ink-100 p-3">
      <div className="flex items-center gap-2.5 px-2 py-2">
        <div className="h-8 w-8 rounded-full bg-ink-100 text-ink-700 flex items-center justify-center font-display text-xs font-semibold shrink-0">
          {user?.name?.[0] ?? '?'}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-ink-800 truncate">{user?.name}</p>
          <p className="text-xs text-ink-400 truncate">{user?.email}</p>
        </div>
      </div>
      <button onClick={onLogout} className="btn-ghost w-full justify-start mt-1 !text-ink-500">
        <Icon name="logout" className="h-4 w-4" /> Log out
      </button>
    </div>
  )
}

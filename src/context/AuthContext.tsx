import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { User } from '../types'
import { authService } from '../services/authService'

interface AuthContextValue {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true

    authService.getSession().then((u) => {
      if (active) {
        setUser(u)
        setLoading(false)
      }
    })

    // Keeps state in sync with token refresh, expiry, or a logout in another tab.
    const unsubscribe = authService.onChange((u) => {
      if (active) setUser(u)
    })

    return () => {
      active = false
      unsubscribe()
    }
  }, [])

  async function login(email: string, password: string) {
    const result = await authService.login(email, password)
    if (result.ok && result.user) setUser(result.user)
    return { ok: result.ok, error: result.error }
  }

  async function logout() {
    await authService.logout()
    setUser(null)
  }

  return <AuthContext.Provider value={{ user, loading, login, logout }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

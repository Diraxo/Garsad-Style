import { useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Spinner } from '../components/common/Basics'

export default function Login() {
  const { user, loading, login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [remember, setRemember] = useState(true)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Once login() succeeds, AuthContext's user updates and this component
  // re-renders — the redirect below fires with the real role from the
  // profiles table, not a guess based on the email string.
  if (!loading && user) {
    return <Navigate to={user.role === 'admin' ? '/dashboard' : '/seller'} replace />
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    if (!email || !password) {
      setError('Enter your email and password.')
      return
    }
    setSubmitting(true)
    const result = await login(email, password)
    setSubmitting(false)
    if (!result.ok) {
      setError(result.error ?? 'Could not sign in.')
    }
  }

  return (
    <div className="min-h-screen bg-ink-50 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-7">
          <div className="h-12 w-12 rounded-xl2 bg-brand-600 text-white flex items-center justify-center font-display font-bold text-xl shadow-pop">
            G
          </div>
          <h1 className="font-display text-2xl font-bold text-ink-900 mt-3">Garsad</h1>
          <p className="text-sm text-ink-500 mt-0.5">Shop management, signed in</p>
        </div>

        <form onSubmit={handleSubmit} className="card p-6" noValidate>
          <div className="mb-4">
            <label htmlFor="email" className="label">Email</label>
            <input
              id="email"
              type="email"
              autoComplete="username"
              className="input"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="mb-2">
            <label htmlFor="password" className="label">Password</label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                className="input pr-16"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-brand-600 hover:text-brand-700 px-1.5 py-1"
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          <label className="flex items-center gap-2 mt-3 text-sm text-ink-600 select-none">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="rounded border-ink-300 text-brand-600 focus:ring-brand-300"
            />
            Remember me
          </label>

          {error && (
            <div role="alert" className="mt-4 rounded-lg bg-crit-100 text-crit-700 text-sm px-3 py-2.5">
              {error}
            </div>
          )}

          <button type="submit" className="btn-primary w-full mt-5" disabled={submitting}>
            {submitting ? <Spinner /> : 'Log in'}
          </button>
        </form>
      </div>
    </div>
  )
}

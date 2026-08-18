import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Unauthorized() {
  const { user } = useAuth()
  const home = user?.role === 'admin' ? '/dashboard' : '/seller'
  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-ink-50">
      <div className="card p-8 max-w-sm text-center">
        <div className="h-12 w-12 rounded-xl2 bg-crit-100 text-crit-700 flex items-center justify-center mx-auto font-display font-bold text-lg">
          !
        </div>
        <h1 className="font-display text-xl font-bold text-ink-900 mt-4">You don't have access to this page</h1>
        <p className="text-sm text-ink-500 mt-2">This area is restricted to a different role. Head back to your workspace.</p>
        <Link to={home} className="btn-primary w-full mt-5">Back to my workspace</Link>
      </div>
    </div>
  )
}
